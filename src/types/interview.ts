import type { ResumeAnalysis } from "@/types/resume";

export const INTERVIEW_TRACKS = {
  SOFTWARE_ENGINEER: {
    label: "Software Engineer",
    topics: ["Projects", "JavaScript", "React", "Node & Backend", "Databases", "System Design", "Problem Solving", "Behavioral"],
  },
  FRONTEND_ENGINEER: {
    label: "Frontend Engineer",
    topics: ["Projects", "JavaScript", "React", "CSS & Styling", "Web Performance", "Accessibility", "Problem Solving", "Behavioral"],
  },
  DATA_ENGINEER: {
    label: "Data Engineer",
    topics: ["Projects", "Python", "SQL & Databases", "Data Pipelines", "Big Data (Spark, Hadoop)", "Data Modeling", "Problem Solving", "Behavioral"],
  },
  SITE_RELIABILITY_ENGINEER: {
    label: "Site Reliability Engineer",
    topics: ["Projects", "Linux & OS", "Networking", "Cloud & Infrastructure", "CI/CD", "Monitoring & Observability", "Problem Solving", "Behavioral"],
  },
} as const;

export type InterviewTrack = keyof typeof INTERVIEW_TRACKS;

/** Legacy export for backward compatibility, defaults to Software Engineer */
export const INTERVIEW_TOPICS = INTERVIEW_TRACKS.SOFTWARE_ENGINEER.topics;

export type TopicStatus = "pending" | "active" | "covered" | "skipped";

export interface TopicState {
  topic: string;
  status: TopicStatus;
  questionsAsked: number;
  scores: number[]; // per-answer overall score on this topic (0–10)
}

/** Output of the Evaluator agent for a single candidate answer. */
export interface EvaluationResult {
  correctness: number; // 0–10
  depth: number;
  confidence: number;
  communication: number;
  technical: number;
  strengths: string[];
  weaknesses: string[];
  evidence: string[]; // direct quotes / paraphrases justifying the scores
  extractedFacts: string[]; // salient claims to remember (projects, tools…)
  summary: string; // one line
}

export type PlannerAction =
  | "continue"
  | "follow_up"
  | "challenge"
  | "move_topic"
  | "end";

/** Output of the Planner agent — what should happen next. */
export interface PlannerDecision {
  action: PlannerAction;
  targetTopic: string | null; // required when action === "move_topic"
  difficultyDelta: number; // -1 | 0 | +1
  reason: string;
}

export interface TurnMessage {
  role: "interviewer" | "candidate";
  content: string;
  topic?: string;
}

/**
 * The full live interview state. Persisted as Interview.state (JSON) and rebuilt
 * on every turn. This is the single source of truth the engine reasons over.
 */
export interface InterviewStateData {
  interviewId: string;
  difficulty: number; // 1–5, adapts in real time
  currentTopic: string;
  topics: TopicState[];
  scores: {
    technical: number[];
    communication: number[];
    confidence: number[];
    problemSolving: number[];
  };
  strongAreas: string[];
  weakAreas: string[];
  resume: ResumeAnalysis | null;
  history: TurnMessage[];
  askedQuestions: string[]; // to avoid repeats
  facts: string[]; // remembered candidate claims
  questionCount: number;
  maxQuestions: number;
  startedAt: number; // epoch ms
  lastQuestion: string; // the question the candidate is answering now
  retrievedResume: string[]; // pgvector-retrieved resume snippets for this turn
}

/** Result of running one engine turn. */
export interface TurnResult {
  data: InterviewStateData;
  evaluation: EvaluationResult;
  plan: PlannerDecision;
  question: string;
  ended: boolean;
}
