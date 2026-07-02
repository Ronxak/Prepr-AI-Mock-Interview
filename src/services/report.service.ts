import { Prisma, type InterviewReport } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { chatJSON, type ChatMessage } from "@/lib/llm/groq";
import { hasGroq } from "@/lib/env";
import { formatClock } from "@/utils/format";
import { INTERVIEW_TRACKS } from "@/types/interview";
import type {
  InterviewReportData,
  FullReport,
  ScoreEvidence,
  TopicBreakdown,
  TimelineEvent,
  LearningResource,
} from "@/types/report";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

const reportNarrativeSchema = z.object({
  summary: z.string().catch("").default(""),
  strengths: z.array(z.string()).catch([]).default([]),
  weaknesses: z.array(z.string()).catch([]).default([]),
  recommendations: z.array(z.string()).catch([]).default([]),
  learningResources: z
    .array(
      z.object({
        title: z.string().catch("").default(""),
        url: z.string().catch("").default(""),
        why: z.string().catch("").default(""),
      }),
    )
    .catch([])
    .default([]),
  evidence: z
    .array(
      z.object({
        dimension: z.string().catch("").default(""),
        quotes: z.array(z.string()).catch([]).default([]),
      }),
    )
    .catch([])
    .default([]),
});

const DIMENSIONS = [
  "Technical",
  "Communication",
  "Confidence",
  "Problem Solving",
  "Behavior",
] as const;

