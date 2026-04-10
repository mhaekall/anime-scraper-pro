/**
 * Anime Scraper Pro - Serverless Swarm Proxy (2026 Edition)
 * Zero-cost globally distributed proxy via Cloudflare Edge Network.
 * Automatically rotates IPs by routing through CF's Anycast network.
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Authenticate the proxy request
    const proxyKey = request.headers.get("x-proxy-key");
    if (proxyKey !== env.PROXY_SECRET) {
      return new Response("Unauthorized Proxy Access", { status: 401 });
    }

    // 2. Parse target URL
    const url = new URL(request.url);
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
      // CF handles DNS, TLS, and egress using dynamic IPs automatically.
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow",
      });

      const response = await fetch(targetRequest);
      
      // 5. Pass response back exactly as is
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, { status: 502 });
    }
  },
};
