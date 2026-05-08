import { NextResponse } from "next/server";

type Mode = "text" | "image";
type Category = "Recyclable" | "Hazardous" | "Compostable" | "Mixed";

type CategorizationRequest = {
  mode: Mode;
  text?: string;
  imageDataUrl?: string;
  region?: string;
};

type CategorizationResponse = {
  category: Category;
  confidence: number;
  reason: string;
  nextAction: string;
  materialHints: string[];
};

type LlmEnvelope = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string | { value?: string };
      output_text?: string;
    }>;
  }>;
};

function fallbackFromText(input: string, region: string): CategorizationResponse {
  const text = input.toLowerCase();

  if (/battery|cell|acid|chemical|paint|tube light|bulb|e-waste|phone|laptop|charger/.test(text)) {
    return {
      category: "Hazardous",
      confidence: 84,
      reason: "Item indicates battery/chemical/e-waste characteristics that require controlled handling.",
      nextAction: `Use an authorized hazardous or e-waste drop-off in ${region}.`,
      materialHints: ["Heavy metals", "Lithium-ion", "Electronic components"],
    };
  }

  if (/banana|food|vegetable|leaf|garden|organic|compost/.test(text)) {
    return {
      category: "Compostable",
      confidence: 88,
      reason: "Text suggests biodegradable organic matter suitable for composting.",
      nextAction: `Send to home/community compost stream in ${region}.`,
      materialHints: ["Organic fibers", "Biodegradable matter"],
    };
  }

  if (/pet|plastic bottle|paper|cardboard|can|glass|metal|aluminium|steel/.test(text)) {
    return {
      category: "Recyclable",
      confidence: 81,
      reason: "Detected commonly recyclable single-material packaging keywords.",
      nextAction: `Clean and place in dry recyclables stream in ${region}.`,
      materialHints: ["PET/HDPE", "Paper fiber", "Aluminum/steel"],
    };
  }

  return {
    category: "Mixed",
    confidence: 63,
    reason: "Item appears to include mixed/uncertain materials from text cues.",
    nextAction: `Use mixed-waste sorting guidance for ${region}; separate recoverable parts if possible.`, 
    materialHints: ["Mixed plastics", "Composite materials"],
  };
}

function normalizeJson(text: string) {
  const fenceStart = text.indexOf("```json");
  if (fenceStart >= 0) {
    const bodyStart = text.indexOf("\n", fenceStart);
    const fenceEnd = text.indexOf("```", bodyStart >= 0 ? bodyStart + 1 : fenceStart + 7);
    if (bodyStart >= 0 && fenceEnd > bodyStart) {
      return text.slice(bodyStart + 1, fenceEnd).trim();
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

function extractOutputText(payload: LlmEnvelope | null): string | null {
  if (!payload) return null;
  if (typeof payload.output_text === "string") return payload.output_text;

  const contentItems = payload.output?.flatMap((item) => item.content ?? []) ?? [];
  for (const item of contentItems) {
    if (typeof item?.text === "string") return item.text;
    if (typeof item?.output_text === "string") return item.output_text;
    if (typeof item?.text === "object" && typeof item.text?.value === "string") {
      return item.text.value;
    }
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function validateCategory(value: string): Category {
  if (value === "Recyclable" || value === "Hazardous" || value === "Compostable" || value === "Mixed") {
    return value;
  }
  return "Mixed";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CategorizationRequest;
    const mode = body.mode;
    const text = body.text?.trim() ?? "";
    const imageDataUrl = body.imageDataUrl;
    const region = body.region?.trim() || "your area";

    if (mode !== "text" && mode !== "image") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    if (mode === "text" && !text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (mode === "image" && !imageDataUrl) {
      return NextResponse.json({ error: "Missing imageDataUrl" }, { status: 400 });
    }

    const endpoint = process.env.AI_ENDPOINT;
    const apiKey = process.env.AI_KEY;
    const model = process.env.AI_MODEL;

    if (endpoint && apiKey && model) {
      const prompt = `You classify waste items for disposal guidance. Return STRICT JSON only:\n{\n  \"category\": \"Recyclable\"|\"Hazardous\"|\"Compostable\"|\"Mixed\",\n  \"confidence\": number,\n  \"reason\": string,\n  \"nextAction\": string,\n  \"materialHints\": string[]\n}\nRules: confidence 0..100, short reason (max 25 words), 1 short nextAction specific to ${region}.\nInput mode: ${mode}\nText: ${text}`;

      const aiResponse = await fetch(endpoint, {
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
              content: imageDataUrl
                ? [
                    { type: "input_text", text: prompt },
                    { type: "input_image", image_url: imageDataUrl },
                  ]
                : [{ type: "input_text", text: prompt }],
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const raw = await aiResponse.text();
        let envelope: LlmEnvelope | null = null;
        try {
          envelope = JSON.parse(raw) as LlmEnvelope;
        } catch {
          envelope = null;
        }

        const outputText = extractOutputText(envelope);
        if (outputText) {
          try {
            const parsed = JSON.parse(normalizeJson(outputText)) as Partial<CategorizationResponse>;
            const category = validateCategory(String(parsed.category ?? "Mixed"));
            const confidence = clamp(Number(parsed.confidence ?? 65), 0, 100);
            const reason = String(parsed.reason ?? "Classification generated from available item signals.");
            const nextAction = String(parsed.nextAction ?? `Follow ${category.toLowerCase()} stream in ${region}.`);
            const materialHints = Array.isArray(parsed.materialHints)
              ? parsed.materialHints.map((m) => String(m)).slice(0, 6)
              : [];

            return NextResponse.json({
              category,
              confidence,
              reason,
              nextAction,
              materialHints,
            } satisfies CategorizationResponse);
          } catch {
            // fall through to deterministic fallback
          }
        }
      }
    }

    const fallback = fallbackFromText(mode === "text" ? text : "unknown item image", region);
    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
