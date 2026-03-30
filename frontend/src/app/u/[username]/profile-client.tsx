"use client";

import { useEffect, useState } from "react";
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
  MapPin,
  ExternalLink,
  Award,
  Loader2,
} from "lucide-react";

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
  }[];
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-void)" }}>
      {/* Trophy hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(123,47,255,0.08) 0%, transparent 70%)" }} />

        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-10">
          {/* Trophy Illustration */}
          <div className="flex justify-center mb-6">
            <svg width="96" height="96" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.3))" }}>
              {/* Pedestal */}
              <rect x="35" y="95" width="50" height="10" rx="2" fill="#4a1a99" stroke="#7b2fff" strokeWidth="1" />
              <rect x="45" y="85" width="30" height="12" rx="1" fill="#4a1a99" stroke="#7b2fff" strokeWidth="1" />
              {/* Trophy stem */}
              <rect x="55" y="70" width="10" height="17" fill="#ffd700" opacity="0.8" />
              {/* Trophy cup */}
              <path d="M35 25 C35 25, 35 65, 60 70 C85 65, 85 25, 85 25 Z" fill="rgba(255,215,0,0.15)" stroke="#ffd700" strokeWidth="2" />
              {/* Trophy handles */}
              <path d="M35 32 C25 32, 20 45, 30 55 C32 56, 35 52, 35 52" stroke="#ffd700" strokeWidth="2" fill="none" />
              <path d="M85 32 C95 32, 100 45, 90 55 C88 56, 85 52, 85 52" stroke="#ffd700" strokeWidth="2" fill="none" />
              {/* Trophy rim */}
              <line x1="33" y1="25" x2="87" y2="25" stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round" />
              {/* Star on trophy */}
              <path d="M60 38 L63 47 L72 47 L65 52 L67 61 L60 56 L53 61 L55 52 L48 47 L57 47 Z" fill="#ffd700" opacity="0.9" />
              {/* Sparkle stars */}
              <circle cx="25" cy="20" r="2" fill="#ffd700" style={{ animation: "sparkle-float 2s ease-in-out 0s infinite" }} />
              <circle cx="95" cy="15" r="1.5" fill="#ffd700" style={{ animation: "sparkle-float 2s ease-in-out 0.5s infinite" }} />
              <circle cx="15" cy="50" r="1.5" fill="#7b2fff" style={{ animation: "sparkle-float 2.5s ease-in-out 1s infinite" }} />
              <circle cx="105" cy="45" r="2" fill="#7b2fff" style={{ animation: "sparkle-float 2.5s ease-in-out 0.3s infinite" }} />
              <circle cx="42" cy="10" r="1" fill="#ffd700" style={{ animation: "sparkle-float 1.8s ease-in-out 0.7s infinite" }} />
              <circle cx="78" cy="8" r="1" fill="#ffd700" style={{ animation: "sparkle-float 1.8s ease-in-out 1.2s infinite" }} />
            </svg>
          </div>

          {/* Avatar + Info */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-5 ring-4 ring-white/5 shadow-lg"
              style={{ backgroundColor: avatarColor + "22", color: avatarColor }}
            >
              {getInitials(profile.display_name)}
            </div>

            <h1 className="text-3xl font-bold text-[#E8EAF0] mb-1 tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm font-mono mb-3" style={{ color: "var(--text-secondary)" }}>
              @{profile.username}
            </p>

            {profile.bio && (
              <p className="text-sm max-w-md leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
                {profile.bio}
              </p>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-glow)", color: "var(--text-secondary)" }}
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-glow)", color: "var(--text-secondary)" }}
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {profile.twitter_url && (
                <a
                  href={profile.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-glow)", color: "var(--text-secondary)" }}
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Content */}
      <div className="max-w-3xl mx-auto px-6 pb-16 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="hack-card rounded-xl p-4 text-center group hover:border-[#00D4FF]/20 transition-colors">
            <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-[#00D4FF]" />
            </div>
            <p className="text-2xl font-bold text-[#E8EAF0] font-mono">
              {profile.stats.total_participated}
            </p>
            <p className="text-[11px] text-[#7A8099] mt-0.5 uppercase tracking-wider">Hackathons</p>
          </div>

          <div className="hack-card rounded-xl p-4 text-center group hover:border-[#FFD700]/20 transition-colors">
            <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
              <Trophy className="w-4.5 h-4.5 text-[#FFD700]" />
            </div>
            <p className="text-2xl font-bold text-[#E8EAF0] font-mono">
              {profile.stats.wins}
            </p>
            <p className="text-[11px] text-[#7A8099] mt-0.5 uppercase tracking-wider">Wins</p>
          </div>

          <div className="hack-card rounded-xl p-4 text-center group hover:border-[#00e5ff]/20 transition-colors">
            <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#00e5ff]/10 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-[#00e5ff]" />
            </div>
            <p className="text-2xl font-bold text-[#E8EAF0] font-mono">
              {profile.stats.win_rate}
            </p>
            <p className="text-[11px] text-[#7A8099] mt-0.5 uppercase tracking-wider">Win Rate</p>
          </div>

          <div className="hack-card rounded-xl p-4 text-center group hover:border-[#EF9F27]/20 transition-colors">
            <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#EF9F27]/10 flex items-center justify-center">
              <Flame className="w-4.5 h-4.5 text-[#EF9F27]" />
            </div>
            <p className="text-2xl font-bold text-[#E8EAF0] font-mono">
              {profile.stats.streak}
            </p>
            <p className="text-[11px] text-[#7A8099] mt-0.5 uppercase tracking-wider">
              Mo. Streak
            </p>
          </div>
        </div>

        {/* Platforms */}
        {profile.stats.platforms.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#7A8099] uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Platforms
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.stats.platforms.map((p) => (
                <span
                  key={p}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getPlatformColor(p)} border border-white/5`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Domains */}
        {profile.stats.top_domains.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#7A8099] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Award className="w-3.5 h-3.5" /> Top Domains
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.stats.top_domains.map((d) => (
                <span
                  key={d}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/15"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Hackathons */}
        {profile.recent_hackathons.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#7A8099] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Recent Hackathons
            </h2>
            <div className="space-y-2">
              {profile.recent_hackathons.map((h, i) => (
                <div
                  key={i}
                  className="hack-card rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  {/* Platform badge */}
                  {h.platform && (
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium ${getPlatformColor(h.platform)}`}
                    >
                      {h.platform}
                    </span>
                  )}
                  {/* Name */}
                  <span className="flex-1 text-sm font-medium text-[#E8EAF0] truncate">
                    {h.name}
                  </span>
                  {/* Placement */}
                  {h.placement && (
                    <span className="shrink-0 text-xs font-mono text-[#FFD700]/80 bg-[#FFD700]/10 px-2 py-0.5 rounded">
                      {h.placement}
                    </span>
                  )}
                  {/* Status */}
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium border ${getStatusColor(h.status)}`}
                  >
                    {h.status?.charAt(0).toUpperCase() + h.status?.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {profile.recent_hackathons.length === 0 && profile.stats.total_participated === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-[#1E2330] mx-auto mb-3" />
            <p className="text-sm text-[#7A8099]">
              No hackathon history yet
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-[#1E2330]">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#454D66] hover:text-[#00e5ff] transition-colors"
          >
            Built with HackTrack <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
