"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { daysUntil, getStatusColor, getCountdownClass, getPlatformColor } from "@/lib/utils";
import CountdownTimer from "@/components/countdown-timer";
import {
  Trophy,
  Zap,
  CheckCircle,
  Search,
  Plus,
  Users,
  ExternalLink,
  AlertTriangle,
  X,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ProgressArc } from "@/components/ProgressArc";

interface Hackathon {
  id: string;
  name: string;
  url: string | null;
  platform: string | null;
  banner_url: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  submission_deadline: string | null;
  result_date: string | null;
  prize_pool: string | null;
  team_size_min: number | null;
  team_size_max: number | null;
  status: string;
  won: boolean;
  placement: string | null;
  created_at: string;
  user_id: string;
  is_shared?: boolean;
  team_members?: { id: string; name: string }[];
}

const statCards = [
  { label: "TOTAL", icon: CheckCircle, key: "total", accent: "text-[var(--cyan-accent)]", bg: "bg-[#00D4FF]/10", rawColor: "var(--cyan-accent)" },
  { label: "ACTIVE", icon: Zap, key: "active", accent: "text-[var(--cyan-accent)]", bg: "bg-[#00D4FF]/10", rawColor: "var(--cyan-accent)" },
  { label: "SUBMITTED", icon: Users, key: "participated", accent: "text-[var(--cyan-accent)]", bg: "bg-[#00D4FF]/10", rawColor: "var(--cyan-accent)" },
  { label: "WON", icon: Trophy, key: "wins", accent: "text-[#FFD700]", bg: "bg-[#FFD700]/10", rawColor: "#FFD700" },
];

