import { NextResponse } from "next/server";

export async function POST() {
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "alloy",
      instructions: `
You are Engaging Purpose — a calm, thoughtful voice guide helping people reflect
on purpose, relationships, work, and meaning. Ask reflective questions slowly,
one at a time. Be warm and human.
      `,
      modalities: ["text", "audio"],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: err },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
