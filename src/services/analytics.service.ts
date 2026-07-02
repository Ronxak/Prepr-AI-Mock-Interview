import { prisma } from "@/lib/db";
import type {
  DashboardStats,
  AnalyticsSummary,
  RecentInterview,
} from "@/types/dashboard";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Aggregate a user's interview history into dashboard-ready stats. */
export async function getDashboard(userId: string): Promise<DashboardStats> {
  const [interviews, resumeCount] = await Promise.all([
    prisma.interview.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        report: {
          select: {
            overallScore: true,
            technicalScore: true,
            communicationScore: true,
            confidenceScore: true,
          },
        },
        topicProgress: { select: { topic: true } },
      },
    }),
    prisma.resume.count({ where: { userId } }),
  ]);

  const reports = interviews
    .map((i) => i.report)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const completed = interviews.filter((i) => i.status === "COMPLETED");

  // Score trend: completed interviews oldest→newest.
  const scoreTrend = [...interviews]
    .filter((i) => i.report)
    .reverse()
    .map((i, idx) => ({
      label: `#${idx + 1}`,
      score: round1(i.report!.overallScore),
    }));

  return {
    totalInterviews: interviews.length,
    completedInterviews: completed.length,
    averageScore: average(reports.map((r) => r.overallScore)),
    technicalScore: average(reports.map((r) => r.technicalScore)),
    communicationScore: average(reports.map((r) => r.communicationScore)),
    confidenceScore: average(reports.map((r) => r.confidenceScore)),
    resumeUploaded: resumeCount > 0,
    scoreTrend,
    recentInterviews: interviews.slice(0, 6).map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      startedAt: i.startedAt.toISOString(),
      durationSec: i.durationSec,
      overallScore: i.report ? round1(i.report.overallScore) : null,
      topics: i.topicProgress.map((t) => t.topic),
    })),
  };
}

const DIMENSION_KEYS = [
  { key: "technicalScore", label: "Technical" },
  { key: "communicationScore", label: "Communication" },
  { key: "confidenceScore", label: "Confidence" },
  { key: "problemSolvingScore", label: "Problem Solving" },
  { key: "behaviorScore", label: "Behavior" },
] as const;

/** Full history + progress analytics for the History/Analytics page. */
export async function getAnalytics(userId: string): Promise<AnalyticsSummary> {
  const interviews = await prisma.interview.findMany({
    where: { userId },
    orderBy: { startedAt: "asc" },
    include: {
      report: true,
      topicProgress: { select: { topic: true } },
    },
  });

  const items: RecentInterview[] = [...interviews]
    .reverse()
    .map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      startedAt: i.startedAt.toISOString(),
      durationSec: i.durationSec,
      overallScore: i.report ? round1(i.report.overallScore) : null,
      topics: i.topicProgress.map((t) => t.topic),
    }));

  const withReports = interviews.filter(
    (i): i is typeof i & { report: NonNullable<typeof i.report> } =>
      i.report !== null,
  );

  const radar = DIMENSION_KEYS.map((d) => ({
    dimension: d.label,
    score: average(withReports.map((i) => i.report[d.key])) ?? 0,
  }));

  const progression = withReports.map((i, idx) => ({
    label: `#${idx + 1}`,
    overall: round1(i.report.overallScore),
    technical: round1(i.report.technicalScore),
    communication: round1(i.report.communicationScore),
  }));

  // Most improved: largest positive delta (last − first) across dimensions.
  let mostImproved: AnalyticsSummary["mostImproved"] = null;
  if (withReports.length >= 2) {
    const first = withReports[0]!.report;
    const last = withReports[withReports.length - 1]!.report;
    for (const d of DIMENSION_KEYS) {
      const delta = round1(last[d.key] - first[d.key]);
      if (!mostImproved || delta > mostImproved.delta) {
        mostImproved = { skill: d.label, delta };
      }
    }
    if (mostImproved && mostImproved.delta <= 0) mostImproved = null;
  }

  // Weakest skill: lowest average dimension.
  let weakestSkill: AnalyticsSummary["weakestSkill"] = null;
  if (withReports.length > 0) {
    for (const d of radar) {
      if (!weakestSkill || d.score < weakestSkill.score) {
        weakestSkill = { skill: d.dimension, score: d.score };
      }
    }
  }

  return {
    items,
    radar,
    progression,
    mostImproved,
    weakestSkill,
    totalPracticeSec: interviews.reduce((sum, i) => sum + (i.durationSec ?? 0), 0),
    completedCount: interviews.filter((i) => i.status === "COMPLETED").length,
  };
}
