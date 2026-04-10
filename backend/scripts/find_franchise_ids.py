import httpx

query = """
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      seasonYear
      format
    }
  }
}
"""

searches = ["That Time I Got Reincarnated as a Slime", "Classroom of the Elite", "Mushoku Tensei"]

for search in searches:
    res = httpx.post("https://graphql.anilist.co", json={"query": query, "variables": {"search": search}})
    print(f"\n--- {search} ---")
    for m in res.json()["data"]["Page"]["media"]:
        if m["format"] in ["TV", "MOVIE", "OVA"]:
            eng = m["title"].get("english")
            rom = m["title"].get("romaji")
            yr = m.get("seasonYear")
            print(f"ID: {m['id']} | {eng} / {rom} ({yr})")
