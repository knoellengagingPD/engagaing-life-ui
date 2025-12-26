import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

type SavedSession = {
  id: string;
  product: string;
  createdAt: string;
  transcript: string;
  analysis: any;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/session
 * Body: { product: string, transcript: string, analysis: any }
 * Returns: { id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError('Missing JSON body.');

    const product = String(body.product || '').trim();
    const transcript = String(body.transcript || '').trim();
    const analysis = body.analysis;

    if (!product) return jsonError('Missing product.');
    if (!transcript) return jsonError('Missing transcript.');
    if (!analysis) return jsonError('Missing analysis.');

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const session: SavedSession = { id, product, createdAt, transcript, analysis };

    // Store session
    await kv.set(`session:${id}`, session);

    // Maintain a simple list per product (latest first)
    await kv.lpush(`sessions:${product}`, id);

    // Optional: cap list length
    await kv.ltrim(`sessions:${product}`, 0, 99);

    return NextResponse.json({ id });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error.', 500);
  }
}

/**
 * GET /api/session?id=...
 * Returns the saved session payload
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return jsonError('Missing id.');

    const session = await kv.get<SavedSession>(`session:${id}`);
    if (!session) return jsonError('Not found.', 404);

    return NextResponse.json(session);
  } catch (e: any) {
    return jsonError(e?.message || 'Server error.', 500);
  }
}
