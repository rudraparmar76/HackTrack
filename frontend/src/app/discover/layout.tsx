import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Hackathons | HackTrack",
  description:
    "Browse 200+ live hackathons from Devfolio, Unstop, and Devpost. Filter by city, platform, prize pool, and mode.",
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
