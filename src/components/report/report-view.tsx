import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  BookOpen,
  Clock,
  Calendar,
  ExternalLink,
  Quote,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRadar } from "@/components/report/score-radar";
import {
  scoreColorClass,
  scoreBgClass,
  scoreLabel,
  scoreToPercent,
} from "@/utils/score";
import { formatDate, formatDuration } from "@/utils/format";
import type { FullReport } from "@/types/report";
import { ReportActions } from "./report-actions";

function DimensionBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${scoreColorClass(score)}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <Progress
        value={scoreToPercent(score)}
        indicatorClassName={scoreBgClass(score)}
        className="mt-1.5"
      />
    </div>
  );
}

export function ReportView({ report, isShared = false }: { report: FullReport; isShared?: boolean }) {
  const dimensions = [
    { label: "Technical", score: report.technicalScore },
    { label: "Communication", score: report.communicationScore },
    { label: "Confidence", score: report.confidenceScore },
    { label: "Problem Solving", score: report.problemSolvingScore },
    { label: "Behavior", score: report.behaviorScore },
  ];

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        {!isShared ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">
              <ArrowLeft className="size-4" /> Back to history
            </Link>
          </Button>
        ) : (
          <div /> // Placeholder for flex spacing
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" /> {formatDate(report.startedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> {formatDuration(report.durationSec)}
          </span>
          {!isShared && (
            <ReportActions interviewId={report.interviewId} initialToken={report.shareToken} />
          )}
        </div>
      </div>

      {/* Hero */}
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="relative grid size-24 shrink-0 place-items-center rounded-full border-4 border-primary/25">
              <span className={`text-3xl font-bold ${scoreColorClass(report.overallScore)}`}>
                {report.overallScore.toFixed(1)}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall score</p>
              <p className="text-xl font-semibold">
                {scoreLabel(report.overallScore)}
              </p>
              <Badge variant="secondary" className="mt-1">
                {report.trackLabel}
              </Badge>
            </div>
          </div>
          <p className="flex-1 text-pretty leading-relaxed text-muted-foreground">
            {report.summary}
          </p>
        </CardContent>
      </Card>

      {/* Radar + bars */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar data={report.evidence.map((e) => ({ dimension: e.dimension, score: e.score }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dimensions.map((d) => (
              <DimensionBar key={d.label} {...d} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="print:block">
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 print:block">
          <div className="grid gap-6 md:grid-cols-2 print:break-inside-avoid">
            <ListCard
              title="Strengths"
              icon={<CheckCircle2 className="size-4 text-success" />}
              items={report.strengths}
              empty="No standout strengths captured."
            />
            <ListCard
              title="Areas to improve"
              icon={<AlertCircle className="size-4 text-warning" />}
              items={report.weaknesses}
              empty="No major gaps captured."
            />
          </div>

          {report.recommendations.length > 0 && (
            <ListCard
              title="Recommendations"
              icon={<Lightbulb className="size-4 text-primary" />}
              items={report.recommendations}
              empty=""
            />
          )}

          {report.topicBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="size-4" /> Topic breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {report.topicBreakdown.map((t) => (
                  <div key={t.topic}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.topic}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.questionsAsked} question{t.questionsAsked === 1 ? "" : "s"} ·{" "}
                        <span className={scoreColorClass(t.score)}>
                          {t.score.toFixed(1)}
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={scoreToPercent(t.score)}
                      indicatorClassName={scoreBgClass(t.score)}
                      className="mt-1.5"
                    />
                    {t.evidence.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                        {t.evidence.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.learningResources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="size-4" /> Learning resources
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {report.learningResources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {r.title}
                      <ExternalLink className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.why}</p>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {report.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {report.timeline.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-primary" />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ev.at}
                        </span>
                        <span className="text-sm font-medium">{ev.event}</span>
                      </div>
                      {ev.detail && (
                        <p className="text-xs text-muted-foreground">{ev.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence" className="space-y-4 print:block print:mt-8">
          <h2 className="hidden print:block text-xl font-bold">Evidence</h2>
          <p className="text-sm text-muted-foreground">
            Every score is backed by what you actually said.
          </p>
          {report.evidence.map((e) => (
            <Card key={e.dimension}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{e.dimension}</CardTitle>
                <span className={`text-lg font-semibold ${scoreColorClass(e.score)}`}>
                  {e.score.toFixed(1)}
                </span>
              </CardHeader>
              <CardContent>
                {e.quotes.length > 0 ? (
                  <ul className="space-y-2">
                    {e.quotes.map((q, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No specific quotes captured for this dimension.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Transcript */}
        <TabsContent value="transcript" className="print:block print:mt-8">
          <h2 className="hidden print:block text-xl font-bold mb-4">Transcript</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {report.transcript
                .filter((t) => t.role !== "SYSTEM")
                .map((t) => (
                  <div
                    key={t.index}
                    className={t.role === "CANDIDATE" ? "flex justify-end" : "flex"}
                  >
                    <div
                      className={
                        t.role === "CANDIDATE"
                          ? "max-w-[80%] rounded-xl rounded-tr-sm bg-secondary px-4 py-2.5 text-sm"
                          : "max-w-[80%] rounded-xl rounded-tl-sm bg-primary/10 px-4 py-2.5 text-sm"
                      }
                    >
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {t.role === "CANDIDATE" ? "You" : "Interviewer"}
                      </p>
                      {t.content}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
