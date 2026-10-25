import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftDesk — Roster & Pay",
  description: "Personal roster, fatigue and pay tracker for casual security work across multiple employers.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "ShiftDesk", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preload" href="/fonts/archivo.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh bg-zinc-950 font-sans text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
