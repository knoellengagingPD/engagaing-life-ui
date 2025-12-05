import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const messages = await request.json();

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  return NextResponse.json({
    reply: completion.choices[0].message,
  });
}