export default function DashboardPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [apiStats, setApiStats] = useState({ total: 0, active: 0, participated: 0, wins: 0 });
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBannerDismissed(sessionStorage.getItem("ht-urgent-dismissed") === "1");
    }
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("ht-urgent-dismissed", "1");
  };

  useEffect(() => {
    fetchHackathons();
    fetchStats();
    fetchUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsername = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const profile = await res.json();
        setProfileUsername(profile.username || null);
      }
    } catch {}
  };

  const handleShareProfile = async () => {
    if (!profileUsername) return;
    const url = `https://www.hack-track.tech/u/${profileUsername}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast({ title: "Copied!", description: "Profile link copied to clipboard" });
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setApiStats(await res.json());
      }
    } catch {}
  };

  const fetchHackathons = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHackathons([]);
      setLoading(false);
      return;
    }

    const { data: ownedHacks } = await supabase
      .from("hackathons")
      .select("*, team_members(id, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const owned = (ownedHacks || []).map((hack) => ({ ...hack, is_shared: false }));
    const shared: Hackathon[] = [];

    if (user.email) {
      const { data: teamMemberships } = await supabase
        .from("team_members")
        .select("hackathon_id")
        .eq("email", user.email.toLowerCase());

      const sharedIds = (teamMemberships || [])
        .map((row: { hackathon_id: string }) => row.hackathon_id)
        .filter((id: string) => Boolean(id));

      const ownedIdSet = new Set(owned.map((hack) => hack.id));
      const uniqueSharedIds = Array.from(new Set(sharedIds)).filter((id) => !ownedIdSet.has(id));

      if (uniqueSharedIds.length > 0) {
        const { data: sharedHacks } = await supabase
          .from("hackathons")
          .select("*, team_members(id, name)")
          .in("id", uniqueSharedIds)
          .order("created_at", { ascending: false });

        shared.push(...(sharedHacks || []).map((hack) => ({ ...hack, is_shared: true })));
      }
    }

    const allHackathons = [...owned, ...shared];
    setHackathons(allHackathons);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = hackathons;
    if (filter !== "all") {
      result = result.filter((h) => h.status === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.platform?.toLowerCase().includes(q) ||
          h.description?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          return (
            new Date(a.submission_deadline || "9999").getTime() -
            new Date(b.submission_deadline || "9999").getTime()
          );
        case "added":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "prize":
          return (b.prize_pool || "").localeCompare(a.prize_pool || "");
        default:
          return 0;
      }
    });
    return result;
  }, [hackathons, filter, search, sortBy]);

  return (
    <div className="space-y-4">
      {/* Urgent Deadline Banner */}
      {!bannerDismissed && (() => {
        const now = Date.now();
        const threshold = 48 * 60 * 60 * 1000;
        const urgent: { name: string; label: string; deadline: string }[] = [];
        hackathons.forEach((h) => {
          if (h.registration_deadline) {
            const diff = new Date(h.registration_deadline).getTime() - now;
            if (diff > 0 && diff <= threshold) urgent.push({ name: h.name, label: "registration", deadline: h.registration_deadline });
          }
          if (h.submission_deadline) {
            const diff = new Date(h.submission_deadline).getTime() - now;
            if (diff > 0 && diff <= threshold) urgent.push({ name: h.name, label: "submission", deadline: h.submission_deadline });
          }
        });
        if (urgent.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-r from-red-500/10 via-[#EF9F27]/10 to-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mx-[40px] mt-[32px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-400 mb-0.5">
                  {urgent.length} deadline{urgent.length > 1 ? "s" : ""} in the next 48 hours
                </p>
                <p className="text-[11px] text-[#7A8099] truncate">
                  {urgent.map((u) => `${u.name} (${u.label})`).join(", ")}
                </p>
              </div>
              <button onClick={dismissBanner} className="p-1 text-[#454D66] hover:text-[#7A8099] transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      })()}

      {/* Page title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ padding: "32px 40px 0" }}>
        <div>
          <div className="dash-terminal mb-2">
            <span>$ hacktrack --dashboard</span>
            <span className="cursor"></span>
          </div>
          <h1 className="dash-heading" style={{ fontSize: "20px" }}>DASHBOARD</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 font-mono flex items-center">
            Welcome back, {profileUsername || "hacker"} <span className="w-2 h-[14px] bg-[var(--text-secondary)] animate-pulse inline-block ml-1" />
          </p>
        </div>
        {profileUsername && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            className="w-full sm:w-auto gap-2 text-xs mono hover:text-white" style={{ borderColor: 'rgba(123,47,255,0.25)', color: '#8888bb', background: 'transparent' }}
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? "Copied!" : "Share Profile"}
          </Button>
        )}
      </div>

      <div className="px-[40px]">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] my-[24px]">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`hack-card dash-card-glow rounded-xl ${stat.key === "total" ? "hero-glow" : ""}`}
              style={{ padding: "20px" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 relative z-10">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.1em" }} className="leading-tight break-words">{stat.label}</span>
                <div className={`w-8 h-8 shrink-0 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.accent}`} />
                </div>
              </div>
              <p className="relative z-10" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "22px", color: stat.rawColor }}>
                {apiStats[stat.key as keyof typeof apiStats]}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-[24px]">
          <Tabs value={filter} onValueChange={setFilter} className="purple-tabs w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <TabsList className="bg-[#0a0520] border border-[rgba(123,47,255,0.15)] flex w-max sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="building">Building</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="won">Won 🏆</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto lg:ml-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#454D66]" />
              <Input
                placeholder="Search hackathons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full lg:w-64"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="added">Date Added</SelectItem>
                <SelectItem value="prize">Prize Pool</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hackathon Grid wrapper */}
        <div>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.15em", borderBottom: "1px solid rgba(123,47,255,0.2)", paddingBottom: "8px", marginBottom: "16px" }} className="uppercase">
            <span style={{ color: "var(--purple-primary)" }}>// </span>
            {filter === "all" ? "TRACKED" : filter.toUpperCase()} HACKATHONS
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="hack-card rounded-xl h-72 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center flex flex-col items-center justify-center my-8" style={{ padding: "60px 20px" }}>
              <div className="w-20 h-20 mb-6 flex items-center justify-center text-[var(--purple-primary)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" className="w-full h-full drop-shadow-[0_0_12px_var(--cyan-accent)]">
                  {/* Rocket SVG */}
                  <path d="M4 14L2 16V22H8L10 20" stroke="var(--purple-primary)" />
                  <path d="M14 2C14 2 22 2 22 10C22 15 18 19 14 19C10 19 8 17 8 13C8 9 10 2 14 2Z" fill="rgba(123,47,255,0.1)" stroke="var(--cyan-accent)" />
                  <path d="M14 6C15.1046 6 16 6.89543 16 8C16 9.10457 15.1046 10 14 10C12.8954 10 12 9.10457 12 8C12 6.89543 12.8954 6 14 6Z" fill="var(--cyan-accent)" />
                  <path d="M10 20L4 14" stroke="var(--purple-primary)" />
                  <path d="M8 22C8 22 10 25 14 26C18 25 18 22 18 22" stroke="var(--gold,#FFD700)" />
                  <path d="M8 12L4 10V4H10L12 8" stroke="var(--purple-primary)" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", color: "white" }} className="mb-2">No hackathons tracked yet</h3>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-secondary)" }} className="mb-6 max-w-sm">
                Paste a hackathon URL to get started, or browse the discovery feed
              </p>
              <div className="flex gap-4">
                <Link href="/hackathon/new">
                  <Button style={{ background: "var(--purple-primary)", color: "white" }} className="gap-2 font-mono text-xs hover:opacity-90">
                    Track a hackathon
                  </Button>
                </Link>
                <Link href="/discover">
                  <Button variant="outline" className="gap-2 font-mono text-xs hover:bg-white/5" style={{ borderColor: 'var(--border-glow)', color: 'var(--text-secondary)', background: 'transparent' }}>
                    Browse Discover
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-[40px]">
              {filtered.map((hack, i) => {
                const daysLeft = daysUntil(hack.submission_deadline);
                const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 14;
                
                return (
                  <motion.div
                    key={hack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/hackathon/${hack.id}`}>
                      <div className={`hack-card dash-card-glow rounded-xl overflow-hidden cursor-pointer group ${hack.won ? 'ring-2 ring-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]' : ''}`}>
                        {/* Banner */}
                        <div className="relative h-36 bg-[#151820] overflow-hidden">
                          {hack.banner_url ? (
                            <img
                              src={hack.banner_url}
                              alt={hack.name}
                              className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Trophy className="w-12 h-12 text-[#1E2330]" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(hack.status)}`}>
                            {hack.status === "active" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] pulse-dot" />
                            )}
                            {hack.status.charAt(0).toUpperCase() + hack.status.slice(1)}
                          </div>
                          
                          {/* Platform */}
                          {hack.platform && (
                            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${getPlatformColor(hack.platform)}`}>
                              {hack.platform}
                            </div>
                          )}
                          
                          {/* Lightning Badge */}
                          {isUrgent && (
                            <div className="absolute bottom-3 right-3 bg-[rgba(6,3,18,0.95)] border border-[var(--gold,#FFD700)] text-[var(--gold,#FFD700)] px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono shadow-[0_0_8px_rgba(255,215,0,0.2)] flex items-center gap-1">
                              ⚡ {daysLeft} days
                            </div>
                          )}
                          
                          {hack.is_shared && (
                            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/20">
                              Shared
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                          <h3 className="font-semibold text-base text-[#E8EAF0] truncate group-hover:text-[var(--cyan-accent)] transition-colors">
                            {hack.name}
                          </h3>

                          {/* Live Countdown Timers */}
                          <div className="space-y-1.5 pt-1">
                            {hack.registration_deadline && (
                              <div className="flex items-center justify-between">
                                <CountdownTimer
                                  deadline={hack.registration_deadline}
                                  label="Reg closes"
                                />
                              </div>
                            )}
                            {hack.submission_deadline && (
                              <div className="flex items-center justify-between">
                                <CountdownTimer
                                  deadline={hack.submission_deadline}
                                  label="Sub closes"
                                />
                              </div>
                            )}
                          </div>

                          {/* Pipeline Indicator */}
                          <div className="pt-4 flex justify-center">
                            <ProgressArc stage={hack.status} size="sm" />
                          </div>

                          <div className="flex items-center gap-4 text-xs text-[#7A8099] pt-1">
                            {hack.prize_pool && (
                              <span className="flex items-center gap-1 font-mono">
                                <Trophy className="w-3.5 h-3.5" />
                                {hack.prize_pool}
                              </span>
                            )}
                            {hack.url && (
                              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[#454D66]" />
                            )}
                          </div>

                          {/* Team Avatars */}
                          {hack.team_members && hack.team_members.length > 0 && (
                            <div className="flex items-center gap-2 pt-1 border-t border-[rgba(123,47,255,0.1)] mt-2">
                              <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                              <div className="flex -space-x-2">
                                {hack.team_members.slice(0, 4).map((m) => (
                                  <div
                                    key={m.id}
                                    className="w-6 h-6 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center text-[10px] font-bold text-[var(--cyan-accent)] border-2 border-[#04040f]"
                                    title={m.name}
                                  >
                                    {m.name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {hack.team_members.length > 4 && (
                                  <div className="w-6 h-6 rounded-full bg-[rgba(6,3,18,0.5)] flex items-center justify-center text-[10px] font-medium text-[var(--text-secondary)] border-2 border-[#04040f]">
                                    +{hack.team_members.length - 4}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
