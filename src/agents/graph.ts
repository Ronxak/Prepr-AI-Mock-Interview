import { StateGraph, START, END } from "@langchain/langgraph";
import { TurnAnnotation } from "@/agents/state";
import { memoryNode } from "@/agents/nodes/memory.node";
import { evaluatorNode } from "@/agents/nodes/evaluator.node";
import { plannerNode } from "@/agents/nodes/planner.node";
import { interviewerNode } from "@/agents/nodes/interviewer.node";
import { chatText } from "@/lib/llm/groq";
import { INTERVIEWER_SYSTEM } from "@/agents/prompts";
import { formatResume } from "@/agents/context";
import { INTERVIEW_TRACKS } from "@/types/interview";
import type {
  InterviewStateData,
  TurnResult,
  TopicState,
  InterviewTrack,
} from "@/types/interview";
import type { ResumeAnalysis } from "@/types/resume";

/**
 * The interview engine graph:
 *
 *   START → memory → evaluator → planner → interviewer → END
 *
 * The interviewer runs LAST and only after evaluation + planning — this is what
 * guarantees the engine "reasons before it speaks". The planner's decision (held
 * in state) drives what the interviewer does, so the state machine branches by
 * data, not by graph topology.
 */
const engine = new StateGraph(TurnAnnotation)
  .addNode("memory", memoryNode)
  .addNode("evaluator", evaluatorNode)
  .addNode("planner", plannerNode)
  .addNode("interviewer", interviewerNode)
  .addEdge(START, "memory")
  .addEdge("memory", "evaluator")
  .addEdge("evaluator", "planner")
  .addEdge("planner", "interviewer")
  .addEdge("interviewer", END)
  .compile();

export async function runInterviewTurn(input: {
  data: InterviewStateData;
  answer: string;
  retrievedResume?: string[];
}): Promise<TurnResult> {
  const data: InterviewStateData = {
    ...input.data,
    retrievedResume: input.retrievedResume ?? [],
  };
  const result = await engine.invoke({
    data,
    answer: input.answer,
    evaluation: null,
    plan: null,
    question: "",
    ended: false,
  });
  return {
    data: result.data,
    evaluation: result.evaluation!,
    plan: result.plan!,
    question: result.question,
    ended: result.ended,
  };
}

/** Build a fresh interview state. Starts on Projects if a resume exists. */
export function createInitialInterviewState(params: {
  interviewId: string;
  resume: ResumeAnalysis | null;
  track?: InterviewTrack;
  difficulty?: number;
  maxQuestions?: number;
}): InterviewStateData {
  const trackKey = params.track || "SOFTWARE_ENGINEER";
  const trackDef = INTERVIEW_TRACKS[trackKey] ?? INTERVIEW_TRACKS.SOFTWARE_ENGINEER;
  const topics: TopicState[] = trackDef.topics.map((t) => ({
    topic: t,
    status: "pending",
    questionsAsked: 0,
    scores: [],
  }));

  // With a resume, open on Projects to leverage it; otherwise open on the
  // track's first technical topic (topics[1]) — never a phantom topic that
  // isn't in this track (e.g. "JavaScript" for a Data/SRE interview).
  const firstTopic =
    params.resume && params.resume.projects.length > 0
      ? "Projects"
      : (trackDef.topics[1] ?? trackDef.topics[0]);
  const first = topics.find((t) => t.topic === firstTopic);
  if (first) first.status = "active";

  return {
    interviewId: params.interviewId,
    difficulty: params.difficulty ?? 3,
    currentTopic: firstTopic,
    topics,
    scores: { technical: [], communication: [], confidence: [], problemSolving: [] },
    strongAreas: [],
    weakAreas: [],
    resume: params.resume,
    history: [],
    askedQuestions: [],
    facts: [],
    questionCount: 0,
    maxQuestions: params.maxQuestions ?? 10,
    startedAt: Date.now(),
    lastQuestion: "",
    retrievedResume: [],
  };
}

function cleanUtterance(text: string): string {
  return text
    .trim()
    .replace(/^interviewer\s*:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

function defaultOpening(data: InterviewStateData): string {
  const name = data.resume?.fullName?.split(" ")[0];
  return `${name ? `Hi ${name}, ` : "Hi there — "}thanks for joining today. To warm up, tell me about a project you're proud of and what your role was in it.`;
}

/** The Interviewer opens the session (greeting + first question). */
export async function generateOpeningQuestion(
  data: InterviewStateData,
): Promise<{ question: string; data: InterviewStateData }> {
  const next = structuredClone(data);
  const resumeBrief = formatResume(next.resume);

  const user = [
    resumeBrief
      ? `Candidate resume brief:\n${resumeBrief}\n`
      : "No resume was provided.\n",
    `You are OPENING the interview. Greet the candidate warmly (use their first name if known), set a relaxed tone in one sentence, then ask your FIRST question on "${next.currentTopic}".`,
    resumeBrief
      ? "If it feels natural, anchor the first question in one of their real projects."
      : "Invite them to briefly introduce a project or their experience to warm up.",
    "Keep it to 2–3 spoken sentences. No preamble, no quotes, no role label.",
  ].join("\n");

  let raw = "";
  try {
    raw = await chatText(
      [
        { role: "system", content: INTERVIEWER_SYSTEM },
        { role: "user", content: user },
      ],
      { speed: "quality", temperature: 0.7, maxTokens: 200 },
    );
  } catch (err) {
    console.error("[opening] failed, using fallback:", err);
  }

  const question = cleanUtterance(raw) || defaultOpening(next);
  next.history.push({ role: "interviewer", content: question, topic: next.currentTopic });
  next.lastQuestion = question;
  next.askedQuestions.push(question);
  next.questionCount += 1;
  const topic = next.topics.find((t) => t.topic === next.currentTopic);
  if (topic) topic.questionsAsked += 1;

  return { question, data: next };
}
