import { NextResponse } from "next/server";

type ChatRequest = {
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
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

    const systemPrompt = `You are EcoPath AI Chat Assistant.
You help users decide how to handle waste items safely and sustainably.

Rules:
- Be practical, concise, and action-oriented.
- Prefer this order when relevant: Reuse > Repair > Donate > Recycle > Safe disposal.
- If hazardous/e-waste is suspected, clearly warn and recommend authorized facilities.
- Ask at most one clarifying question only when essential; otherwise provide best-effort guidance.
- If user asks about local rules, suggest checking city/municipal guidance and official recycler lists.
- Output plain text, no markdown tables.`;

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
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userMessage }],
          },
        ],
      }),
    });

    const rawText = await response.text();
    let data: unknown = null;
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

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "AI response not JSON", detail: rawText },
        { status: 500 }
      );
    }

    const payload = data as {
      output_text?: unknown;
      output?: Array<{ content?: Array<{ text?: unknown; output_text?: unknown; type?: unknown }> }>;
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

    const answer = outputText.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "AI response missing output", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: answer });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
