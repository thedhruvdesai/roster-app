import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeCss } from "@/lib/themes";

export const metadata: Metadata = {
  title: "ShiftDesk",
  description: "Personal roster, fatigue and pay tracker for casual security work across multiple employers.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://rosterme.netlify.app"),
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.png", sizes: "48x48" }], apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "ShiftDesk",
    description: "Shifts, rest gaps and pay across every employer.",
    url: "/",
    siteName: "ShiftDesk",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ShiftDesk" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ShiftDesk", description: "Shifts, rest gaps and pay across every employer.", images: ["/og.png"] },
  appleWebApp: { capable: true, title: "ShiftDesk", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" data-theme="base" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        {/* Apply the saved theme before first paint so there is no flash */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=JSON.parse(localStorage.getItem('shiftdesk-roster-v2')||'{}').state;if(t&&t.theme)document.documentElement.dataset.theme=t.theme}catch(e){}",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});",
          }}
        />
      </head>
      <body className="min-h-dvh bg-zinc-950 font-sans text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
