import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type TranscriptLog = {
  timestamp: string;
  sessionId: string;
  speaker: string;
  transcript: string;
  module?: string;
  productKey?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranscriptLog;

    if (!body?.sessionId || !body?.speaker || !body?.transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: sessionId, speaker, transcript" },
        { status: 400 }
      );
    }

    const event = {
      ...body,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    // Store as an append-only list of events for that session
    const listKey = `sessions:${body.sessionId}:transcript`;

    await kv.rpush(listKey, JSON.stringify(event));

    // Optional: update a "last updated" pointer
    await kv.hset(`sessions:${body.sessionId}:meta`, {
      sessionId: body.sessionId,
      updatedAt: event.timestamp,
      module: body.module || "",
      productKey: body.productKey || "",
    });

    return NextResponse.json({ ok: true, saved: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
