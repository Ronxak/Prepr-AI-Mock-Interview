import Link from "next/link";
import type { Metadata } from "next";
import {
  Gauge,
  Code2,
  MessageSquare,
  CheckCircle2,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboard } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreTrend } from "@/components/dashboard/score-trend";
import { RecentInterviews } from "@/components/dashboard/recent-interviews";
import { scoreColorClass } from "@/utils/score";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const stats = await getDashboard(user!.id);
  const firstName = user!.name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Greeting + primary CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {stats.totalInterviews === 0
              ? "Ready for your first mock interview?"
              : "Here's how your practice is trending."}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/interview/new">
            <Sparkles className="size-4" /> Start interview
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average score"
          value={stats.averageScore}
          suffix="/ 10"
          icon={Gauge}
          valueClassName={
            stats.averageScore !== null ? scoreColorClass(stats.averageScore) : ""
          }
          sublabel={`${stats.completedInterviews} completed`}
        />
        <StatCard
          label="Technical"
          value={stats.technicalScore}
          suffix="/ 10"
          icon={Code2}
        />
        <StatCard
          label="Communication"
          value={stats.communicationScore}
          suffix="/ 10"
          icon={MessageSquare}
        />
        <StatCard
          label="Confidence"
          value={stats.confidenceScore}
          suffix="/ 10"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent interviews */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent interviews</CardTitle>
            {stats.totalInterviews > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/history">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <RecentInterviews items={stats.recentInterviews} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Score trend */}
          <Card>
            <CardHeader>
              <CardTitle>Score trend</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.scoreTrend.length >= 2 ? (
                <ScoreTrend data={stats.scoreTrend} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Complete two interviews to see your trend.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Resume status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" /> Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.resumeUploaded ? (
                <div className="flex items-center justify-between">
                  <Badge variant="success">Uploaded</Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/resume">Manage</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Upload a resume so the interviewer can reference your real
                    projects.
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/resume">Upload resume</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
