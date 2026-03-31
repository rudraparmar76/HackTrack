import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SITE_URL = "https://hack-track.tech";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return entries;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op for sitemap.
      },
    },
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, updated_at, is_public")
    .eq("is_public", true)
    .not("username", "is", null);

  if (profiles?.length) {
    profiles.forEach((profile) => {
      if (!profile.username) return;
      entries.push({
        url: `${SITE_URL}/u/${profile.username}`,
        lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    });
  }

  return entries;
}
