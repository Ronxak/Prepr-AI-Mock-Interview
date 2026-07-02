import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { semanticResumeSearch } from "@/services/resume.service";
import { finalizeInterview } from "@/services/interview.service";
import { memoryNode } from "@/agents/nodes/memory.node";
import { evaluatorNode } from "@/agents/nodes/evaluator.node";
import { plannerNode } from "@/agents/nodes/planner.node";
import { buildInterviewerPrompt, applyInterviewerUpdate } from "@/agents/nodes/interviewer.node";
import { formatResume } from "@/agents/context";
import { chatStream } from "@/lib/llm/groq";
import { synthesizeSpeechStream } from "@/lib/voice/cartesia-stream";
import type { InterviewStateData } from "@/types/interview";
import { hasCartesia } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  interviewId: z.string().min(1),
  transcript: z.string().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { interviewId, transcript } = bodySchema.parse(await req.json());
    
    // We only support streaming if Cartesia is configured.
    if (!hasCartesia()) {
      return NextResponse.json({ error: "Streaming not supported (Cartesia missing)" }, { status: 400 });
    }

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId: user.id },
      select: { id: true, status: true, resumeId: true, state: true },
    });
    if (!interview) throw new ApiError(404, "Interview not found.");
    if (interview.status !== "IN_PROGRESS") {
      throw new ApiError(409, "This interview has already ended.");
    }

    const answer = (transcript ?? "").trim();
    let state = interview.state as unknown as InterviewStateData;
    
    const retrievedResume = interview.resumeId
      ? await semanticResumeSearch(interview.resumeId, answer || state.currentTopic, 3)
      : [];
      
    // 1. Run evaluation pipeline up to planner
    const memRes = await memoryNode({ data: state, answer, evaluation: null, plan: null, question: "", ended: false });
    state = memRes.data as InterviewStateData;
    
    const evalRes = await evaluatorNode({ data: state, answer, evaluation: null, plan: null, question: "", ended: false });
    const evaluation = evalRes.evaluation!;
    
    const planRes = await plannerNode({ data: state, answer, evaluation, plan: null, question: "", ended: false });
    const plan = planRes.plan!;
    state = planRes.data as InterviewStateData;
    // Inject the pgvector-retrieved resume snippets so the interviewer can ground
    // its question in the candidate's real experience (parity with the non-streaming path).
    state.retrievedResume = retrievedResume;
    
    // 2. Start streaming LLM text
    const resumeBrief = formatResume(state.resume);
    let textStream: AsyncGenerator<string>;
    let isEnding = false;
    
    // Fall back to just returning the closing if ended
    if (plan.action === "end") {
      // For ending, we just use a static text or stream the closing
      // but to keep it simple, we won't stream the ending turn logic since it's short
      return NextResponse.json({ error: "Ending turn cannot be streamed" }, { status: 400 });
    } else {
      const { messages } = buildInterviewerPrompt(state, plan.action, resumeBrief);
      textStream = chatStream(messages, { speed: "quality", temperature: 0.75, maxTokens: 220 });
    }
    
    // Create a stream that interleaves text and audio chunks
    const encoder = new TextEncoder();
    
    // Interleave stream:
    // We send chunks in a simple binary format:
    // [Type: 1 byte] [Length: 4 bytes] [Data: Length bytes]
    // Type 0 = Text chunk, Type 1 = Audio chunk, Type 2 = End of text (contains full text JSON)
    
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        
        // We need an async iterator that copies textStream so we can capture fullText
        // while also passing it to Cartesia
        async function* teeTextStream() {
          for await (const chunk of textStream) {
            fullText += chunk;
            
            // Send text chunk to client
            const data = encoder.encode(chunk);
            const header = new Uint8Array(5);
            header[0] = 0; // Text
            new DataView(header.buffer).setUint32(1, data.length, false);
            controller.enqueue(header);
            controller.enqueue(data);
            
            yield chunk;
          }
        }

        try {
          // Process audio
          const audioStream = synthesizeSpeechStream(teeTextStream());
          for await (const audioChunk of audioStream) {
            const header = new Uint8Array(5);
            header[0] = 1; // Audio
            new DataView(header.buffer).setUint32(1, audioChunk.length, false);
            controller.enqueue(header);
            controller.enqueue(audioChunk);
          }
          
          // Audio and Text are done. We can now save to DB.
          fullText = fullText
            .trim()
            .replace(/^interviewer\s*:\s*/i, "")
            .replace(/^["'“”]+|["'“”]+$/g, "")
            .trim();
            
          applyInterviewerUpdate(state, fullText);
          
          // Wait for DB save
          const priorTurns = await prisma.conversationTurn.count({ where: { interviewId } });
          await prisma.$transaction(async (tx) => {
            const candidateTurn = await tx.conversationTurn.create({
              data: { interviewId, index: priorTurns, role: "CANDIDATE", content: answer || "(no answer)", topic: state.currentTopic },
              select: { id: true },
            });
            await tx.evaluation.create({
              data: {
                interviewId, turnId: candidateTurn.id, topic: state.currentTopic,
                correctness: evaluation.correctness, depth: evaluation.depth, confidence: evaluation.confidence,
                communication: evaluation.communication, technical: evaluation.technical,
                strengths: evaluation.strengths, weaknesses: evaluation.weaknesses,
                raw: evaluation as any,
              },
            });
            await tx.conversationTurn.create({
              data: { interviewId, index: priorTurns + 1, role: "INTERVIEWER", content: fullText, topic: state.currentTopic, latencyMs: 0 },
            });
            await tx.interview.update({
              where: { id: interviewId },
              data: { state: state as any, difficulty: state.difficulty },
            });
            for (const t of state.topics) {
              await tx.topicProgress.upsert({
                where: { interviewId_topic: { interviewId, topic: t.topic } },
                create: { interviewId, topic: t.topic, status: t.status === "pending" ? "PENDING" : t.status === "active" ? "ACTIVE" : t.status === "covered" ? "COVERED" : "SKIPPED", questionsAsked: t.questionsAsked, avgScore: t.scores.length ? t.scores.reduce((a,b)=>a+b,0)/t.scores.length : null, strong: t.scores.length > 0 && (t.scores.reduce((a,b)=>a+b,0)/t.scores.length) >= 7.5 },
                update: { status: t.status === "pending" ? "PENDING" : t.status === "active" ? "ACTIVE" : t.status === "covered" ? "COVERED" : "SKIPPED", questionsAsked: t.questionsAsked, avgScore: t.scores.length ? t.scores.reduce((a,b)=>a+b,0)/t.scores.length : null, strong: t.scores.length > 0 && (t.scores.reduce((a,b)=>a+b,0)/t.scores.length) >= 7.5 },
              });
            }
          });
          
          // Send final metadata chunk
          const metaJson = JSON.stringify({ question: fullText, ended: false, topic: state.currentTopic, difficulty: state.difficulty, questionCount: state.questionCount, maxQuestions: state.maxQuestions });
          const data = encoder.encode(metaJson);
          const header = new Uint8Array(5);
          header[0] = 2; // End meta
          new DataView(header.buffer).setUint32(1, data.length, false);
          controller.enqueue(header);
          controller.enqueue(data);
          
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });
    
    return new NextResponse(stream, {
      headers: { "Content-Type": "application/octet-stream" },
    });
    
  } catch (err) {
    return handleError(err);
  }
}
