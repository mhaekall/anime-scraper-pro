import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anime Scraper Pro - Enterprise",
  description: "Next.js Frontend + Python FastAPI Backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
