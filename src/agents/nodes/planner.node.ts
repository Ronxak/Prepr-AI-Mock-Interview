import { chatJSON } from "@/lib/llm/groq";
import { plannerSchema } from "@/agents/schemas";
import { PLANNER_SYSTEM } from "@/agents/prompts";
import {
  formatTopicBoard,
  pendingTopics,
  clamp,
  average,
} from "@/agents/context";
import type { TurnState } from "@/agents/state";
import type {
  PlannerDecision,
  EvaluationResult,
  InterviewStateData,
} from "@/types/interview";

/** Deterministic backup plan when the LLM planner is unavailable. */
function heuristicPlan(
  evaluation: EvaluationResult,
  pending: string[],
  currentTopicQ: number,
): PlannerDecision {
  const answerScore = average([
    evaluation.correctness,
    evaluation.depth,
    evaluation.technical,
  ]);
  if (currentTopicQ >= 3 && pending.length) {
    return { action: "move_topic", targetTopic: pending[0]!, difficultyDelta: 0, reason: "Topic covered." };
  }
  if (answerScore >= 7) {
    return { action: "challenge", targetTopic: null, difficultyDelta: 1, reason: "Strong answer — push deeper." };
  }
  if (answerScore <= 4) {
    return { action: "continue", targetTopic: null, difficultyDelta: -1, reason: "Struggling — ease off." };
  }
  return { action: "follow_up", targetTopic: null, difficultyDelta: 0, reason: "Reasonable — drill in." };
}

/**
 * Planner agent. Reasons over state + the latest evaluation to choose the next
 * action, then applies difficulty adaptation and topic transitions. Guardrails
 * override the LLM to keep coverage broad and end the interview on budget.
 */
export async function plannerNode(
  state: TurnState,
): Promise<Partial<TurnState>> {
  const data: InterviewStateData = structuredClone(state.data);
  const evaluation = state.evaluation!;
  const pending = pendingTopics(data);
  const currentTopicQ =
    data.topics.find((t) => t.topic === data.currentTopic)?.questionsAsked ?? 0;

  const user = [
    `Question budget: ${data.questionCount}/${data.maxQuestions} asked.`,
    `Current difficulty (1–5): ${data.difficulty}.`,
    `Questions asked on current topic "${data.currentTopic}": ${currentTopicQ}.`,
    `Pending (not-yet-covered) topics: ${pending.length ? pending.join(", ") : "none"}.`,
    `\nTopic board:\n${formatTopicBoard(data)}`,
    `\nLatest answer evaluation — correctness ${evaluation.correctness}, depth ${evaluation.depth}, confidence ${evaluation.confidence}, communication ${evaluation.communication}, technical ${evaluation.technical}. Summary: ${evaluation.summary}`,
    `\nChoose the next action as json.`,
  ].join("\n");

  let plan: PlannerDecision;
  try {
    plan = await chatJSON(
      [
        { role: "system", content: PLANNER_SYSTEM },
        { role: "user", content: user },
      ],
      plannerSchema,
      { speed: "fast", temperature: 0.3, maxTokens: 260 },
    );
  } catch (err) {
    console.error("[planner] failed, using heuristic:", err);
    plan = heuristicPlan(evaluation, pending, currentTopicQ);
  }

  // ── Guardrails (deterministic overrides) ──────────────────────────────────
  if (data.questionCount >= data.maxQuestions) {
    plan = { ...plan, action: "end" };
  } else if (currentTopicQ >= 3 && plan.action !== "end" && pending.length) {
    // Don't linger on one topic.
    plan = { ...plan, action: "move_topic", targetTopic: pending[0]! };
  }

  if (plan.action === "move_topic") {
    const target =
      plan.targetTopic && pending.includes(plan.targetTopic)
        ? plan.targetTopic
        : (pending[0] ?? null);
    if (target) {
      plan = { ...plan, targetTopic: target };
    } else {
      // Nothing left to move to.
      plan = { ...plan, action: currentTopicQ >= 2 ? "end" : "continue", targetTopic: null };
    }
  }

  // ── Apply adaptation + transitions to state ───────────────────────────────
  data.difficulty = clamp(data.difficulty + plan.difficultyDelta, 1, 5);

  if (plan.action === "move_topic" && plan.targetTopic) {
    const current = data.topics.find((t) => t.topic === data.currentTopic);
    if (current && current.status !== "covered") {
      current.status = current.scores.length ? "covered" : "skipped";
    }
    data.currentTopic = plan.targetTopic;
    const next = data.topics.find((t) => t.topic === plan.targetTopic);
    if (next) next.status = "active";
  }

  return { plan, data };
}
