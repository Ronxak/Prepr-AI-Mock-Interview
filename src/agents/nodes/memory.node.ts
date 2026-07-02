import type { TurnState } from "@/agents/state";

/**
 * Memory agent. Records the candidate's answer into the running history so the
 * downstream agents (and future turns) can reason over the full conversation.
 * Resume context and remembered facts already live on `data`; the evaluator adds
 * new facts after scoring.
 */
export async function memoryNode(state: TurnState): Promise<Partial<TurnState>> {
  const data = structuredClone(state.data);
  const answer = state.answer.trim() || "(no answer)";
  data.history.push({
    role: "candidate",
    content: answer,
    topic: data.currentTopic,
  });
  return { data };
}
