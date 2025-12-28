// src/app/api/realtime-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  // Create an ephemeral client secret (ek_...) for browser usage
  // Endpoint: POST /v1/realtime/client_secrets :contentReference[oaicite:1]{index=1}
  const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview",
        voice: "marin",
        instructions:
          "You are Engaging Purpose, a warm, concise voice interviewer. Ask one question at a time. After the user answers, briefly acknowledge, then move to the next question.",
      },
    }),
  });

  const txt = await r.text();
  if (!r.ok) {
    return NextResponse.json(
      { error: "Failed to create realtime client secret", detail: txt },
      { status: r.status }
    );
  }

  const data = JSON.parse(txt);

  // The client secret is the ephemeral key string (looks like ek_1234...) :contentReference[oaicite:2]{index=2}
  const clientSecret = data?.client_secret;
  if (!clientSecret) {
    return NextResponse.json({ error: "No client_secret returned", raw: data }, { status: 500 });
  }

  return NextResponse.json({ clientSecret });
}
