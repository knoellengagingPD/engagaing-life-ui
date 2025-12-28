// src/app/api/realtime-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important: not edge

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Session config used to mint a client secret
    const sessionConfig = {
      type: "realtime",
      model: "gpt-realtime",
      audio: { output: { voice: "marin" } },
      instructions:
        "You are Engaging Purpose, a warm, concise voice interviewer. Ask one question at a time.",
    };

    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionConfig),
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: "Failed to mint client secret", status: r.status, details: text },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    // Docs show the token as data.value (example ek_...) :contentReference[oaicite:2]{index=2}
    const value = data?.value;
    if (!value) {
      return NextResponse.json({ error: "Missing value in client secret response", raw: data }, { status: 500 });
    }

    return NextResponse.json({ clientSecret: value });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
