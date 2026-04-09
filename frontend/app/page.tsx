"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/ui/layout/AppShell"), { ssr: false });

export default function Home() {
  return (
    <main className="w-full h-screen bg-black text-white overflow-hidden">
      <AppShell />
    </main>
  );
}
