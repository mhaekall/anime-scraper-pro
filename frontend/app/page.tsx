"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/ui/layout/AppShell"), { ssr: false });

export default function Home() {
  return (
    <main className="w-full min-h-[100dvh] bg-black text-white flex flex-col min-w-0">
      <AppShell />
    </main>
  );
}
