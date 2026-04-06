import { NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NOT_SET",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "NOT_SET",
    NODE_ENV: process.env.NODE_ENV
  });
}
