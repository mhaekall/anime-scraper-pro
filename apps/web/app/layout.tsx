import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/ui/overlays/InstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnimeScraper Pro",
  description: "Nonton anime subtitle Indonesia — cepat, gratis, tanpa iklan.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AnimeScraper Pro",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full bg-black text-white">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}

