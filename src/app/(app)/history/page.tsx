import Link from "next/link";
import type { Metadata } from "next";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreRadar } from "@/components/report/score-radar";
import { ProgressionChart } from "@/components/dashboard/progression-chart";
import { RecentInterviews } from "@/components/dashboard/recent-interviews";
import { formatDuration } from "@/utils/format";

export const metadata: Metadata = { title: "History & analytics" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const a = await getAnalytics(user!.id);

  if (a.items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/12 text-primary">
          <Sparkles className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No interviews yet</h2>
        <p className="mt-1 text-muted-foreground">
          Your history and progress analytics will appear here once you finish
          your first interview.
        </p>
        <Button asChild className="mt-6">
          <Link href="/interview/new">Start your first interview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          History &amp; analytics
        </h2>
        <p className="mt-1 text-muted-foreground">
          Track how your performance is trending across interviews.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed" value={a.completedCount} icon={Trophy} />
        <StatCard
          label="Practice time"
          value={formatDuration(a.totalPracticeSec)}
          icon={Clock}
        />
        <StatCard
          label="Most improved"
          value={a.mostImproved ? a.mostImproved.skill : "—"}
          sublabel={a.mostImproved ? `+${a.mostImproved.delta.toFixed(1)} pts` : "Needs 2+ interviews"}
          icon={TrendingUp}
          valueClassName="text-xl"
        />
        <StatCard
          label="Weakest skill"
          value={a.weakestSkill ? a.weakestSkill.skill : "—"}
          sublabel={a.weakestSkill ? `${a.weakestSkill.score.toFixed(1)} / 10` : undefined}
          icon={TrendingDown}
          valueClassName="text-xl"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill profile</CardTitle>
          </CardHeader>
          <CardContent>
            {a.radar.some((r) => r.score > 0) ? (
              <ScoreRadar data={a.radar} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Complete an interview to see your skill profile.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress over time</CardTitle>
          </CardHeader>
          <CardContent>
            {a.progression.length >= 2 ? (
              <ProgressionChart data={a.progression} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Complete two interviews to see your progression.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentInterviews items={a.items} />
        </CardContent>
      </Card>
    </div>
  );
}
