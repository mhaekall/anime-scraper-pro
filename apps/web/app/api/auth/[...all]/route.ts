import { auth } from "@/core/lib/auth";

export const runtime = 'edge';

export const GET = auth.handler;
export const POST = auth.handler;