import { Annotation } from "@langchain/langgraph";
import type {
  InterviewStateData,
  EvaluationResult,
  PlannerDecision,
} from "@/types/interview";

/**
 * The LangGraph turn state. `data` is the persisted interview snapshot; the other
 * channels are the per-turn outputs the nodes produce as they flow
 * memory → evaluator → planner → interviewer.
 */
export const TurnAnnotation = Annotation.Root({
  data: Annotation<InterviewStateData>,
  answer: Annotation<string>,
  evaluation: Annotation<EvaluationResult | null>,
  plan: Annotation<PlannerDecision | null>,
  question: Annotation<string>,
  ended: Annotation<boolean>,
});

export type TurnState = typeof TurnAnnotation.State;
