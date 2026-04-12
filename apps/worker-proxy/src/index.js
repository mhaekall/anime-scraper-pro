/**
 * Cloudflare Worker for Telegram Swarm Storage Proxy
 * This worker acts as a near-0ms bridge between the user's browser and Telegram's servers.
 * It takes a `file_id` from the URL, queries Telegram for the real `file_path`,
 * and streams the file chunk-by-chunk to the browser with full Range Request support
 * (which is mandatory for HLS streaming and video players).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Setup CORS headers to allow video players from any origin
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Path pattern: /<file_id>
    const fileId = url.pathname.slice(1);
    if (!fileId) {
      return new Response("Missing file_id in URL path", { status: 400, headers: corsHeaders });
    }

    // 1. Get the actual download path from Telegram API
    // We use the TELEGRAM_BOT_TOKEN stored in the Worker's secrets
    const getFileUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    
    try {
      const tgFileResponse = await fetch(getFileUrl);
      if (!tgFileResponse.ok) {
        return new Response("Telegram API Error", { status: tgFileResponse.status, headers: corsHeaders });
      }

      const tgFileData = await tgFileResponse.json();
      if (!tgFileData.ok) {
        return new Response("File not found on Telegram", { status: 404, headers: corsHeaders });
      }

      const filePath = tgFileData.result.file_path;
      const tgDownloadUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;

      // 2. Stream the file from Telegram to the client
      // Forward the original request headers (especially the 'Range' header for video scrubbing)
      const fetchHeaders = new Headers();
      const range = request.headers.get("Range");
      if (range) {
        fetchHeaders.set("Range", range);
      }

      const fileResponse = await fetch(tgDownloadUrl, {
        method: "GET",
        headers: fetchHeaders,
      });

      // 3. Return the response to the browser, appending our CORS headers
      const responseHeaders = new Headers(fileResponse.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      // If it's a .ts or .m3u8 file, we ensure the correct content type
      if (filePath.endsWith('.ts')) {
        responseHeaders.set('Content-Type', 'video/mp2t');
      } else if (filePath.endsWith('.m3u8')) {
        responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (filePath.endsWith('.mp4')) {
        responseHeaders.set('Content-Type', 'video/mp4');
      }

      return new Response(fileResponse.body, {
        status: fileResponse.status,
        statusText: fileResponse.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, { status: 500, headers: corsHeaders });
    }
  }
};
