import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "HackTrack — Hackathon Command Center",
  description:
    "From discovering hackathons to tracking deadlines, building your team, and bringing home the trophy — HackTrack is your all-in-one hackathon command center.",
  keywords: ["hackathon", "tracker", "devfolio", "unstop", "devpost", "hackathon manager", "hacktrack"],
  openGraph: {
    title: "HackTrack — Hackathon Command Center",
    description: "Your all-in-one hackathon command center. Discover, track, build, and win.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F1117]">
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
