// app/api/history/route.ts — Watch history cloud sync endpoint (stub for edge)

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  // TODO: Implement with auth + DB when needed
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(req: NextRequest) {
  // TODO: Implement with auth + DB
  return NextResponse.json({ success: true });
}
