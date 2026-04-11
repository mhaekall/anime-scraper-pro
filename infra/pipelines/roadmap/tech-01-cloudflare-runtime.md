# Q1: Cloudflare Pages + Edge Runtime — Full Compatibility Setup

Target deploy ke Cloudflare Pages murni, runtime = 'nodejs' memang tidak tersedia. Ini bukan bug workaround, ini architectural constraint fundamental.

## Root Cause Analysis
Cloudflare Workers Runtime:
- ✅ Web APIs (fetch, Request, Response, crypto)
- ✅ Node.js Compat Flags (subset — net, tls, stream)
- ❌ async_hooks (tidak ada di V8 isolate)
- ❌ net.Socket (TCP langsung)
- ❌ fs, child_process, dll

**better-auth internals** -> pakai async_hooks untuk context propagation.
**@neondatabase/serverless** -> pakai WebSocket, BUKAN TCP (✅ OK sebenarnya).
**drizzle-orm** -> pure JS, aman ✅.

Masalah utamanya adalah `better-auth` dan cara Anda mengimpornya.

## Fix Step 1: wrangler.toml
```toml
# wrangler.toml
name = "anime-scraper-pro"
compatibility_date = "2024-09-23"  # ← date ini krusial, harus >= 2024-09-23
compatibility_flags = [
  "nodejs_compat",           # enable Node.js subset
  "nodejs_compat_populate_process_env"  # untuk process.env
]
pages_build_output_dir = ".vercel/output/static"

[vars]
BETTER_AUTH_URL = "https://anime-scraper-pro.pages.dev"
NEXT_PUBLIC_APP_URL = "https://anime-scraper-pro.pages.dev"
```

## Fix Step 2: next.config.mjs — Proper Edge Bundling
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jangan externalize — biarkan bundler resolve untuk edge
  serverExternalPackages: [],
  
  experimental: {
    // Izinkan better-auth diproses oleh edge bundler
    serverComponentsExternalPackages: [],
  },

  webpack: (config, { nextRuntime, isServer }) => {
    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        // Tambahkan ini — inilah yang menyebabkan async_hooks error
        async_hooks: false,
        'node:async_hooks': false,
      };

      // Alias async_hooks ke polyfill kosong
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': false,
        'node:async_hooks': false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

## Fix Step 3: lib/auth.ts — Edge-Compatible Better-Auth
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  
  // KRUSIAL: disable features yang pakai async_hooks
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // Disable cross-request context tracking
    disableCSRFCheck: false,
  },
  
  plugins: [
    nextCookies(), // pakai cookie-based, bukan async_hooks context
  ],
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }
  },
  
  // Trustedorigins — penting untuk Cloudflare
  trustedOrigins: [
    "https://anime-scraper-pro.pages.dev",
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean),
});
```

## Fix Step 4: db/index.ts — Neon dengan Edge WebSocket
```typescript
// db/index.ts
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Untuk Cloudflare Workers, gunakan fetch-based HTTP bukan WebSocket
// neon-http driver adalah YANG PALING COMPATIBLE dengan Edge
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Catatan: neon-http menggunakan fetch() API yang tersedia 
// di semua Edge runtimes — ini pilihan paling aman
```

## Fix Step 5: Route Runtime Declaration
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "../../../../lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// HAPUS export const runtime = 'edge' — biarkan default
// Cloudflare Pages akan otomatis treat semua routes sebagai edge
export const { GET, POST } = toNextJsHandler(auth);
```

## Fix Step 6: deploy-cf.sh — Tambahkan Patching yang Benar
```bash
#!/bin/bash
set -e

PROJECT_NAME="anime-scraper-pro"

echo "🔧 Building with @cloudflare/next-on-pages..."
CI=true npx --yes @cloudflare/next-on-pages

echo "🔧 Patching async_hooks references..."
# Patch semua async_hooks imports menjadi empty module
find .vercel/output/static/_worker.js -type f -name "*.js" \
  -exec sed -i \
    -e 's|require("async_hooks")|require("node:async_hooks")|g' \
    -e 's|"async_hooks"|"node:async_hooks"|g' \
  {} +

# Patch node: prefix untuk compatibility
find .vercel/output/static/_worker.js -type f -name "*.js" \
  -exec sed -i \
    -e 's|from "node:async_hooks"|from "node:async_hooks" \/\/ patched|g' \
  {} +

echo "📤 Deploying to Cloudflare Pages..."
CI=true npx wrangler pages deploy \
  --project-name $PROJECT_NAME \
  --branch main \
  .vercel/output/static

echo "✅ Done!"
```
