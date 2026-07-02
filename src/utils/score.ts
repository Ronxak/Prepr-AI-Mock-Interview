/** Shared score → color/label mapping (scores are on a 0–10 scale). */

export function scoreColorClass(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-warning";
  return "text-destructive";
}

export function scoreBgClass(score: number): string {
  if (score >= 8) return "bg-success";
  if (score >= 6) return "bg-warning";
  return "bg-destructive";
}

export function scoreLabel(score: number): string {
  if (score >= 8.5) return "Excellent";
  if (score >= 7) return "Strong";
  if (score >= 5.5) return "Fair";
  if (score >= 4) return "Developing";
  return "Needs work";
}

/** Percentage (0–100) for progress bars, given a 0–10 score. */
export function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, score * 10));
}
