import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery();

export async function POST(request: Request) {
  try {
    const { timestamp, sessionId, speaker, transcript, module } =
      await request.json();

    const datasetId = "engaging_life";
    const tableId = "transcripts";

    await bigquery.dataset(datasetId).table(tableId).insert([
      {
        timestamp,
        session_id: sessionId,
        speaker,
        transcript,
        module,
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("BigQuery insert error:", err);
    return NextResponse.json(
      { error: err.message || "Insert failed" },
      { status: 500 }
    );
  }
}
