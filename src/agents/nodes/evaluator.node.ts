import { chatJSON } from "@/lib/llm/groq";
import { evaluationSchema } from "@/agents/schemas";
import { EVALUATOR_SYSTEM } from "@/agents/prompts";
import {
  formatResume,
  formatHistory,
  mergeUnique,
  average,
} from "@/agents/context";
import type { TurnState } from "@/agents/state";
import type { EvaluationResult } from "@/types/interview";

function fallbackEvaluation(answer: string): EvaluationResult {
  const empty = answer.trim().length < 8;
  const base = empty ? 2 : 5;
  return {
    correctness: base,
    depth: base,
    confidence: base,
    communication: base,
    technical: base,
    strengths: [],
    weaknesses: empty ? ["No substantive answer was given."] : [],
    evidence: [],
    extractedFacts: [],
    summary: empty ? "No real answer provided." : "Answer recorded.",
  };
}

/**
 * Evaluator agent. Silently scores the candidate's latest answer and folds the
 * result into interview state (dimension scores, topic score, strong/weak areas,
 * remembered facts). Never produces interviewer-facing text.
 */
export async function evaluatorNode(
  state: TurnState,
): Promise<Partial<TurnState>> {
  const data = structuredClone(state.data);
  const resumeBrief = formatResume(data.resume);

  const user = [
    `Current topic: ${data.currentTopic}`,
    `Interviewer's question: ${data.lastQuestion}`,
    `Candidate's answer: ${state.answer.trim() || "(silence / no answer)"}`,
    resumeBrief ? `\nResume brief (to ground remembered facts):\n${resumeBrief}` : "",
    `\nRecent conversation:\n${formatHistory(data.history, 6)}`,
    `\nReturn the evaluation as json.`,
  ].join("\n");

  let evaluation: EvaluationResult;
  try {
    evaluation = await chatJSON(
      [
        { role: "system", content: EVALUATOR_SYSTEM },
        { role: "user", content: user },
      ],
      evaluationSchema,
      { speed: "fast", temperature: 0.15, maxTokens: 700 },
    );
  } catch (err) {
    console.error("[evaluator] failed, using fallback:", err);
    evaluation = fallbackEvaluation(state.answer);
  }

  const overall = average([
    evaluation.correctness,
    evaluation.depth,
    evaluation.confidence,
    evaluation.communication,
    evaluation.technical,
  ]);

  data.scores.technical.push(evaluation.technical);
  data.scores.communication.push(evaluation.communication);
  data.scores.confidence.push(evaluation.confidence);
  data.scores.problemSolving.push(
    average([evaluation.correctness, evaluation.depth]),
  );

  const topic = data.topics.find((t) => t.topic === data.currentTopic);
  if (topic) topic.scores.push(overall);

  data.strongAreas = mergeUnique(data.strongAreas, evaluation.strengths, 10);
  data.weakAreas = mergeUnique(data.weakAreas, evaluation.weaknesses, 10);
  data.facts = mergeUnique(data.facts, evaluation.extractedFacts, 20);

  return { evaluation, data };
}
