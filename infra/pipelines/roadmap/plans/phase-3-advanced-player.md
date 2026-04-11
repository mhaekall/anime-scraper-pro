# Plan: Phase 3 Advanced Video Player & Resolvers

## Objective
Implement Phase 3 based on Claude's latest suggestions. This involves creating a robust custom video player on the frontend that relies purely on direct video streams (HLS/MP4), completely removing the use of cross-origin iframes. On the backend, we will add advanced resolvers for 4meplayer, Streamtape, Mp4upload, and Doodstream to ensure all links return a direct `resolved` video URL.

## Implementation Steps

### 1. Update Backend Resolvers
- **File:** `backend/main.py`
- **Action:** Add the advanced resolver functions (`resolve_4meplayer`, `resolve_streamtape`, `resolve_mp4upload`, `resolve_doodstream`) as suggested by Claude.
- **Action:** Update the main `resolve_video_source` function to dispatch to these new specialized resolvers based on the domain. This ensures that the frontend only receives direct media URLs (`.mp4`, `.m3u8`) and no longer has to render `<iframe>` tags.

### 2. Overhaul Frontend Video Player
- **File:** `frontend/components/Player.tsx`
- **Action:** Completely replace the existing `Player.tsx` component with the custom HLS/MP4 player code provided by Claude. This new player includes:
  - Custom UI controls (play, pause, progress bar, volume, fullscreen).
  - YouTube-style keyboard shortcuts (Space, Arrow keys, F, M).
  - Built-in quality switcher that maintains the current playback time (`currentTime`) when changing qualities.
  - Automatic `720p` default selection.
  - Auto-hiding control bar.

## Verification
- Test playing an episode using the new custom player to ensure video playback works via HLS or direct MP4.
- Test changing qualities to ensure the video resumes from the same timestamp.
- Test keyboard shortcuts.