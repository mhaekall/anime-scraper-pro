import HomeView from "@/features/home/HomeView";
import { api } from "@/core/lib/api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function Page() {
  let hero = [];
  let airing = [];
  let latest = [];
  let popular = [];
  let completed = [];
  let top_rated = [];
  let isekai = [];
  let movies = [];
  let trending = [];

  try {
    const res = await api.homeV2({ next: { revalidate: 60 } });
    if (res.success && res.data) {
      hero = res.data.hero || [];
      airing = res.data.airing || [];
      latest = res.data.latest || [];
      popular = res.data.popular || [];
      completed = res.data.completed || [];
      top_rated = res.data.top_rated || [];
      isekai = res.data.isekai || [];
      movies = res.data.movies || [];
      trending = res.data.trending || [];
    }
  } catch (error) {
    console.error("Failed to fetch home data:", error);
  }

  return <HomeView 
    initialHero={hero} 
    initialAiring={airing} 
    initialLatest={latest} 
    initialPopular={popular} 
    initialCompleted={completed} 
    initialTopRated={top_rated}
    initialIsekai={isekai}
    initialMovies={movies}
    initialTrending={trending}
  />;
}
