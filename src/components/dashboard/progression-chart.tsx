"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export function ProgressionChart({
  data,
}: {
  data: {
    label: string;
    overall: number;
    technical: number;
    communication: number;
  }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <XAxis
          dataKey="label"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 10]}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          ticks={[0, 5, 10]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        <Line type="monotone" dataKey="overall" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="technical" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="communication" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
