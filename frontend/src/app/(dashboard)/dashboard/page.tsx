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
  { label: "Wins 🏆", icon: Trophy, key: "wins", accent: "text-[#FFD700]", bg: "bg-[#FFD700]/10" },
  { label: "Participated 📝", icon: Users, key: "participated", accent: "text-[#00D4FF]", bg: "bg-[#00D4FF]/10" },
  { label: "Active 🔥", icon: Zap, key: "active", accent: "text-[#00FF87]", bg: "bg-[#00FF87]/10" },
  { label: "Total", icon: CheckCircle, key: "total", accent: "text-[#454D66]", bg: "bg-[#454D66]/15" },
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
    <div className="space-y-8">
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
            className="relative bg-gradient-to-r from-red-500/10 via-[#EF9F27]/10 to-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="dash-terminal mb-2">
            <span>$ hacktrack status</span>
            <span className="cursor"></span>
          </div>
          <h1 className="dash-heading">Dashboard</h1>
          <p className="text-sm text-[#8888bb] mt-2 mono">Your hackathon command center</p>
        </div>
        {profileUsername && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            className="w-full sm:w-auto gap-2 text-xs mono" style={{ borderColor: 'rgba(123,47,255,0.25)', color: '#8888bb' }}
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? "Copied!" : "Share Profile"}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`hack-card dash-card-glow rounded-xl p-4 sm:p-5 ${stat.key === "total" ? "hero-glow" : ""}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 relative z-10">
              <span className="text-xs sm:text-sm text-[#7A8099] leading-tight break-words">{stat.label}</span>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.accent}`} />
              </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-mono relative z-10 ${stat.key === "total" ? "glow-text" : "text-[#E8EAF0]"}`}>
              {apiStats[stat.key as keyof typeof apiStats]}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="purple-tabs w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <TabsList className="bg-[#0a0520] border border-purple-500/15 flex w-max sm:w-auto">
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

      {/* Hackathon Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="hack-card rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-[#1E2330] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#E8EAF0] mb-1">No hackathons yet</h3>
          <p className="text-sm text-[#7A8099] mb-6">
            {search ? "No results found. Try a different search." : "Add your first hackathon to get started!"}
          </p>
          {!search && (
            <Link href="/hackathon/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Hackathon
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((hack, i) => {
            const daysLeft = daysUntil(hack.submission_deadline);
            const countdownClass = getCountdownClass(hack.submission_deadline);
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
                      {hack.is_shared && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/20">
                          Shared
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-base text-[#E8EAF0] truncate group-hover:text-[#00FF87] transition-colors">
                        {hack.name}
                      </h3>

                      {/* Live Countdown Timers */}
                      <div className="space-y-1.5">
                        {hack.registration_deadline && (
                          <div className="flex items-center justify-between">
                            <CountdownTimer
                              deadline={hack.registration_deadline}
                              label="Registration closes"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <CountdownTimer
                            deadline={hack.submission_deadline}
                            label="Submission closes"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#7A8099]">
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
                        <div className="flex items-center gap-2 pt-1">
                          <Users className="w-3.5 h-3.5 text-[#7A8099]" />
                          <div className="flex -space-x-2">
                            {hack.team_members.slice(0, 4).map((m) => (
                              <div
                                key={m.id}
                                className="w-6 h-6 rounded-full bg-[#00FF87]/10 flex items-center justify-center text-[10px] font-bold text-[#00FF87] border-2 border-[#1A1F2E]"
                                title={m.name}
                              >
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {hack.team_members.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-[#1E2330] flex items-center justify-center text-[10px] font-medium text-[#7A8099] border-2 border-[#1A1F2E]">
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
  );
}
