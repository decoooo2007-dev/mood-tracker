import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import CookieConsent from "@/components/ui/CookieConsent";
import InstallPrompt from "@/components/ui/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ui/ServiceWorkerRegistration";
import AppLockGate from "@/components/ui/AppLockGate";
import NotificationScheduler from "@/components/ui/NotificationScheduler";
import ThemeScript from "@/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodFlow - Your Daily Mood Journal",
  description: "Track your emotions, understand your patterns, and improve your well-being with MoodFlow",
  robots: {
    index: false,
    follow: false,
  },
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
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0F0F14",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('moodflow-theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                }
                var l = localStorage.getItem('moodflow-locale');
                if (l === 'ar') {
                  document.documentElement.dir = 'rtl';
                  document.documentElement.lang = 'ar';
                } else {
                  document.documentElement.dir = 'ltr';
                  document.documentElement.lang = 'en';
                }
              } catch (e) {}
            `,
          }}
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
      <body className="font-sans antialiased min-h-screen">
        <ThemeScript />
        <Providers>
          <AppLockGate>
            <main className="min-h-screen pb-24 md:pb-28">
              {children}
            </main>
          </AppLockGate>
          <CookieConsent />
          <InstallPrompt />
          <ServiceWorkerRegistration />
          <NotificationScheduler />
        </Providers>
      </body>
    </html>
  );
}
