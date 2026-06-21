import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import CookieConsent from "@/components/ui/CookieConsent";
import InstallPrompt from "@/components/ui/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ui/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodFlow - Your Daily Mood Journal",
  description: "Track your emotions, understand your patterns, and improve your well-being with MoodFlow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoodFlow",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "MoodFlow - Daily Mood Journal",
    description: "Track your emotions, understand your patterns, and improve your well-being",
    siteName: "MoodFlow",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F0F14",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* PWA Icons */}
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MoodFlow" />
        <meta name="application-name" content="MoodFlow" />
        <meta name="msapplication-TileColor" content="#7C3AED" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <CookieConsent />
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