const FALLBACK_RESOURCES: LearningResource[] = [
  { title: "MDN Web Docs — JavaScript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", why: "Authoritative reference for core language behavior." },
  { title: "roadmap.sh — Backend", url: "https://roadmap.sh/backend", why: "Structured path to fill backend/system-design gaps." },
  { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", why: "Practice scaling, caching, and trade-off reasoning." },
];

const REPORT_SYSTEM = `You are a senior engineering interviewer writing a candid, constructive post-interview report for a Software Engineer candidate. You are given the full transcript and pre-computed scores (0–10) for each dimension — do NOT change the numbers, just explain them.

Write json with:
- "summary": 3–4 sentence overall assessment, honest and specific.
- "strengths": 3–5 concrete strengths, grounded in what the candidate actually said.
- "weaknesses": 3–5 concrete, specific areas to improve.
- "recommendations": 3–5 actionable next steps.
- "learningResources": 3–5 REAL, well-known resources as {title, url, why}, targeting the weak areas. Use canonical URLs (MDN, official docs, roadmap.sh, reputable books/courses). Never invent URLs.
- "evidence": for EACH dimension (Technical, Communication, Confidence, Problem Solving, Behavior) an object {dimension, quotes:[]} with 1–3 short quotes or paraphrases FROM THE TRANSCRIPT that justify that dimension's score.

Base everything ONLY on the transcript. Never invent achievements the candidate did not mention. Respond with json.`;

/** Generate (or return existing) report for an interview. Idempotent. */
export async function generateReport(
  interviewId: string,
): Promise<InterviewReportData> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      turns: { orderBy: { index: "asc" } },
      evaluations: true,
      topicProgress: true,
      report: true,
    },
  });
  if (!interview) throw new ApiError(404, "Interview not found.", "NOT_FOUND");

  if (interview.report) {
    return reportRowToData(interview.report);
  }

  const evals = interview.evaluations;

  // ── Deterministic dimension scores from stored evaluations ────────────────
  const technicalScore = round1(avg(evals.map((e) => e.technical)));
  const communicationScore = round1(avg(evals.map((e) => e.communication)));
  const confidenceScore = round1(avg(evals.map((e) => e.confidence)));
  const problemSolvingScore = round1(
    avg(evals.map((e) => (e.correctness + e.depth) / 2)),
  );
  const behavioralEvals = evals.filter((e) => e.topic === "Behavioral");
  const behaviorScore = round1(
    behavioralEvals.length
      ? avg(behavioralEvals.map((e) => (e.communication + e.confidence) / 2))
      : communicationScore,
  );
  const overallScore = round1(
    0.35 * technicalScore +
      0.2 * problemSolvingScore +
      0.2 * communicationScore +
      0.15 * confidenceScore +
      0.1 * behaviorScore,
  );

  const scoreByDimension: Record<(typeof DIMENSIONS)[number], number> = {
    Technical: technicalScore,
    Communication: communicationScore,
    Confidence: confidenceScore,
    "Problem Solving": problemSolvingScore,
    Behavior: behaviorScore,
  };

  // ── Topic breakdown + timeline (deterministic) ────────────────────────────
  const topicBreakdown: TopicBreakdown[] = interview.topicProgress
    .filter((t) => t.questionsAsked > 0)
    .map((t) => ({
      topic: t.topic,
      score: round1(t.avgScore ?? 0),
      questionsAsked: t.questionsAsked,
      evidence: evals
        .filter((e) => e.topic === t.topic)
        .flatMap((e) => e.strengths.concat(e.weaknesses))
        .slice(0, 3),
    }));

  const timeline: TimelineEvent[] = buildTimeline(interview.turns, interview.startedAt);

  // ── LLM narrative (grounded) with fallback ────────────────────────────────
  const transcript = interview.turns
    .map(
      (t) =>
        `${t.role === "INTERVIEWER" ? "Interviewer" : t.role === "CANDIDATE" ? "Candidate" : "System"}: ${t.content}`,
    )
    .join("\n");

  const aggregatedStrengths = [...new Set(evals.flatMap((e) => e.strengths))].slice(0, 12);
  const aggregatedWeaknesses = [...new Set(evals.flatMap((e) => e.weaknesses))].slice(0, 12);

  let narrative: z.infer<typeof reportNarrativeSchema> = {
    summary: "",
    strengths: [],
    weaknesses: [],
    recommendations: [],
    learningResources: [],
    evidence: [],
  };

  if (hasGroq() && evals.length > 0) {
    const user = [
      `Computed scores (0–10): Technical ${technicalScore}, Communication ${communicationScore}, Confidence ${confidenceScore}, Problem Solving ${problemSolvingScore}, Behavior ${behaviorScore}. Overall ${overallScore}.`,
      `\nObserved strengths: ${aggregatedStrengths.join("; ") || "n/a"}`,
      `Observed weaknesses: ${aggregatedWeaknesses.join("; ") || "n/a"}`,
      `\nFull transcript:\n${transcript.slice(0, 9000)}`,
      `\nWrite the report as json.`,
    ].join("\n");
    const messages: ChatMessage[] = [
      { role: "system", content: REPORT_SYSTEM },
      { role: "user", content: user },
    ];
    try {
      narrative = await chatJSON(messages, reportNarrativeSchema, {
        speed: "quality",
        temperature: 0.4,
        maxTokens: 1600,
      });
    } catch (err) {
      console.error("[report] narrative generation failed, using fallback:", err);
    }
  }

  // Evidence: prefer LLM quotes, fall back to observed strengths per dimension.
  const evidence: ScoreEvidence[] = DIMENSIONS.map((dim) => {
    const fromLlm = narrative.evidence.find(
      (e) => e.dimension.toLowerCase() === dim.toLowerCase(),
    );
    const quotes =
      fromLlm?.quotes.filter(Boolean).slice(0, 3) ??
      aggregatedStrengths.slice(0, 2);
    return { dimension: dim, score: scoreByDimension[dim], quotes };
  });

  const data: InterviewReportData = {
    overallScore,
    technicalScore,
    communicationScore,
    confidenceScore,
    problemSolvingScore,
    behaviorScore,
    strengths: narrative.strengths.length ? narrative.strengths : aggregatedStrengths.slice(0, 5),
    weaknesses: narrative.weaknesses.length ? narrative.weaknesses : aggregatedWeaknesses.slice(0, 5),
    recommendations: narrative.recommendations,
    learningResources: narrative.learningResources.length
      ? narrative.learningResources
      : FALLBACK_RESOURCES,
    topicBreakdown,
    timeline,
    evidence,
    summary:
      narrative.summary ||
      `Completed a ${INTERVIEW_TRACKS[interview.type]?.label ?? "Software Engineer"} mock interview across ${topicBreakdown.length} topic${topicBreakdown.length === 1 ? "" : "s"} with an overall score of ${overallScore}/10.`,
  };

  await prisma.interviewReport.upsert({
    where: { interviewId },
    create: { interviewId, ...toReportRow(data) },
    update: toReportRow(data),
  });

  return data;
}

