// src/app/api/realtime-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important for server-side fetch + secrets

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // This creates an ephemeral client secret for the browser.
    // Docs: POST /v1/realtime/client_secrets :contentReference[oaicite:1]{index=1}
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: {
          output: { voice: "marin" },
        },
        // Optional: you can also include other session fields later.
      },
    };

    const resp = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Failed to create client secret", details: text },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    // data.value is the ephemeral client secret (safe for browser use). :contentReference[oaicite:2]{index=2}
    return NextResponse.json({ clientSecret: data.value });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error creating realtime session", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
