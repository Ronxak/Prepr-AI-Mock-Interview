"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Sparkles, FileText, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { INTERVIEW_TRACKS, type InterviewTrack } from "@/types/interview";
import type { StartResult } from "@/services/interview.service";

export function StartInterviewPanel({
  resumes,
}: {
  resumes: { id: string; fileName: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [selectedResumeId, setSelectedResumeId] = React.useState<string>(
    resumes.length > 0 && resumes[0] ? resumes[0].id : "none"
  );
  const [selectedTrack, setSelectedTrack] = React.useState<InterviewTrack>("SOFTWARE_ENGINEER");
  const [difficulty, setDifficulty] = React.useState<string>("3");

  async function start() {
    setLoading(true);
    try {
      const res = await apiFetch<StartResult>("/api/interview/start", {
        method: "POST",
        body: JSON.stringify({
          resumeId: selectedResumeId !== "none" ? selectedResumeId : null,
          type: selectedTrack,
          difficultyPreset: parseInt(difficulty, 10),
        }),
      });
      router.push(`/interview/${res.interviewId}`);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't start the interview. Try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Start a mock interview
        </h2>
        <p className="mt-1 text-muted-foreground">
          A live, voice-based Software Engineer interview that adapts to your
          answers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-card/40 p-4 border border-border/70 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-medium">Interview Track</span>
          </div>
          <Select value={selectedTrack} onValueChange={(v) => setSelectedTrack(v as InterviewTrack)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERVIEW_TRACKS).map(([key, track]) => (
                <SelectItem key={key} value={key}>
                  {track.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg bg-card/40 p-4 border border-border/70 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-medium">Difficulty Level</span>
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Easy (Intern/Junior)</SelectItem>
              <SelectItem value="3">Medium (Mid-Level)</SelectItem>
              <SelectItem value="5">Hard (Senior)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Topics Covered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {INTERVIEW_TRACKS[selectedTrack].topics.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resume option */}
      <div className="rounded-lg bg-card/40 p-4 border border-border/70">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Use a resume</p>
            <p className="text-xs text-muted-foreground">
              Tailor questions to your experience.
            </p>
          </div>
        </div>
        <div className="mt-4">
          {resumes.length > 0 ? (
            <Select
              value={selectedResumeId}
              onValueChange={setSelectedResumeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a resume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No resume (general questions)</SelectItem>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/resume">Upload a resume</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button size="lg" className="w-full sm:w-auto" onClick={start} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Preparing your interview…
            </>
          ) : (
            <>
              <Mic className="size-4" /> Start interview
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          You&apos;ll need to allow microphone access on the next screen.
        </p>
      </div>
    </div>
  );
}
