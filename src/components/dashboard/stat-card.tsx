import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  suffix,
  sublabel,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  sublabel?: string;
  icon: LucideIcon;
  valueClassName?: string;
}) {
  const display = value === null || value === undefined ? "—" : value;
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-3xl font-semibold tracking-tight", valueClassName)}>
          {display}
        </span>
        {display !== "—" && suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </Card>
  );
}
