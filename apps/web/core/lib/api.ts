// core/lib/api.ts — Centralized API client. All backend calls go through here.

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://jonyyyyyyyu-anime-scraper-api.hf.space";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // If path starts with /api/anilist or /api/history, it's a local Next.js route.
  // We use relative path so it hits the same origin.
  const isLocalNextRoute = path.startsWith("/api/anilist") || path.startsWith("/api/history");
  const url = (path.startsWith("http") || isLocalNextRoute) ? path : `${API}${path}`;

  const res = await fetch(url, {
...
init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return res.json();
}

// ── Typed API methods ──────────────────────────────────────────────

export const api = {
  /** Homepage data from our DB (fast, verified) */
  homeV2: () => request<{ success: boolean; data: { hero: any[]; latest: any[]; popular: any[] } }>("/api/v2/home"),

  /** Full anime detail + episodes */
  animeDetail: (id: number) => request<{ success: boolean; syncing?: boolean; data: any }>(`/api/v2/anime/${id}`),

  /** Lightweight episode list only */
  episodes: (id: number) => request<{ success: boolean; data: any[] }>(`/api/v2/anime/${id}/episodes`),

  /** Resolved video sources for an episode */
  stream: (id: number, ep: number) => request<{ success: boolean; sources: any[]; downloads?: any[] }>(`/api/v2/anime/${id}/episodes/${ep}/stream`),

  /** Series list from provider (v1 — only used as fallback) */
  seriesList: () => request<{ success: boolean; data: any[] }>("/api/series"),

  /** Browse catalog from our DB */
  browse: (params: { page?: number; genre?: string; sort?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.genre) q.set("genre", params.genre);
    if (params.sort) q.set("sort", params.sort);
    return request<{ success: boolean; page: number; data: any[] }>(`/api/v2/browse?${q.toString()}`);
  },

  /** AniList GraphQL proxy */
  anilist: (query: string, variables?: Record<string, any>) =>
    request<any>("/api/anilist", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    }),
};

export { API, ApiError };
