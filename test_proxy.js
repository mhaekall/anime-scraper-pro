async function run() {
  const url = 'http://localhost:3000/api/anilist';
  const payload = {
    query: `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(search: $search, type: ANIME) {
            id title { romaji english } coverImage { large }
          }
        }
      }
    `,
    variables: { search: "naruto", page: 1, perPage: 10 }
  };

  try {
    console.log("Testing /api/anilist proxy...");
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Result items count:", data?.data?.Page?.media?.length || 0);
    if (data.errors) console.log("GraphQL Errors:", data.errors);
  } catch (e) {
    console.error("Request failed:", e.message);
  }
}
run();
