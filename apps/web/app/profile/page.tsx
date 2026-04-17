import ProfileView from "@/features/profile/ProfileView";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function Page() {
  return <ProfileView />;
}
