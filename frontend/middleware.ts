import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter, that allows 50 requests per 10 seconds
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, '10 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Edge Rate Limiting for /api/* routes
  if (path.startsWith('/api/')) {
    if (ratelimit) {
      const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);
      
      if (!success) {
        return new NextResponse('Too Many Requests. Please slow down.', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        });
      }
    }
  }
  
  // 2. Legacy slug resolution for anime URLs
  if (path.startsWith('/anime/') || path.startsWith('/watch/')) {
    const segments = path.split('/').filter(Boolean);
    
    // Check if we are inside a dynamic route: /anime/[id] or /watch/[id]
    if (segments.length >= 2) {
      const id = segments[1];
      const isNumericId = /^\d+$/.test(id);
      
      // If it's a legacy slug (contains characters), intercept and redirect to resolver
      if (!isNumericId) {
        const url = request.nextUrl.clone();
        url.pathname = '/api/resolve-legacy';
        url.searchParams.set('slug', id);
        url.searchParams.set('path', path); // Pass the original path to maintain sub-routes
        return NextResponse.redirect(url);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/anime/:path*', '/watch/:path*'],
};
