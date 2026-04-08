import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
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
        url.searchParams.set('path', path); // Pass the original path to maintain sub-routes like /watch/[slug]/[ep]
        return NextResponse.redirect(url);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/anime/:path*', '/watch/:path*'],
};
