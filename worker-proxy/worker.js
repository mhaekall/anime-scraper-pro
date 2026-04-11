// worker/src/index.js — Cloudflare Worker
const PROXY_SECRET = "anime-pro-secure-2026"; // Match default in signed_url.py

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function verifyAndDecode(token, sig, envSecret) {
  const secret = envSecret || PROXY_SECRET;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  const expectedHex = [...new Uint8Array(expected)]
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  
  if (sig !== expectedHex) return null;
  
  const payload = JSON.parse(base64UrlDecode(token));
  if (payload.x < Date.now() / 1000) return null;  // expired
  
  return payload;
}

// Keep the signSegmentUrl logic for rewriting m3u8
async function signSegmentUrl(raw_url, provider_id, currentB64, currentSig, envSecret, workerBase) {
  // Rather than signing dynamically on the edge (which requires secret again),
  // we can just pass the upstream URL to the same endpoint? 
  // Wait, the Architect said: return signSegmentUrl(segUrl, payload.p, match[1]);
  // Since we are inside the worker, we can just encode and sign it again.
  const secret = envSecret || PROXY_SECRET;
  const payloadStr = JSON.stringify({
    u: raw_url,
    p: provider_id,
    q: "Auto",
    x: Math.floor(Date.now() / 1000) + 6 * 3600
  });
  
  let b64 = btoa(payloadStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64));
  const sigHex = [...new Uint8Array(sigBuffer)]
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    
  return `${workerBase}/s/${b64}.${sigHex}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Route: /s/{base64payload}.{signature}
    const match = url.pathname.match(/^\/s\/([^.]+)\.([a-f0-9]{16})$/);
    if (!match) {
      // Legacy fallback
      const proxyKey = request.headers.get("x-proxy-key") || url.searchParams.get("key");
      const targetUrl = url.searchParams.get("url");
      if (proxyKey !== env.PROXY_SECRET && proxyKey !== PROXY_SECRET) {
        return new Response("Not Found", { status: 404 });
      }
      if (!targetUrl) return new Response("Missing url", { status: 400 });
      return handleProxy(targetUrl, request, env, null, match);
    }
    
    const payload = await verifyAndDecode(match[1], match[2], env.PROXY_SECRET);
    if (!payload) return new Response("Forbidden", { status: 403 });
    
    const upstream = payload.u;
    return handleProxy(upstream, request, env, payload, match);
  }
};

async function handleProxy(upstream, request, env, payload, match) {
  const isM3U8 = upstream.split('?')[0].endsWith('.m3u8') || upstream.includes('.m3u8');
  
  // Forward Range header untuk MP4 seek
  const headers = { 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Referer": new URL(upstream).origin
  };
  const range = request.headers.get("Range");
  if (range) headers["Range"] = range;
  
  try {
    const targetRequest = new Request(upstream, {
      method: "GET",
      headers: headers,
      redirect: "follow",
    });

    const resp = await fetch(targetRequest);
    
    if (isM3U8) {
      // Rewrite .ts segment URLs agar juga lewat proxy
      let body = await resp.text();
      const baseUrl = upstream.substring(0, upstream.lastIndexOf('/'));
      const workerBase = new URL(request.url).origin;
      
      const rewrittenLines = [];
      const lines = body.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith('#') || !line.trim()) {
          rewrittenLines.push(line);
          continue;
        }
        
        let segUrl = line;
        if (!line.startsWith('http')) {
          if (line.startsWith('/')) {
            const upOrigin = new URL(upstream).origin;
            segUrl = upOrigin + line;
          } else {
            segUrl = `${baseUrl}/${line.trim()}`;
          }
        }
        
        if (payload && match) {
          const signed = await signSegmentUrl(segUrl, payload.p, match[1], match[2], env.PROXY_SECRET, workerBase);
          rewrittenLines.push(signed);
        } else {
          rewrittenLines.push(`${workerBase}/?url=${encodeURIComponent(segUrl)}&key=${env.PROXY_SECRET || "anime-pro-secure-2026"}`);
        }
      }
      
      return new Response(rewrittenLines.join('\n'), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=5",
        }
      });
    }
    
    // MP4/TS passthrough streaming
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "video/mp4",
        "Content-Length": resp.headers.get("Content-Length") || "",
        "Content-Range": resp.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      }
    });
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
}
