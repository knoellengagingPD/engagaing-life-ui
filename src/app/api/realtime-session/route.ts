// src/app/api/realtime-session/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY env var' },
        { status: 500 }
      );
    }

    // Mint a short-lived client secret for a TRANSCRIPTION session.
    // This lets the browser connect directly via WebRTC without exposing your main API key.
    const sessionConfig = {
      session: {
        type: 'transcription',
        audio: {
          input: {
            noise_reduction: { type: 'near_field' },
            transcription: {
              // Supported models include whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, etc.
              // Pick one you have access to; this is a safe default.
              model: 'gpt-4o-mini-transcribe',
              language: 'en',
              prompt: '',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
        },
      },
    };

    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig),
    });

    const data = await r.json();

    // The docs show `value` as the ephemeral key.
    // Return a stable shape to the client: { value: string }
    const value =
      data?.value ||
      data?.client_secret?.value ||
      data?.clientSecret ||
      data?.client_secret;

    if (!r.ok || !value) {
      return NextResponse.json(
        { error: 'Failed to mint client secret', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ value });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unknown error minting client secret' },
      { status: 500 }
    );
  }
}
