import ExploreView from "@/features/explore/ExploreView";
import { api } from "@/core/lib/api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SEARCH_Q = `
  query ($search: String, $page: Int, $perPage: Int, $genres: [String], $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: ANIME, genre_in: $genres, sort: $sort) {
        id title { romaji english native } coverImage { extraLarge large color }
        averageScore status seasonYear
      }
    }
  }
`;

export default async function Page() {
  let initialResults = [];

  try {
    const vars = { page: 1, perPage: 30, sort: ["POPULARITY_DESC"] };
    const res = await api.anilist(SEARCH_Q, vars, { next: { revalidate: 60 } });
    
    if (res?.data?.Page?.media) {
      initialResults = res.data.Page.media.map((m: any) => ({
        id: String(m.id),
        title: m.title.english || m.title.romaji || m.title.native || "",
        img: m.coverImage?.extraLarge || m.coverImage?.large,
        score: m.averageScore,
        color: m.coverImage?.color,
        status: m.status,
        seasonYear: m.seasonYear,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch initial explore data via RSC:", error);
  }

  return <ExploreView initialResults={initialResults} />;
}