function toReportRow(data: InterviewReportData) {
  return {
    overallScore: data.overallScore,
    technicalScore: data.technicalScore,
    communicationScore: data.communicationScore,
    confidenceScore: data.confidenceScore,
    problemSolvingScore: data.problemSolvingScore,
    behaviorScore: data.behaviorScore,
    strengths: data.strengths as unknown as Prisma.InputJsonValue,
    weaknesses: data.weaknesses as unknown as Prisma.InputJsonValue,
    recommendations: data.recommendations as unknown as Prisma.InputJsonValue,
    learningResources: data.learningResources as unknown as Prisma.InputJsonValue,
    topicBreakdown: data.topicBreakdown as unknown as Prisma.InputJsonValue,
    timeline: data.timeline as unknown as Prisma.InputJsonValue,
    evidence: data.evidence as unknown as Prisma.InputJsonValue,
    summary: data.summary,
  };
}

function reportRowToData(row: InterviewReport): InterviewReportData {
  return {
    overallScore: row.overallScore,
    technicalScore: row.technicalScore,
    communicationScore: row.communicationScore,
    confidenceScore: row.confidenceScore,
    problemSolvingScore: row.problemSolvingScore,
    behaviorScore: row.behaviorScore,
    strengths: row.strengths as unknown as string[],
    weaknesses: row.weaknesses as unknown as string[],
    recommendations: row.recommendations as unknown as string[],
    learningResources: row.learningResources as unknown as LearningResource[],
    topicBreakdown: row.topicBreakdown as unknown as TopicBreakdown[],
    timeline: row.timeline as unknown as TimelineEvent[],
    evidence: row.evidence as unknown as ScoreEvidence[],
    summary: row.summary,
  };
}

function buildTimeline(
  turns: { role: string; content: string; topic: string | null; createdAt: Date }[],
  startedAt: Date,
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { at: "00:00", event: "Interview started", detail: "" },
  ];
  let lastTopic: string | null = null;
  for (const turn of turns) {
    if (turn.role === "INTERVIEWER" && turn.topic && turn.topic !== lastTopic) {
      const at = formatClock((turn.createdAt.getTime() - startedAt.getTime()) / 1000);
      events.push({ at, event: `Topic → ${turn.topic}`, detail: "" });
      lastTopic = turn.topic;
    }
  }
  return events;
}

/** Load a full report + transcript for the report page (verifies ownership). */
export async function getFullReport(
  interviewId: string,
  userId: string,
): Promise<FullReport> {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId },
    include: {
      report: true,
      turns: { orderBy: { index: "asc" } },
    },
  });
  if (!interview) throw new ApiError(404, "Interview not found.", "NOT_FOUND");

  const reportData = interview.report
    ? reportRowToData(interview.report)
    : await generateReport(interviewId);

  return {
    ...reportData,
    interviewId: interview.id,
    trackLabel: INTERVIEW_TRACKS[interview.type]?.label ?? "Software Engineer",
    startedAt: interview.startedAt.toISOString(),
    durationSec: interview.durationSec,
    shareToken: interview.report?.shareToken,
    transcript: interview.turns.map((t) => ({
      index: t.index,
      role: t.role,
      content: t.content,
      topic: t.topic,
    })),
  };
}

/** Toggles sharing for a report. Returns the new shareToken or null. */
export async function toggleShare(
  interviewId: string,
  userId: string,
  enable: boolean,
): Promise<string | null> {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, userId },
    select: { id: true, report: { select: { id: true, shareToken: true } } },
  });
  if (!interview || !interview.report) throw new ApiError(404, "Report not found.");

  let token = enable ? interview.report.shareToken || crypto.randomUUID() : null;
  
  await prisma.interviewReport.update({
    where: { id: interview.report.id },
    data: { shareToken: token },
  });

  return token;
}

/** Fetches a report by its public share token (no auth required). */
export async function getSharedReport(token: string): Promise<FullReport> {
  const report = await prisma.interviewReport.findUnique({
    where: { shareToken: token },
    include: {
      interview: {
        include: { turns: { orderBy: { index: "asc" } } },
      },
    },
  });
  
  if (!report) throw new ApiError(404, "Shared report not found.");

  return {
    ...reportRowToData(report),
    interviewId: report.interview.id,
    trackLabel: INTERVIEW_TRACKS[report.interview.type]?.label ?? "Software Engineer",
    startedAt: report.interview.startedAt.toISOString(),
    durationSec: report.interview.durationSec,
    shareToken: report.shareToken,
    transcript: report.interview.turns.map((t) => ({
      index: t.index,
      role: t.role,
      content: t.content,
      topic: t.topic,
    })),
  };
}
