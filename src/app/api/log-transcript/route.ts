import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery();

export async function POST(request: Request) {
  try {
    const { timestamp, sessionId, speaker, transcript, module } = await request.json();

    const datasetId = "engaging_life";
    const tableId = "transcripts";

    const rows = [
      {
        timestamp,
        session_id: sessionId,
        speaker,
        transcript,
        module,
      },
    ];

    await bigquery.dataset(datasetId).table(tableId).insert(rows);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("BigQuery insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
