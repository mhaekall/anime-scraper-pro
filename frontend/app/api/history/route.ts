import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchHistory } from "@/db/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { animeSlug, animeTitle, animeCover, episode, episodeTitle, timestampSec, durationSec, source, quality } = body;

        const isCompleted = durationSec > 0 && (timestampSec / durationSec) > 0.9;

        await db.insert(watchHistory).values({
            userId: session.user.id,
            animeSlug,
            animeTitle,
            animeCover: animeCover || null,
            episode,
            episodeTitle: episodeTitle || null,
            timestampSec,
            durationSec: durationSec || 0,
            completed: isCompleted,
            source: source || 'oploverz',
            quality: quality || '720p',
            updatedAt: new Date()
        }).onConflictDoUpdate({
            target: [watchHistory.userId, watchHistory.animeSlug, watchHistory.episode],
            set: {
                timestampSec,
                durationSec: durationSec || 0,
                completed: isCompleted,
                quality: quality || '720p',
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        
        const url = new URL(req.url);
        const slug = url.searchParams.get("slug");
        const ep = url.searchParams.get("ep");
        
        if (slug && ep) {
            const data = await db.select().from(watchHistory)
              .where(and(
                  eq(watchHistory.userId, session.user.id), 
                  eq(watchHistory.animeSlug, slug), 
                  eq(watchHistory.episode, parseInt(ep))
              ))
              .limit(1);
            return NextResponse.json({ success: true, timestampSec: data[0]?.timestampSec || 0 });
        }

        const history = await db.select().from(watchHistory)
            .where(eq(watchHistory.userId, session.user.id))
            .orderBy(desc(watchHistory.updatedAt))
            .limit(20);
        
        return NextResponse.json({ success: true, data: history });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
