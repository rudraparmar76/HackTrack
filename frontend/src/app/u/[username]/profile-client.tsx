"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { getStatusColor, getPlatformColor } from "@/lib/utils";
import {
  Github,
  Linkedin,
  Twitter,
  Trophy,
  Flame,
  Target,
  BarChart3,
  Calendar,
  Award,
  Share2,
  Lock,
  Rocket,
  Zap,
  Moon,
  Wind,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  display_name: string;
  username: string;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  created_at: string;
  stats: {
    total_participated: number;
    wins: number;
    win_rate: string;
    platforms: string[];
    top_domains: string[];
    streak: number;
  };
  recent_hackathons: {
    name: string;
    status: string;
    placement: string | null;
    platform: string | null;
    date?: string;
  }[];
}

interface Achievement {
  id: string;
  icon: React.ReactNode;
  label: string;
  unlocked: boolean;
  requirement?: string;
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}


export default function PublicProfileClient({
  profileData,
}: {
  profileData: ProfileData;
}) {
  const profile = profileData;
  const avatarColor = hashColor(profile.username);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        
        if (userProfile?.username === profileData.username) {
          setIsOwner(true);
        }
      }
    };
    getUser();
  }, []);

  // Build achievements based on stats
  const achievements: Achievement[] = [
    {
      id: "first-launch",
      icon: <Rocket className="w-4 h-4" />,
      label: "First Launch",
      unlocked: profile.stats.total_participated >= 1,
      requirement: "Complete 1 hackathon",
    },
    {
      id: "on-the-board",
      icon: <Trophy className="w-4 h-4" />,
      label: "On The Board",
      unlocked: profile.stats.wins >= 1,
      requirement: "Win 1 hackathon",
    },
    {
      id: "hat-trick",
      icon: <Zap className="w-4 h-4" />,
      label: "Hat Trick",
      unlocked: profile.stats.wins >= 3,
      requirement: "Win 3 hackathons",
    },
    {
      id: "night-owl",
      icon: <Moon className="w-4 h-4" />,
      label: "Night Owl",
      unlocked: false,
      requirement: "Submit after midnight",
    },
    {
      id: "speed-demon",
      icon: <Wind className="w-4 h-4" />,
      label: "Speed Demon",
      unlocked: false,
      requirement: "Submit 24+ hrs early",
    },
    {
      id: "serial-hacker",
      icon: <Flame className="w-4 h-4" />,
      label: "Serial Hacker",
      unlocked: profile.stats.total_participated >= 10,
      requirement: "Complete 10 hackathons",
    },
  ];

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "✓ Link copied to clipboard",
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-void)" }}
    >
      {/* TOP NAVBAR — 52px */}
      <nav
        className="sticky top-0 z-40 border-b"
        style={{
          height: "52px",
          backgroundColor: "rgba(4, 4, 15, 0.8)",
          borderColor: "var(--border-glow)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="h-full flex items-center justify-between px-6 max-w-full">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="sm" showText={true} />
          </Link>

          {/* Right: Sign in or User Status */}
          {!currentUser ? (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded border text-sm font-mono"
              style={{
                borderColor: "var(--border-glow)",
                color: "var(--text-primary)",
                backgroundColor: "transparent",
              }}
            >
              Sign in
            </Link>
          ) : (
            <div
              className="text-xs font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              👤{profile.display_name || profile.username}
            </div>
          )}
        </div>
      </nav>

      {/* PROFILE HERO SECTION */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(123,47,255,0.08) 0%, transparent 100%)`,
        }}
      >
        <div
          className="relative max-w-[900px] mx-auto"
          style={{
            padding: "60px 40px 40px 40px",
          }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-12">
            {/* LEFT SIDE: Profile Info */}
            <div className="flex flex-col items-start gap-6">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{
                  background: `linear-gradient(135deg, var(--purple-dim), var(--bg-card))`,
                  border: "2px solid var(--border-glow)",
                  boxShadow: "var(--glow-md)",
                  color: `${avatarColor}`,
                }}
              >
                {getInitials(profile.display_name)}
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {profile.display_name}
                </h1>

                {/* Username */}
                <p
                  className="font-mono text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  @{profile.username}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p
                  className="font-mono text-sm max-w-[400px]"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: "1.7",
                  }}
                >
                  {profile.bio}
                </p>
              )}

              {/* Social Links Row */}
              <div className="flex gap-4">
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all hover:drop-shadow-[0_0_8px_var(--glow-sm)]"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    <Github className="w-4.5 h-4.5" />
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all hover:drop-shadow-[0_0_8px_var(--glow-sm)]"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    <Linkedin className="w-4.5 h-4.5" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all hover:drop-shadow-[0_0_8px_var(--glow-sm)]"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }
                  >
                    <Twitter className="w-4.5 h-4.5" />
                  </a>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Stats Grid 2×2 */}
            <div className="grid grid-cols-2 gap-4 min-w-80">
              {/* TOTAL */}
              <div
                className="rounded border p-4"
                style={{
                  backgroundColor: "rgba(4, 4, 15, 0.4)",
                  borderColor: "var(--border-glow)",
                  boxShadow: "var(--glow-sm)",
                }}
              >
                <div
                  className="font-bold text-2xl text-center font-mono pixel"
                  style={{ color: "var(--cyan-accent)" }}
                >
                  {profile.stats.total_participated}
                </div>
                <div
                  className="text-[10px] text-center uppercase tracking-widest mt-1 font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Total
                </div>
              </div>

              {/* WINS */}
              <div
                className="rounded border p-4"
                style={{
                  backgroundColor: "rgba(4, 4, 15, 0.4)",
                  borderColor: "var(--border-glow)",
                  boxShadow: "var(--glow-sm)",
                }}
              >
                <div
                  className="font-bold text-2xl text-center font-mono pixel"
                  style={{ color: "var(--gold)" }}
                >
                  {profile.stats.wins}
                </div>
                <div
                  className="text-[10px] text-center uppercase tracking-widest mt-1 font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Wins
                </div>
              </div>

              {/* WIN RATE */}
              <div
                className="rounded border p-4"
                style={{
                  backgroundColor: "rgba(4, 4, 15, 0.4)",
                  borderColor: "var(--border-glow)",
                  boxShadow: "var(--glow-sm)",
                }}
              >
                <div
                  className="font-bold text-2xl text-center font-mono pixel"
                  style={{ color: "var(--gold)" }}
                >
                  {profile.stats.win_rate}
                </div>
                <div
                  className="text-[10px] text-center uppercase tracking-widest mt-1 font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Win Rate
                </div>
              </div>

              {/* STREAK */}
              <div
                className="rounded border p-4"
                style={{
                  backgroundColor: "rgba(4, 4, 15, 0.4)",
                  borderColor: "var(--border-glow)",
                  boxShadow: "var(--glow-sm)",
                }}
              >
                <div
                  className="font-bold text-2xl text-center font-mono pixel"
                  style={{ color: "var(--cyan-accent)" }}
                >
                  {profile.stats.streak}
                </div>
                <div
                  className="text-[10px] text-center uppercase tracking-widest mt-1 font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Streak
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        className="max-w-[900px] mx-auto"
        style={{
          padding: "60px 40px 80px 40px",
        }}
      >
        {/* ACHIEVEMENTS SECTION */}
        {achievements.some((a) => a.unlocked) && (
          <div className="mb-16">
            <h2
              className="mb-6 text-sm font-mono font-semibold uppercase tracking-wider"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              // ACHIEVEMENTS
            </h2>

            <div className="flex flex-wrap gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2 rounded-sm border px-4 py-2 transition-all"
                  style={{
                    background: "rgba(123, 47, 255, 0.1)",
                    borderColor: "var(--border-glow)",
                    opacity: achievement.unlocked ? 1 : 0.4,
                    filter: achievement.unlocked ? "grayscale(0)" : "grayscale(1)",
                    boxShadow: achievement.unlocked ? "var(--glow-sm)" : "none",
                  }}
                >
                  {!achievement.unlocked && (
                    <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                  )}
                  {achievement.unlocked && (
                    <span style={{ color: "var(--cyan-accent)" }}>
                      {achievement.icon}
                    </span>
                  )}
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {achievement.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT HACKATHONS SECTION */}
        {profile.recent_hackathons.length > 0 && (
          <div>
            <h2
              className="mb-6 text-sm font-mono font-semibold uppercase tracking-wider"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              // RECENT HACKATHONS
            </h2>

            <div className="space-y-3">
              {profile.recent_hackathons.slice(0, 6).map((hackathon, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border p-5 transition-all hover:border-[var(--purple-primary)] hover:shadow-[var(--glow-sm)]"
                  style={{
                    backgroundColor: "rgba(4, 4, 15, 0.4)",
                    borderColor: "var(--border-glow)",
                  }}
                >
                  {/* Left: Platform + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {hackathon.platform && (
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-semibold uppercase ${getPlatformColor(
                          hackathon.platform
                        )}`}
                      >
                        {hackathon.platform}
                      </span>
                    )}
                    <span
                      className="text-sm font-mono font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hackathon.name}
                    </span>
                  </div>

                  {/* Right: Status + Placement */}
                  <div className="flex items-center gap-3 ml-4">
                    {hackathon.placement && (
                      <span
                        className="shrink-0 text-xs font-mono font-semibold"
                        style={{ color: "var(--gold)" }}
                      >
                        🥇 {hackathon.placement}
                      </span>
                    )}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-semibold border ${getStatusColor(
                        hackathon.status
                      )}`}
                    >
                      {hackathon.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {profile.recent_hackathons.length === 0 && (
          <div className="text-center py-16">
            <Trophy
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "var(--text-secondary)", opacity: 0.3 }}
            />
            <p
              className="text-sm font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              No hackathon history yet
            </p>
          </div>
        )}
      </div>

      {/* SHARE BUTTON — Fixed bottom-right, owner only */}
      {isOwner && (
        <button
          onClick={handleShareProfile}
          className="fixed bottom-8 right-8 px-4 py-2.5 rounded text-sm font-mono transition-all hover:shadow-lg"
          style={{
            background: "var(--purple-primary)",
            color: "var(--text-primary)",
            boxShadow: "var(--glow-md)",
          }}
        >
          ⬡ Share Profile
        </button>
      )}
    </div>
  );
}
