"use client";

import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  TooltipProps,
} from "recharts";

const defaultData = {
  nodes: [
    { name: "Product" },
    { name: "Collection" },
    { name: "Formal Recycling" },
    { name: "Informal Recovery" },
    { name: "Resale/Refurb" },
    { name: "Landfill" },
    { name: "Material Loss" },
  ],
  links: [
    { source: 0, target: 1, value: 100 },
    { source: 1, target: 2, value: 38 },
    { source: 1, target: 3, value: 22 },
    { source: 1, target: 4, value: 18 },
    { source: 1, target: 5, value: 22 },
    { source: 2, target: 6, value: 6 },
    { source: 3, target: 6, value: 10 },
    { source: 4, target: 6, value: 5 },
    { source: 5, target: 6, value: 22 },
  ],
};

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

type SankeyData = typeof defaultData;

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
