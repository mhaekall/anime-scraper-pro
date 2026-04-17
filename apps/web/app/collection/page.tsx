import CollectionView from "@/features/collection/CollectionView";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function Page() {
  return <CollectionView />;
}
