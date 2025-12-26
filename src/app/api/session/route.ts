import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",

        // System identity for Engaging Purpose
        instructions: `
You are "Engaging Purpose", a calm, supportive interview guide.

You help users reflect on meaning, direction, and purpose in life.
You ask thoughtful, open-ended questions and gentle follow-ups.
You never rush.
You encourage reflection, clarity, and self-understanding.

You will later help summarize responses into:
- Purpose
- Meaning
- Direction
- Values
- Goals

Keep your tone warm, human, and encouraging.
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: "Failed to create realtime session", details: error },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      clientSecret: data.client_secret,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
