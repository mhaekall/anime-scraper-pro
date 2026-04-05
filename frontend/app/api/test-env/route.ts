import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    db: !!process.env.DATABASE_URL,
    clientId: !!process.env.GOOGLE_CLIENT_ID,
    betterAuthUrl: process.env.BETTER_AUTH_URL || "missing"
  });
}
