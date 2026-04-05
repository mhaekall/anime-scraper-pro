import worker from '/data/data/com.termux/files/home/workspace/anime-scraper-pro/frontend/.vercel/output/static/_worker.js/index.js';

async function test() {
  const req = new Request('https://localhost/');
  const env = { 
    ASSETS: { fetch: async () => new Response('Asset not found', {status: 404}) }
  };
  const ctx = {
    waitUntil: () => {},
    passThroughOnException: () => {}
  };
  
  try {
    const res = await worker.fetch(req, env, ctx);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Body preview:", text.substring(0, 500));
  } catch (err) {
    console.error("Worker crashed with error:", err);
  }
}

test();
