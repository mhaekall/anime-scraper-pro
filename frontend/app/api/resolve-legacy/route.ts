import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://jonyyyyyyyu-anime-scraper-api.hf.space";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const path = searchParams.get('path'); // e.g. /watch/one-piece/12

  if (!slug || !path) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const url = `https://o.oploverz.ltd/series/${slug}`;
    const res = await fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(url)}`);
    
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.anilistId) {
        const anilistId = json.data.anilistId;
        // Replace the slug with the anilistId in the path
        // Important: this only replaces the FIRST occurrence, which is the slug
        const newPath = path.replace(`/${slug}`, `/${anilistId}`);
        return NextResponse.redirect(new URL(newPath, request.url), 301);
      }
    }
  } catch (error) {
    console.error('Failed to resolve legacy slug', error);
  }

  // Fallback to home if unable to resolve
  return NextResponse.redirect(new URL('/', request.url));
}
