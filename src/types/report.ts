export interface ScoreEvidence {
  dimension: string; // e.g. "Communication"
  score: number; // 0–10
  quotes: string[]; // evidence supporting the score
}

export interface TopicBreakdown {
  topic: string;
  score: number; // 0–10
  questionsAsked: number;
  evidence: string[];
}

export interface LearningResource {
  title: string;
  url: string;
  why: string;
}

export interface TimelineEvent {
  at: string; // mm:ss
  event: string; // e.g. "Topic → System Design"
  detail: string;
}

/** The full report payload — persisted as InterviewReport JSON columns. */
export interface InterviewReportData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  problemSolvingScore: number;
  behaviorScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  learningResources: LearningResource[];
  topicBreakdown: TopicBreakdown[];
  timeline: TimelineEvent[];
  evidence: ScoreEvidence[];
  summary: string;
}

export interface ReportTranscriptTurn {
  index: number;
  role: "INTERVIEWER" | "CANDIDATE" | "SYSTEM";
  content: string;
  topic: string | null;
}

export interface FullReport extends InterviewReportData {
  interviewId: string;
  trackLabel: string;
  startedAt: string;
  durationSec: number | null;
  transcript: ReportTranscriptTurn[];
  shareToken?: string | null;
}
