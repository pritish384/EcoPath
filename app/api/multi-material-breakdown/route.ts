import { NextResponse } from "next/server";

type OpenAIContentItem = { text?: string; output_text?: string; text?: { value?: string } };
type OpenAIOutputItem = { content?: OpenAIContentItem[] };
type OpenAIResponse = { output_text?: string; output?: OpenAIOutputItem[] };

type BreakdownRequest = {
  product: string;
  region?: string;
};

type RecoveryPotential = "Low" | "Medium" | "High" | "Very High";
type DisposalCategory =
  | "Recyclable"
  | "Specialized Recycling"
  | "Hazardous Waste"
  | "Reusable"
  | "Landfill"
  | "E-waste Recovery";

type BreakdownComponent = {
  name: string;
  materials: string[];
  estimatedMassShare: number;
  disposalCategory: DisposalCategory;
  recoveryPotential: RecoveryPotential;
  notes: string;
};

type BreakdownResponse = {
  productName: string;
  region: string;
  components: BreakdownComponent[];
  overallCircularityScore: number;
  riskFlags: string[];
};

const RECOVERY_POINTS: Record<RecoveryPotential, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
  "Very High": 90,
};

const fallbackByProduct: Array<{
  test: RegExp;
  components: BreakdownComponent[];
}> = [
  {
    test: /smartphone|phone|mobile/i,
    components: [
      {
        name: "Screen",
        materials: ["Glass", "Rare earth elements"],
        estimatedMassShare: 22,
        disposalCategory: "Specialized Recycling",
        recoveryPotential: "Medium",
        notes: "Needs specialist recovery for display materials.",
      },
      {
        name: "Battery",
        materials: ["Lithium-ion", "Cobalt", "Nickel"],
        estimatedMassShare: 18,
        disposalCategory: "Hazardous Waste",
        recoveryPotential: "High",
        notes: "Handle separately due to fire and toxicity risk.",
      },
      {
        name: "Casing",
        materials: ["Polycarbonate", "Aluminum"],
        estimatedMassShare: 25,
        disposalCategory: "Recyclable",
        recoveryPotential: "Low",
        notes: "Material often downcycled if mixed polymers are present.",
      },
      {
        name: "Circuit Board",
        materials: ["Gold", "Copper", "Lead", "FR4"],
        estimatedMassShare: 20,
        disposalCategory: "E-waste Recovery",
        recoveryPotential: "Very High",
        notes: "High-value metals recoverable in formal e-waste streams.",
      },
      {
        name: "Camera + Speaker Assembly",
        materials: ["Neodymium magnets", "Copper", "Plastics"],
        estimatedMassShare: 15,
        disposalCategory: "Specialized Recycling",
        recoveryPotential: "Medium",
        notes: "Small form factors reduce practical recovery efficiency.",
      },
    ],
  },
  {
    test: /laptop|notebook/i,
    components: [
      {
        name: "Battery pack",
        materials: ["Lithium-ion", "Cobalt", "Nickel"],
        estimatedMassShare: 17,
        disposalCategory: "Hazardous Waste",
        recoveryPotential: "High",
        notes: "Needs certified battery channel.",
      },
      {
        name: "Aluminum chassis",
        materials: ["Aluminum"],
        estimatedMassShare: 30,
        disposalCategory: "Recyclable",
        recoveryPotential: "High",
        notes: "High recycle value in clean streams.",
      },
      {
        name: "Motherboard",
        materials: ["Copper", "Gold", "Tin", "Lead"],
        estimatedMassShare: 22,
        disposalCategory: "E-waste Recovery",
        recoveryPotential: "Very High",
        notes: "Precious metal recovery is economically favorable.",
      },
      {
        name: "Display module",
        materials: ["Glass", "LCD/OLED layers"],
        estimatedMassShare: 21,
        disposalCategory: "Specialized Recycling",
        recoveryPotential: "Medium",
        notes: "Layered materials require specialized separation.",
      },
      {
        name: "Keyboard + plastics",
        materials: ["ABS", "Rubber", "Steel"],
        estimatedMassShare: 10,
        disposalCategory: "Recyclable",
        recoveryPotential: "Low",
        notes: "Mixed material complexity reduces yield.",
      },
    ],
  },
  {
    test: /water bottle|bottle/i,
    components: [
      {
        name: "Bottle body",
        materials: ["PET"],
        estimatedMassShare: 80,
        disposalCategory: "Recyclable",
        recoveryPotential: "High",
        notes: "Clear PET generally has strong market recovery.",
      },
      {
        name: "Cap",
        materials: ["HDPE"],
        estimatedMassShare: 10,
        disposalCategory: "Recyclable",
        recoveryPotential: "Medium",
        notes: "Often recovered if sorted properly.",
      },
      {
        name: "Label + adhesive",
        materials: ["Film plastic", "Glue"],
        estimatedMassShare: 10,
        disposalCategory: "Landfill",
        recoveryPotential: "Low",
        notes: "Adhesive contamination lowers practical recyclability.",
      },
    ],
  },
];

