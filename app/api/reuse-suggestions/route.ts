import { NextResponse } from "next/server";

type ReuseRequest = {
  itemName?: string;
  notes?: string;
  imageDataUrl?: string;
};

type ReuseResult = {
  detected_item: string;
  condition_assumption: string;
  reuse_ideas: string[];
  diy_upcycling: string[];
  donation_options: string[];
  resale_platforms: string[];
  safety_notes: string[];
};

const fallbackResult: ReuseResult = {
  detected_item: "Unknown household item",
  condition_assumption: "Condition unclear from image",
  reuse_ideas: [
    "Use as storage or organizer after cleaning.",
    "Repurpose as spare parts source.",
    "Offer in local freecycle/community groups.",
  ],
  diy_upcycling: [
    "Decorative upcycle project with paint/labels.",
    "Convert into utility holder for desk/kitchen.",
  ],
  donation_options: [
    "Local NGOs or shelters accepting household goods.",
    "Community repair/reuse centers.",
  ],
  resale_platforms: ["OLX", "Facebook Marketplace", "Local scrap dealer apps"],
  safety_notes: [
    "Do not reuse if item is cracked, leaking, or electrically unsafe.",
    "Sanitize before donation/resale.",
  ],
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReuseRequest;
    const itemName = body.itemName?.trim() ?? "";
    const notes = body.notes?.trim() ?? "";
    const imageDataUrl = body.imageDataUrl?.trim() ?? "";

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const endpoint = process.env.AI_ENDPOINT;
    const apiKey = process.env.AI_KEY;
    const model = process.env.AI_MODEL;

    if (!endpoint || !apiKey || !model) {
      return NextResponse.json(
        { error: "AI configuration is missing" },
        { status: 500 }
      );
    }

    const prompt = `You are EcoPath Reuse Assistant.
Analyze the uploaded item photo and provide practical reuse guidance.

Return STRICT JSON only with this schema:
{
  "detected_item": string,
  "condition_assumption": string,
  "reuse_ideas": string[],
  "diy_upcycling": string[],
  "donation_options": string[],
  "resale_platforms": string[],
  "safety_notes": string[]
}

Rules:
- Give 3-6 reuse_ideas.
- Give 2-5 diy_upcycling ideas.
- Give 2-4 donation options.
- Give 2-5 resale platforms/channels.
- Keep each bullet short and actionable.
- If item seems unsafe/damaged, include stronger safety notes.
- Prefer realistic India-friendly options when location is unknown.

Context:
Item name (optional): ${itemName}
User notes (optional): ${notes}`;

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
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ],
      }),
    });

    const rawText = await response.text();

    let parsedPayload: unknown = null;
    try {
      parsedPayload = JSON.parse(rawText);
    } catch {
      parsedPayload = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "AI request failed", detail: parsedPayload ?? rawText },
        { status: 500 }
      );
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      return NextResponse.json(
        { error: "AI response not JSON", detail: rawText },
        { status: 500 }
      );
    }

    const payload = parsedPayload as {
      output_text?: unknown;
      output?: Array<{ content?: Array<{ text?: unknown; output_text?: unknown }> }>;
    };

    let outputText = "";

    if (typeof payload.output_text === "string") {
      outputText = payload.output_text;
    } else {
      const contentItems = payload.output?.flatMap((item) => item.content ?? []) ?? [];
      for (const item of contentItems) {
        if (typeof item.text === "string") {
          outputText = item.text;
          break;
        }
        if (typeof item.output_text === "string") {
          outputText = item.output_text;
          break;
        }
      }
    }

    if (!outputText.trim()) {
      return NextResponse.json(
        { error: "AI response missing output", detail: parsedPayload },
        { status: 500 }
      );
    }

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

    let result: Partial<ReuseResult>;
    try {
      result = JSON.parse(normalizeJson(outputText)) as Partial<ReuseResult>;
    } catch {
      result = fallbackResult;
    }

    const toList = (value: unknown, fallback: string[]) => {
      if (!Array.isArray(value)) return fallback;
      const list = value
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      return list.length ? list.slice(0, 6) : fallback;
    };

    const safeResult: ReuseResult = {
      detected_item:
        typeof result.detected_item === "string" && result.detected_item.trim()
          ? result.detected_item.trim()
          : fallbackResult.detected_item,
      condition_assumption:
        typeof result.condition_assumption === "string" && result.condition_assumption.trim()
          ? result.condition_assumption.trim()
          : fallbackResult.condition_assumption,
      reuse_ideas: toList(result.reuse_ideas, fallbackResult.reuse_ideas),
      diy_upcycling: toList(result.diy_upcycling, fallbackResult.diy_upcycling),
      donation_options: toList(result.donation_options, fallbackResult.donation_options),
      resale_platforms: toList(result.resale_platforms, fallbackResult.resale_platforms),
      safety_notes: toList(result.safety_notes, fallbackResult.safety_notes),
    };

    return NextResponse.json(safeResult);
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
