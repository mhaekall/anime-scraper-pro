import HomeView from "@/features/home/HomeView";
import { api } from "@/core/lib/api";

export const revalidate = 60; // Cache on server for 60 seconds

export default async function Page() {
  let hero = [];
  let airing = [];
  let latest = [];
  let popular = [];

  try {
    const res = await api.homeV2({ next: { revalidate: 60 } });
    if (res.success && res.data) {
      hero = res.data.hero || [];
      airing = res.data.airing || [];
      latest = res.data.latest || [];
      popular = res.data.popular || [];
    }
  } catch (error) {
    console.error("Failed to fetch home data via RSC:", error);
  }

  return <HomeView initialHero={hero} initialAiring={airing} initialLatest={latest} initialPopular={popular} />;
}
