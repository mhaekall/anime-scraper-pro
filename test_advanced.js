async function run() {
  const res = await fetch('http://localhost:3000/api/anilist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query ($search: String, $page: Int, $perPage: Int, $genres: [String], $year: Int, $sort: [MediaSort]) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage }
            media(search: $search, type: ANIME, genre_in: $genres, seasonYear: $year, sort: $sort) {
              id title { romaji english native } coverImage { extraLarge large color } bannerImage
              episodes averageScore genres status format seasonYear duration
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
