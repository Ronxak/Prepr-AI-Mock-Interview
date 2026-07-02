export interface RecentInterview {
  id: string;
  type: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  startedAt: string;
  durationSec: number | null;
  overallScore: number | null;
  topics: string[];
}

export interface DashboardStats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number | null;
  technicalScore: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  resumeUploaded: boolean;
  scoreTrend: { label: string; score: number }[];
  recentInterviews: RecentInterview[];
}

export interface AnalyticsSummary {
  items: RecentInterview[];
  radar: { dimension: string; score: number }[];
  progression: {
    label: string;
    overall: number;
    technical: number;
    communication: number;
  }[];
  mostImproved: { skill: string; delta: number } | null;
  weakestSkill: { skill: string; score: number } | null;
  totalPracticeSec: number;
  completedCount: number;
}
