import { Prisma, type TopicStatus as DbTopicStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import {
  runInterviewTurn,
  createInitialInterviewState,
  generateOpeningQuestion,
} from "@/agents/graph";
import { average } from "@/agents/context";
import {
  getResumeAnalysisForUser,
  semanticResumeSearch,
} from "@/services/resume.service";
import { generateReport } from "@/services/report.service";
import type { InterviewStateData, TopicState, TopicStatus, InterviewTrack } from "@/types/interview";

const STATUS_MAP: Record<TopicStatus, DbTopicStatus> = {
  pending: "PENDING",
  active: "ACTIVE",
  covered: "COVERED",
  skipped: "SKIPPED",
};

export interface StartResult {
  interviewId: string;
  question: string;
  topic: string;
}

export interface SubmitResult {
  question: string;
  ended: boolean;
  topic: string;
  difficulty: number;
  questionCount: number;
  maxQuestions: number;
}

export interface InterviewTurnView {
  index: number;
  role: "INTERVIEWER" | "CANDIDATE" | "SYSTEM";
  content: string;
  topic: string | null;
}

export interface InterviewView {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  currentTopic: string;
  difficulty: number;
  questionCount: number;
  maxQuestions: number;
  startedAt: string;
  resumeUsed: boolean;
  lastQuestion: string;
  turns: InterviewTurnView[];
}

function topicProgressRows(interviewId: string, topics: TopicState[]) {
  return topics.map((t) => ({
    interviewId,
    topic: t.topic,
    status: STATUS_MAP[t.status],
    questionsAsked: t.questionsAsked,
    avgScore: t.scores.length ? average(t.scores) : null,
    strong: t.scores.length > 0 && average(t.scores) >= 7.5,
  }));
}

/** Create an interview, generate the opening question, persist the first turn. */
export async function startInterview(
  userId: string,
  opts: { resumeId?: string | null; type?: InterviewTrack; difficultyPreset?: number },
): Promise<StartResult> {
  let resumeId: string | null = null;
  let resume = null;
  if (opts.resumeId) {
    resume = await getResumeAnalysisForUser(opts.resumeId, userId);
    if (resume) resumeId = opts.resumeId;
  }

  const initial = createInitialInterviewState({ 
    interviewId: "pending", 
    resume, 
    track: opts.type, 
    difficulty: opts.difficultyPreset 
  });

  const interview = await prisma.interview.create({
    data: {
      userId,
      resumeId,
      type: opts.type || "SOFTWARE_ENGINEER",
      status: "IN_PROGRESS",
      difficulty: initial.difficulty,
      state: initial as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  initial.interviewId = interview.id;
  const { question, data } = await generateOpeningQuestion(initial);

  await prisma.$transaction(async (tx) => {
    await tx.conversationTurn.create({
      data: {
        interviewId: interview.id,
        index: 0,
        role: "INTERVIEWER",
        content: question,
        topic: data.currentTopic,
      },
    });
    await tx.interview.update({
      where: { id: interview.id },
      data: { state: data as unknown as Prisma.InputJsonValue },
    });
    await tx.topicProgress.createMany({
      data: topicProgressRows(interview.id, data.topics),
    });
  });

  return { interviewId: interview.id, question, topic: data.currentTopic };
}

/** Run one full engine turn on a candidate answer and persist everything. */
export async function submitAnswer(
  interviewId: string,
  userId: string,
  transcript: string,
): Promise<SubmitResult> {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId },
    select: { id: true, status: true, resumeId: true, state: true },
  });
  if (!interview) throw new ApiError(404, "Interview not found.", "NOT_FOUND");
  if (interview.status !== "IN_PROGRESS") {
    throw new ApiError(409, "This interview has already ended.", "INTERVIEW_ENDED");
  }

  const state = interview.state as unknown as InterviewStateData;
  const answer = (transcript ?? "").trim();

  const retrieved = interview.resumeId
    ? await semanticResumeSearch(
        interview.resumeId,
        answer || state.currentTopic,
        3,
      )
    : [];

  const startedAt = Date.now();
  const result = await runInterviewTurn({
    data: state,
    answer,
    retrievedResume: retrieved,
  });
  const latencyMs = Date.now() - startedAt;

  const priorTurns = await prisma.conversationTurn.count({
    where: { interviewId },
  });

  await prisma.$transaction(async (tx) => {
    const candidateTurn = await tx.conversationTurn.create({
      data: {
        interviewId,
        index: priorTurns,
        role: "CANDIDATE",
        content: answer || "(no answer)",
        topic: state.currentTopic,
      },
      select: { id: true },
    });

    await tx.evaluation.create({
      data: {
        interviewId,
        turnId: candidateTurn.id,
        topic: state.currentTopic,
        correctness: result.evaluation.correctness,
        depth: result.evaluation.depth,
        confidence: result.evaluation.confidence,
        communication: result.evaluation.communication,
        technical: result.evaluation.technical,
        strengths: result.evaluation.strengths,
        weaknesses: result.evaluation.weaknesses,
        raw: result.evaluation as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.conversationTurn.create({
      data: {
        interviewId,
        index: priorTurns + 1,
        role: "INTERVIEWER",
        content: result.question,
        topic: result.data.currentTopic,
        latencyMs,
      },
    });

    await tx.interview.update({
      where: { id: interviewId },
      data: {
        state: result.data as unknown as Prisma.InputJsonValue,
        difficulty: result.data.difficulty,
      },
    });

    for (const row of topicProgressRows(interviewId, result.data.topics)) {
      await tx.topicProgress.upsert({
        where: { interviewId_topic: { interviewId, topic: row.topic } },
        create: row,
        update: {
          status: row.status,
          questionsAsked: row.questionsAsked,
          avgScore: row.avgScore,
          strong: row.strong,
        },
      });
    }
  });

  if (result.ended) {
    await finalizeInterview(interviewId).catch((err) =>
      console.error("[interview] finalize failed:", err),
    );
  }

  return {
    question: result.question,
    ended: result.ended,
    topic: result.data.currentTopic,
    difficulty: result.data.difficulty,
    questionCount: result.data.questionCount,
    maxQuestions: result.data.maxQuestions,
  };
}

/** Mark an interview complete and generate its report (idempotent). */
export async function finalizeInterview(interviewId: string): Promise<void> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { startedAt: true, status: true },
  });
  if (!interview) return;

  if (interview.status === "IN_PROGRESS") {
    const durationSec = Math.round(
      (Date.now() - interview.startedAt.getTime()) / 1000,
    );
    await prisma.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED", endedAt: new Date(), durationSec },
    });
  }

  await generateReport(interviewId);
}

/** User-initiated end (from the "End interview" button). */
export async function endInterview(
  interviewId: string,
  userId: string,
): Promise<{ interviewId: string }> {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId },
    select: { id: true },
  });
  if (!interview) throw new ApiError(404, "Interview not found.", "NOT_FOUND");

  await finalizeInterview(interviewId);
  return { interviewId };
}

export async function getInterviewForUser(
  interviewId: string,
  userId: string,
): Promise<InterviewView> {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId },
    include: { turns: { orderBy: { index: "asc" } } },
  });
  if (!interview) throw new ApiError(404, "Interview not found.", "NOT_FOUND");

  const state = interview.state as unknown as InterviewStateData;
  return {
    id: interview.id,
    status: interview.status,
    currentTopic: state.currentTopic,
    difficulty: interview.difficulty,
    questionCount: state.questionCount,
    maxQuestions: state.maxQuestions,
    startedAt: interview.startedAt.toISOString(),
    resumeUsed: !!interview.resumeId,
    lastQuestion: state.lastQuestion,
    turns: interview.turns.map((t) => ({
      index: t.index,
      role: t.role,
      content: t.content,
      topic: t.topic,
    })),
  };
}