const defaultComponents = (product: string): BreakdownComponent[] => [
  {
    name: "Primary body",
    materials: ["Mixed material"],
    estimatedMassShare: 55,
    disposalCategory: "Recyclable",
    recoveryPotential: "Medium",
    notes: `Main structure for ${product}; material stream depends on local sorting quality.`,
  },
  {
    name: "Functional core",
    materials: ["Metals / composites"],
    estimatedMassShare: 30,
    disposalCategory: "Specialized Recycling",
    recoveryPotential: "High",
    notes: "Component may require disassembly before recovery.",
  },
  {
    name: "Accessories / residues",
    materials: ["Mixed plastics", "Adhesives"],
    estimatedMassShare: 15,
    disposalCategory: "Landfill",
    recoveryPotential: "Low",
    notes: "Low-value mixed residues are difficult to recover.",
  },
];

function normalizeShares(components: BreakdownComponent[]) {
  const total = components.reduce((sum, c) => sum + c.estimatedMassShare, 0);
  if (!total) return components;
  return components.map((c, index) => {
    if (index === components.length - 1) {
      const prior = components
        .slice(0, -1)
        .reduce((sum, p) => sum + Math.round((p.estimatedMassShare / total) * 100), 0);
      return { ...c, estimatedMassShare: Math.max(0, 100 - prior) };
    }
    return {
      ...c,
      estimatedMassShare: Math.round((c.estimatedMassShare / total) * 100),
    };
  });
}

function computeCircularity(components: BreakdownComponent[]) {
  const base = components.reduce((sum, c) => {
    const weight = c.estimatedMassShare / 100;
    return sum + RECOVERY_POINTS[c.recoveryPotential] * weight;
  }, 0);

  const hazardousShare = components
    .filter((c) => c.disposalCategory === "Hazardous Waste")
    .reduce((sum, c) => sum + c.estimatedMassShare, 0);
  const landfillShare = components
    .filter((c) => c.disposalCategory === "Landfill")
    .reduce((sum, c) => sum + c.estimatedMassShare, 0);
  const reusableShare = components
    .filter((c) => c.disposalCategory === "Reusable")
    .reduce((sum, c) => sum + c.estimatedMassShare, 0);

  const penalties = hazardousShare * 0.3 + landfillShare * 0.35;
  const bonus = reusableShare * 0.15;

  return Math.max(0, Math.min(100, Math.round(base - penalties + bonus)));
}

function riskFlagsFor(components: BreakdownComponent[]) {
  const flags: string[] = [];
  const hazardousShare = components
    .filter((c) => c.disposalCategory === "Hazardous Waste")
    .reduce((sum, c) => sum + c.estimatedMassShare, 0);
  const landfillShare = components
    .filter((c) => c.disposalCategory === "Landfill")
    .reduce((sum, c) => sum + c.estimatedMassShare, 0);

  if (hazardousShare >= 15) flags.push("High hazardous fraction");
  if (landfillShare >= 20) flags.push("Significant landfill-prone material share");
  if (!flags.length) flags.push("No critical disposal risk detected");

  return flags;
}

