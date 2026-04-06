import { NextResponse } from 'next/server';

export const runtime = 'edge';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "https://close-sunfish-80475.upstash.io";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU";

// Simple SHA-256 hashing for Edge Runtime
async function generateHash(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, variables } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Generate Cache Key based on the exact GraphQL request
    const payloadStr = JSON.stringify({ query, variables });
    const hash = await generateHash(payloadStr);
    const cacheKey = `anilist_edge_${hash}`;

    // 2. Check Upstash Redis
    try {
      const redisRes = await fetch(`${UPSTASH_URL}/get/${cacheKey}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        // Ensure this fetch doesn't use Next.js aggressive cache to always check live Redis
        cache: 'no-store'
      });
      if (redisRes.ok) {
        const redisData = await redisRes.json();
        if (redisData.result) {
          return NextResponse.json(JSON.parse(redisData.result));
        }
      }
    } catch (e) {
      console.warn("Redis GET error, proceeding to live fetch:", e);
    }

    // 3. Not in cache, fetch from AniList (Live)
    const anilistRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payloadStr,
    });

    if (!anilistRes.ok) {
      // Forward the exact status code (e.g., 429) back to the client
      return NextResponse.json({ error: 'AniList API Error', status: anilistRes.status }, { status: anilistRes.status });
    }

    const data = await anilistRes.json();

    // Only cache successful, non-error responses
    if (!data.errors) {
      // 4. Save to Upstash Redis asynchronously (don't block the response)
      // Cache for 6 hours (21600 seconds) to heavily reduce AniList load
      fetch(`${UPSTASH_URL}/set/${cacheKey}?EX=21600`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      }).catch(e => console.warn("Redis SET error:", e));
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
