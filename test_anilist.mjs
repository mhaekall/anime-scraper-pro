const fetch = require('node-fetch');

async function run() {
  const res = await fetch('http://localhost:3000/api/anilist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(search: $search, type: ANIME) {
              id title { romaji }
            }
          }
        }
      `,
      variables: { search: "naruto", page: 1, perPage: 24 }
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.substring(0, 500));
}
run();
