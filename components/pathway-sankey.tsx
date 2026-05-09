"use client";

import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  TooltipProps,
} from "recharts";

function SankeyTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const name = payload[0]?.name ?? "";
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow">
      <p className="font-medium text-zinc-900">{name}</p>
      {typeof value === "number" && (
        <p className="text-zinc-600">Flow: {value}%</p>
      )}
    </div>
  );
}

type SankeyNode = { name: string };
type SankeyLink = { source: number; target: number; value: number };
type SankeyData = { nodes: SankeyNode[]; links: SankeyLink[] };

export function PathwaySankey({ data }: { data?: SankeyData }) {
  if (!data || !data.nodes.length) {
    return (
      <div className="flex h-[280px] w-full items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-500">
        Add pathway data to see the flow chart.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodePadding={22}
          linkCurvature={0.5}
          node={{ fill: "#059669" }}
          link={{ stroke: "#94a3b8" }}
        >
          <Tooltip content={<SankeyTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
