# Plan: Phase 2 AniList Enrichment

## Objective
Adjust the roadmap priority based on Claude's latest feedback. Instead of immediately moving to Database/Multi-source, we will fully leverage the AniList GraphQL API to fetch all metadata (genres, status, total episodes, season, etc.), minimizing reliance on scraping the anime source for anything other than video links and episode lists.

## Implementation Steps

### 1. Enhance GraphQL Query
- **File:** `backend/main.py`
- **Action:** Update the `GET_ANIME_DETAILS` query to include new fields:
  ```graphql
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      coverImage { extraLarge large color }
      bannerImage
      averageScore
      popularity
      trending
      episodes
      status
      season
      seasonYear
      description(asHtml: false)
      genres
      studios { nodes { name isAnimationStudio } }
      recommendations {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
          }
        }
      }
      nextAiringEpisode { episode timeUntilAiring }
    }
  }
  ```

### 2. Update `fetch_anilist_info` Function
- **File:** `backend/main.py`
- **Action:** Parse the newly added fields from the GraphQL response and return them in the dictionary result (e.g., `episodes`, `status`, `season`, `seasonYear`, `studios`, `recommendations`, `nextAiringEpisode`, `color`).

### 3. Update `/api/series-detail` Endpoint
- **File:** `backend/main.py`
- **Action:** Pass all the enriched AniList data into the response payload so the frontend can immediately consume it when navigating to the watch page.

## Verification
- Test `/api/series-detail` for a known anime and verify the JSON response contains the newly added AniList metadata (status, season, studios, recommendations).