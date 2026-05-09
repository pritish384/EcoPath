"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

function BarTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow">
      <p className="font-medium text-zinc-900">{payload[0]?.payload?.name}</p>
      <p className="text-zinc-600">{payload[0]?.value}%</p>
    </div>
  );
}

type BarDatum = { name: string; value: number };

export function PathwayBars({ data }: { data?: BarDatum[] }) {
  if (!data || !data.length) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-500">
        Add pathway data to see probabilities.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<BarTooltip />} />
          <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
