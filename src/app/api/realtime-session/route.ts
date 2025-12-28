// src/app/api/realtime-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // ✅ voice belongs under session.audio.output.voice (NOT session.voice)
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: {
          output: { voice: "marin" },
        },
      },
    };

    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionConfig),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: "Failed to create realtime client secret", detail: data },
        { status: r.status }
      );
    }

    const clientSecret =
      data?.client_secret?.value ||
      data?.client_secret ||
      data?.clientSecret ||
      null;

    if (!clientSecret || typeof clientSecret !== "string") {
      return NextResponse.json(
        { error: "Realtime client secret missing in response", detail: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error creating realtime session", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
