/**
 * Anime Scraper Pro - Serverless Swarm Proxy (2026 Edition)
 * Zero-cost globally distributed proxy via Cloudflare Edge Network.
 * Automatically rotates IPs by routing through CF's Anycast network.
 * Now with M3U8 reverse proxy rewriting support.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Authenticate the proxy request
    const proxyKey = request.headers.get("x-proxy-key") || url.searchParams.get("key");
    if (proxyKey !== env.PROXY_SECRET) {
      return new Response("Unauthorized Proxy Access", { status: 401 });
    }

    // 2. Parse target URL
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' query parameter", { status: 400 });
    }

    // 3. Clone headers but sanitize them to avoid CF blocking
    const headers = new Headers(request.headers);
    headers.delete("x-proxy-key");
    headers.delete("host");
    
    // Add random generic user-agent if missing to bypass bot mitigation
    if (!headers.has("user-agent")) {
      const uas = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"
      ];
      headers.set("user-agent", uas[Math.floor(Math.random() * uas.length)]);
    }

    try {
      // 4. Forward the request from a random Cloudflare Datacenter
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow",
      });

      const response = await fetch(targetRequest);
      
      const contentType = response.headers.get('content-type') || '';
      
      // If it's an M3U8 playlist, rewrite segment URLs
      if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
        const text = await response.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        
        const rewritten = text.split('\n').map(line => {
          if (line.startsWith('#') || !line.trim()) return line;
          
          // Convert relative URL to absolute, then proxy through this worker
          const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
          const workerBase = new URL(request.url).origin;
          return `${workerBase}/?url=${encodeURIComponent(absoluteUrl)}&key=${env.PROXY_SECRET}`;
        }).join('\n');
        
        return new Response(rewritten, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          }
        });
      }

      // For video segments (.ts files) or regular pages, proxy byte-by-byte
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
            ...Object.fromEntries(response.headers),
            'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, { status: 502 });
    }
  },
};
