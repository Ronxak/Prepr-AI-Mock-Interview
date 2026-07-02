"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/utils/format";

/** Live mm:ss timer anchored to the interview's real start time. */
export function InterviewTimer({
  startedAt,
  running,
}: {
  startedAt: number;
  running: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsed = Math.max(0, (now - startedAt) / 1000);
  return <span className="font-mono tabular-nums">{formatClock(elapsed)}</span>;
}
