# Plan: Phase 1 Core Engine Stabilization

## Objective
Execute the critical backend fixes suggested by Claude AI to stabilize the core scraper engine before adding new frontend features.

## Root Cause Analysis & Fixes
1. **Video Resolver (`4meplayer.pro`)**: `resolve_video_source` ignores `4meplayer.pro` links. We need to fetch the `4meplayer.pro` URL, extract the `iframe` src inside it, and return that URL (which usually points to the actual raw video).
2. **BASE_URL Inconsistency**: `BASE_URL` is set to `https://anime.oploverz.ac` but scraping hits `https://o.oploverz.ltd`. We will unify this so broken links don't occur.
3. **Svelte Payload Parsing**: The regex `episodeNumber:"([^"]+)"` is brittle. We will use `re.search(r'kit\.start\(app, element, ({.*?})\);', html, re.DOTALL)` to extract the full JSON data, safely parsing it to find episodes.
4. **Extract `downloadUrl`**: While parsing the Svelte JSON, we will also extract `downloadUrl` arrays which contain direct download links and resolutions, returning them in `/api/scrape`.

## Implementation Steps
### Phase 1: Fix `BASE_URL` & Svelte Parser
- **File:** `backend/main.py`
- **Action:** Change `BASE_URL = 'https://o.oploverz.ltd'`.
- **Action:** Update `/api/series-detail` and `/api/episodes` to use the JSON Svelte parser for episode extraction.

### Phase 2: Fix Resolver & Download Extraction
- **File:** `backend/main.py`
- **Action:** Update `resolve_video_source` to handle `4meplayer.pro` (fetch, parse HTML for `<iframe src="...">`, extract src).
- **Action:** Update `/api/scrape` to parse the Svelte JSON payload to extract `downloadUrl` robustly and pass it to the frontend.

## Verification
1. Ensure the backend `/api/scrape` returns valid video URLs for 4meplayer links.
2. Ensure `/api/series-detail` returns correct episode lists by fetching the Svelte payload.
3. Ensure `/api/scrape` response includes `downloads` array.