import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: {
    default: "HackTrack — Your Hackathon Command Center",
    template: "%s | HackTrack",
  },
  description:
    "Discover hackathons, auto-import details, track deadlines, build your team, and showcase your wins. The all-in-one platform for serious hackers.",
  keywords: [
    "hackathon tracker",
    "hackathon finder",
    "devfolio",
    "unstop",
    "devpost",
    "hackathon deadlines",
    "hackathon team",
    "coding competition",
    "hackathon India",
  ],
  authors: [{ name: "HackTrack" }],
  creator: "HackTrack",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://hack-track.tech",
    siteName: "HackTrack",
    title: "HackTrack — Your Hackathon Command Center",
    description: "Discover, track and win hackathons. Auto-import from Devfolio, Unstop, Devpost.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HackTrack — Your Hackathon Command Center",
    description: "Discover, track and win hackathons.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon_io/favicon.ico",
    shortcut: "/favicon_io/favicon-16x16.png",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
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
      </head>
      <body className="min-h-screen bg-[#0F1117]">
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
