"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export function ScoreRadar({
  data,
}: {
  data: { dimension: string; score: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarRadiusAxis
          domain={[0, 10]}
          angle={90}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickCount={3}
        />
        <Radar
          dataKey="score"
          stroke="var(--primary)"
          fill="var(--primary)"
          fillOpacity={0.28}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
