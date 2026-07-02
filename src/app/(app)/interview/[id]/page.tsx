import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getInterviewForUser } from "@/services/interview.service";
import { LiveInterview } from "@/components/interview/live-interview";
import type { LiveTurn } from "@/hooks/useVoiceInterview";

export const metadata: Metadata = { title: "Live interview" };

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const interview = await getInterviewForUser(id, user!.id).catch(() => null);

  if (!interview) redirect("/dashboard");
  if (interview.status === "COMPLETED") redirect(`/report/${id}`);

  const initialTurns: LiveTurn[] = interview.turns
    .filter((t) => t.role === "INTERVIEWER" || t.role === "CANDIDATE")
    .map((t) => ({
      role: t.role === "INTERVIEWER" ? "interviewer" : "candidate",
      content: t.content,
    }));

  const firstQuestion =
    interview.lastQuestion ||
    [...interview.turns].reverse().find((t) => t.role === "INTERVIEWER")
      ?.content ||
    "Tell me a bit about yourself and a project you're proud of.";

  return (
    <LiveInterview
      interviewId={interview.id}
      firstQuestion={firstQuestion}
      initialTopic={interview.currentTopic}
      initialTurns={initialTurns}
      startedAtMs={Date.parse(interview.startedAt)}
      alreadyEnded={interview.status !== "IN_PROGRESS"}
    />
  );
}
