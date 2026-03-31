import { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicProfileClient from "./profile-client";

interface Props {
  params: Promise<{ username: string }>;
}

async function getProfile(username: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/public/profile/${username}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return { title: "Profile Not Found — HackTrack" };
  }

  const name = profile.display_name || username;
  const participated = profile.stats?.total_participated || 0;
  const wins = profile.stats?.wins || 0;
  const domains = (profile.stats?.top_domains || []).slice(0, 3).join(", ");
  const description = `${wins} wins · ${participated} hackathons · ${domains ? `Top domains: ${domains}` : ""}`.trim();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.hack-track.tech";
  const ogImageUrl = `${siteUrl}/api/og/profile?username=${encodeURIComponent(username)}`;

  return {
    title: `${name} (@${username}) — HackTrack`,
    description,
    openGraph: {
      title: `${name} (@${username}) — HackTrack`,
      description,
      type: "profile",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name}'s hackathon profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s HackTrack Profile`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  return <PublicProfileClient profileData={profile} />;
}
