import { NextResponse } from "next/server";

type AnalyzeRequest = {
  mode: "manual" | "ai";
  productType?: string;
  region?: string;
  notes?: string;
  description?: string;
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { mode, productType, region, notes, description, imageDataUrl } = body;

    if (mode === "manual") {
      if (!productType || !region || !description) {
        return NextResponse.json(
          { error: "Missing productType, region, or description" },
          { status: 400 }
        );
      }
    }

    if (mode === "ai") {
      if (!imageDataUrl) {
        return NextResponse.json(
          { error: "Missing product image" },
          { status: 400 }
        );
      }
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

    const prompt = `You are an expert in circular economy and waste systems.\n\nTask: Given a product type and region, map all possible post-use pathways (recycling, landfill, informal recovery, resale/refurb, etc.), estimate the probability of each pathway in the region, and highlight where materials are lost. If product or region are missing, infer them from the image and context. Then generate the extended insights fields.\n\nReturn STRICT JSON only with this schema:\n{\n  \"summary\": string,\n  \"product\": string,\n  \"region\": string,\n  \"pathways\": [\n    {\n      \"name\": string,\n      \"probability\": number,\n      \"loss\": string\n    }\n  ],\n  \"waste_future_predictor\": { \"day\": string, \"week\": string, \"year\": string },\n  \"behavior_based_suggestion\": { \"habits\": string[], \"suggestions\": string[] },\n  \"circularity_score\": number,\n  \"waste_flow_map\": { \"steps\": string[], \"notes\": string },\n  \"impact_simulator\": { \"recycle\": { \"co2_kg\": number, \"notes\": string }, \"landfill\": { \"co2_kg\": number, \"notes\": string }, \"delta_kg\": number },\n  \"hidden_material_flow\": string[],\n  \"uncertainty_output\": { \"range_low\": number, \"range_high\": number, \"notes\": string },\n  \"waste_leakage_detector\": { \"leakage_percent\": number, \"drivers\": string[] },\n  \"what_if_scenario_engine\": [ { \"scenario\": string, \"expected_change\": string } ],\n  \"product_aware_prediction\": string,\n  \"explainable_ai_output\": string,\n  \"community_waste_score\": { \"score\": number, \"rationale\": string },\n  \"reverse_supply_chain_suggestion\": string[]\n}\n\nRules: probabilities must sum to ~100 (±2). Use 3-6 pathways. Keep loss short. Make numeric values realistic and provide concise text.\n\nInput:\nProduct: ${productType ?? ""}\nRegion: ${region ?? ""}\nDescription: ${description ?? ""}\nNotes: ${notes ?? ""}`;

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

    const rawText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "AI request failed", detail: data ?? rawText },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "AI response not JSON", detail: rawText },
        { status: 500 }
      );
    }

    const extractOutputText = (payload: any) => {
      if (!payload) return null;
      if (typeof payload.output_text === "string") return payload.output_text;
      const contentItems: any[] =
        payload.output?.flatMap((item: any) => item.content ?? []) ?? [];
      for (const item of contentItems) {
        if (typeof item?.text === "string") return item.text;
        if (typeof item?.output_text === "string") return item.output_text;
        if (typeof item?.text?.value === "string") return item.text.value;
      }
      return null;
    };

    const outputText = extractOutputText(data);

    if (!outputText) {
      return NextResponse.json(
        { error: "AI response missing output", detail: data ?? rawText },
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

    let parsed;
    try {
      parsed = JSON.parse(normalizeJson(outputText));
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: outputText },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
