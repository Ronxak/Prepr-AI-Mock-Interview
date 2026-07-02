import { chatText } from "@/lib/llm/groq";
import { INTERVIEWER_SYSTEM } from "@/agents/prompts";
import {
  formatResume,
  formatHistory,
  difficultyLabel,
} from "@/agents/context";
import type { TurnState } from "@/agents/state";
import type {
  PlannerAction,
  InterviewStateData,
} from "@/types/interview";

function buildInstruction(action: PlannerAction, topic: string): string {
  switch (action) {
    case "follow_up":
      return `Ask a pointed FOLLOW-UP that drills into something specific the candidate just said about ${topic}.`;
    case "challenge":
      return `CHALLENGE them: push back respectfully, raise the difficulty, or probe an edge case / trade-off on ${topic}.`;
    case "move_topic":
      return `Transition naturally to a NEW topic: ${topic}. Open it with a clear first question.`;
    case "continue":
    default:
      return `Ask a fresh question on ${topic} at the target difficulty.`;
  }
}

/** Strip model artifacts (role prefixes, wrapping quotes). */
function cleanUtterance(text: string): string {
  return text
    .trim()
    .replace(/^interviewer\s*:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

function fallbackQuestion(topic: string): string {
  return `Let's talk about ${topic}. Walk me through a recent example from your experience and the decisions you made.`;
}

function generateClosingPrompt(
  data: InterviewStateData,
  resumeBrief: string,
): { messages: { role: "system" | "user"; content: string }[] } {
  const user = [
    resumeBrief ? `Candidate: ${data.resume?.fullName ?? "the candidate"}.` : "",
    `\nConversation so far:\n${formatHistory(data.history, 6)}`,
    `\nThe interview is complete. Wrap up warmly in 1–2 spoken sentences: thank them for their time and let them know their detailed report is being prepared. Do NOT give any scores, grades, or feedback.`,
  ].join("\n");
  return {
    messages: [
      { role: "system", content: INTERVIEWER_SYSTEM },
      { role: "user", content: user },
    ],
  };
}

async function generateClosing(
  data: InterviewStateData,
  resumeBrief: string,
): Promise<string> {
  const { messages } = generateClosingPrompt(data, resumeBrief);
  try {
    const text = await chatText(messages, { speed: "quality", temperature: 0.6, maxTokens: 120 });
    return (
      cleanUtterance(text) ||
      "That's everything I wanted to cover — thanks so much for your time. I'll get your detailed report ready now."
    );
  } catch {
    return "That's everything I wanted to cover — thanks so much for your time. I'll get your detailed report ready now.";
  }
}

export function buildInterviewerPrompt(
  data: InterviewStateData,
  plan: PlannerAction,
  resumeBrief: string,
): { messages: { role: "system" | "user"; content: string }[] } {
  const retrieved = data.retrievedResume?.length
    ? `\nRelevant resume snippets (use only if pertinent):\n${data.retrievedResume.join("\n---\n")}`
    : "";

  const user = [
    resumeBrief
      ? `Candidate resume brief:\n${resumeBrief}${retrieved}\n`
      : "No resume was provided — do not reference or invent one.\n",
    `Remembered facts about the candidate: ${data.facts.length ? data.facts.join("; ") : "none yet"}`,
    `Questions already asked (never repeat these): ${
      data.askedQuestions.slice(-8).map((q) => `“${q}”`).join(" | ") || "none"
    }`,
    `\nRecent conversation:\n${formatHistory(data.history, 8)}`,
    `\nCurrent topic: ${data.currentTopic}. Target difficulty: ${difficultyLabel(data.difficulty)}.`,
    `\nYour task: ${buildInstruction(plan, data.currentTopic)}`,
    `Now speak your next line: an optional brief acknowledgement, then ONE question. No preamble, no quotes, no role label.`,
  ].join("\n");

  return {
    messages: [
      { role: "system", content: INTERVIEWER_SYSTEM },
      { role: "user", content: user },
    ],
  };
}

/**
 * Interviewer agent. Speaks the next line (or a closing) based on the planner's
 * decision. Never scores; only talks. Runs on the quality model and streams-ready
 * text. Updates history, asked-questions, and per-topic counters.
 */
export async function interviewerNode(
  state: TurnState,
): Promise<Partial<TurnState>> {
  const data = structuredClone(state.data);
  const plan = state.plan!;
  const resumeBrief = formatResume(data.resume);

  if (plan.action === "end") {
    const closing = await generateClosing(data, resumeBrief);
    data.history.push({ role: "interviewer", content: closing, topic: data.currentTopic });
    data.lastQuestion = closing;
    return { question: closing, ended: true, data };
  }

  const { messages } = buildInterviewerPrompt(data, plan.action, resumeBrief);

  let raw = "";
  try {
    raw = await chatText(messages, { speed: "quality", temperature: 0.75, maxTokens: 220 });
  } catch (err) {
    console.error("[interviewer] failed, using fallback:", err);
  }

  const question = cleanUtterance(raw) || fallbackQuestion(data.currentTopic);
  applyInterviewerUpdate(data, question);
  return { question, ended: false, data };
}

export function applyInterviewerUpdate(data: InterviewStateData, question: string) {
  data.history.push({ role: "interviewer", content: question, topic: data.currentTopic });
  data.lastQuestion = question;
  data.askedQuestions.push(question);
  data.questionCount += 1;

  const topic = data.topics.find((t) => t.topic === data.currentTopic);
  if (topic) {
    topic.questionsAsked += 1;
    if (topic.status === "pending") topic.status = "active";
  }
}
