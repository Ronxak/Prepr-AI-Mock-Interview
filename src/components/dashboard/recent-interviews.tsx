import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration, relativeTime } from "@/utils/format";
import { scoreColorClass } from "@/utils/score";
import type { RecentInterview } from "@/types/dashboard";

const STATUS_VARIANT: Record<
  RecentInterview["status"],
  "success" | "warning" | "secondary"
> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  ABANDONED: "secondary",
};

export function RecentInterviews({ items }: { items: RecentInterview[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No interviews yet. Start your first one to see it here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((it) => {
        const href =
          it.status === "COMPLETED"
            ? `/report/${it.id}`
            : `/interview/${it.id}`;
        return (
          <li key={it.id}>
            <Link
              href={href}
              className="group flex items-center gap-4 py-3 transition-colors hover:bg-secondary/40 -mx-2 px-2 rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    Software Engineer
                  </span>
                  <Badge variant={STATUS_VARIANT[it.status]} className="capitalize">
                    {it.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{relativeTime(it.startedAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {formatDuration(it.durationSec)}
                  </span>
                  {it.topics.length > 0 && (
                    <span className="truncate">{it.topics.slice(0, 3).join(" · ")}</span>
                  )}
                </div>
              </div>
              {it.overallScore !== null && (
                <span
                  className={`text-lg font-semibold ${scoreColorClass(it.overallScore)}`}
                >
                  {it.overallScore.toFixed(1)}
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