function fallbackBreakdown(product: string) {
  const hit = fallbackByProduct.find((p) => p.test.test(product));
  return normalizeShares(hit?.components ?? defaultComponents(product));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BreakdownRequest;
    const product = body?.product?.trim();
    const region = body?.region?.trim() || "Global";

    if (!product) {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }

    const endpoint = process.env.AI_ENDPOINT;
    const apiKey = process.env.AI_KEY;
    const model = process.env.AI_MODEL;

    let components: BreakdownComponent[] | null = null;

    if (endpoint && apiKey && model) {
      const prompt = `You are a circular economy materials analyst.\nReturn STRICT JSON only with shape:\n{\n  \"components\": [\n    {\n      \"name\": string,\n      \"materials\": string[],\n      \"estimatedMassShare\": number,\n      \"disposalCategory\": \"Recyclable\"|\"Specialized Recycling\"|\"Hazardous Waste\"|\"Reusable\"|\"Landfill\"|\"E-waste Recovery\",\n      \"recoveryPotential\": \"Low\"|\"Medium\"|\"High\"|\"Very High\",\n      \"notes\": string\n    }\n  ]\n}\nRules:\n- 3 to 8 components\n- estimatedMassShare should total ~100\n- keep notes short\n- realistic disposal labels for ${region}\nProduct: ${product}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: prompt }],
            },
          ],
        }),
      });

      if (response.ok) {
        const rawText = await response.text();
        let data: OpenAIResponse | null = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }

        const extractOutputText = (payload: OpenAIResponse | null) => {
          if (!payload) return null;
          if (typeof payload.output_text === "string") return payload.output_text;
          const contentItems = payload.output?.flatMap((item) => item.content ?? []) ?? [];
          for (const item of contentItems) {
            if (typeof item?.text === "string") return item.text;
            if (typeof item?.output_text === "string") return item.output_text;
            if (typeof item?.text?.value === "string") return item.text.value;
          }
          return null;
        };

        const normalizeJson = (text: string) => {
          const fenced = text.match(/```json\s*([\s\S]*?)```/i);
          if (fenced?.[1]) return fenced[1].trim();
          const firstBrace = text.indexOf("{");
          const lastBrace = text.lastIndexOf("}");
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            return text.slice(firstBrace, lastBrace + 1);
          }
          return text.trim();
        };

        const outputText = extractOutputText(data);
        if (outputText) {
          try {
            const parsed = JSON.parse(normalizeJson(outputText));
            if (Array.isArray(parsed?.components)) {
              components = parsed.components
                .map((c: unknown) => {
                  const candidate = c as Partial<BreakdownComponent> & { materials?: unknown[] };
                  return ({
                  name: String(candidate?.name ?? "Unknown component"),
                  materials: Array.isArray(candidate?.materials)
                    ? candidate.materials.map((m: unknown) => String(m))
                    : ["Mixed material"],
                  estimatedMassShare: Number(candidate?.estimatedMassShare) || 0,
                  disposalCategory: candidate?.disposalCategory as DisposalCategory,
                  recoveryPotential: candidate?.recoveryPotential as RecoveryPotential,
                  notes: String(candidate?.notes ?? ""),
                });
                })
                .filter((c: BreakdownComponent) =>
                  [
                    "Recyclable",
                    "Specialized Recycling",
                    "Hazardous Waste",
                    "Reusable",
                    "Landfill",
                    "E-waste Recovery",
                  ].includes(c.disposalCategory)
                )
                .filter((c: BreakdownComponent) =>
                  ["Low", "Medium", "High", "Very High"].includes(c.recoveryPotential)
                );
            }
          } catch {
            components = null;
          }
        }
      }
    }

    const safeComponents = normalizeShares(
      components && components.length >= 3 ? components : fallbackBreakdown(product)
    );

    const result: BreakdownResponse = {
      productName: product,
      region,
      components: safeComponents,
      overallCircularityScore: computeCircularity(safeComponents),
      riskFlags: riskFlagsFor(safeComponents),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
