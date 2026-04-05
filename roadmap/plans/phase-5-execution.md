# Plan: Phase 5 - Supabase DB, Drizzle ORM, & Better-Auth Implementation

## Objective
Execute the integration of Supabase PostgreSQL (for storage), Drizzle ORM (for Edge-compatible data access), and Better-Auth (for Google OAuth) to enable persistent cross-device watch history and user accounts, adhering to the lateral thinking architecture.

## Implementation Steps

### 1. Dependency Installation
- **Action:** Install required packages in the `frontend` directory.
  - `drizzle-orm`, `postgres`, `better-auth`
  - Dev dependencies: `drizzle-kit`, `tsx`, `dotenv`

### 2. Environment Configuration
- **Action:** Ensure `.env.local` in the `frontend` directory contains:
  - `DATABASE_URL` (Supabase connection pooler string)
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

### 3. Drizzle Schema Definition
- **File:** `frontend/db/schema.ts`
- **Action:** Define the PostgreSQL schema:
  - **Better-Auth Tables:** `user`, `session`, `account`, `verification` (standard Better-Auth schema).
  - **Application Tables:** 
    - `watch_history`: Tracks user progress (anime slug, episode, timestamp, duration, completed status).
    - `bookmarks`: Tracks user collections.

### 4. Database Connection & Auth Setup
- **File:** `frontend/db/index.ts`
  - **Action:** Initialize the Drizzle ORM instance using the `postgres` driver connected to the Supabase URL.
- **File:** `frontend/lib/auth.ts`
  - **Action:** Initialize Better-Auth, configuring the Google provider and the Drizzle adapter pointing to `db`.

### 5. API Routes Configuration
- **File:** `frontend/app/api/auth/[...all]/route.ts`
  - **Action:** Create the Next.js catch-all route for Better-Auth.
- **File:** `frontend/app/api/history/route.ts`
  - **Action:** Create endpoints to GET and POST watch history progress for the authenticated user.

### 6. Database Migration (Push)
- **Action:** Run `drizzle-kit push` to synchronize the defined schema with the live Supabase PostgreSQL database. (Assuming MCP or direct connection).

### 7. UI Integration
- **File:** `frontend/components/Navbar.tsx` (or similar layout component)
  - **Action:** Add Google Login/Logout buttons using Better-Auth client hooks.
- **File:** `frontend/components/Player.tsx` & `frontend/components/HistoryTracker.tsx`
  - **Action:** Refactor to periodically save progress to `/api/history` and load initial progress from the cloud instead of `localStorage`.

## Verification
- Successful database schema creation in Supabase.
- User can sign in with Google.
- Video playback timestamps are saved to the Supabase `watch_history` table.