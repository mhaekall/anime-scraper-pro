import HomeView from "@/features/home/HomeView";
import { api } from "@/core/lib/api";

export const revalidate = 60; // Cache on server for 60 seconds

export default async function Page() {
  let hero = [];
  let airing = [];
  let latest = [];
  let popular = [];

  const res = await api.homeV2({ next: { revalidate: 60 } });
  if (res.success && res.data) {
    hero = res.data.hero || [];
    airing = res.data.airing || [];
    latest = res.data.latest || [];
    popular = res.data.popular || [];
  } else {
    // Throw an error so Next.js ISR keeps the previous successful cache
    // instead of replacing the homepage with an empty shell!
    throw new Error("Backend returned unsuccessful response for home data");
  }

  return <HomeView initialHero={hero} initialAiring={airing} initialLatest={latest} initialPopular={popular} />;
}
