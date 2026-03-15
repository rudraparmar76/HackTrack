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
import { daysUntil, hoursUntil, getStatusColor, getCountdownClass, getPlatformColor, formatDate } from "@/lib/utils";
import {
  Trophy,
  Zap,
  Calendar,
  CheckCircle,
  Search,
  Plus,
  Clock,
  Users,
  ExternalLink,
} from "lucide-react";
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
  created_at: string;
  team_members?: { id: string; name: string }[];
}

const statCards = [
  { label: "Total", icon: Trophy, key: "total", accent: "text-[#E8EAF0]", bg: "bg-[#E8EAF0]/10" },
  { label: "Active", icon: Zap, key: "active", accent: "text-[#00FF87]", bg: "bg-[#00FF87]/10" },
  { label: "Upcoming", icon: Calendar, key: "upcoming", accent: "text-[#EF9F27]", bg: "bg-[#EF9F27]/10" },
  { label: "Completed", icon: CheckCircle, key: "completed", accent: "text-[#454D66]", bg: "bg-[#454D66]/15" },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("deadline");

  useEffect(() => {
    fetchHackathons();
  }, []);

  const fetchHackathons = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: hacks } = await supabase
      .from("hackathons")
      .select("*, team_members(id, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setHackathons(hacks || []);
    setLoading(false);
  };

  const stats = useMemo(() => ({
    total: hackathons.length,
    active: hackathons.filter((h) => h.status === "active").length,
    upcoming: hackathons.filter((h) => h.status === "upcoming").length,
    completed: hackathons.filter((h) => h.status === "completed").length,
  }), [hackathons]);

  const filtered = useMemo(() => {
    let result = hackathons;
    if (filter !== "all") result = result.filter((h) => h.status === filter);
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
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Dashboard</h1>
        <p className="text-sm text-[#7A8099] mt-1">Your hackathon command center</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`hack-card rounded-xl p-5 ${stat.key === "total" ? "hero-glow" : ""}`}
          >
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-sm text-[#7A8099]">{stat.label}</span>
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.accent}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold font-mono relative z-10 ${stat.key === "total" ? "glow-text" : "text-[#E8EAF0]"}`}>
              {stats[stat.key as keyof typeof stats]}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="bg-[#1A1F2E] border border-[#1E2330]">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#454D66]" />
            <Input
              placeholder="Search hackathons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
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
                  <div className="hack-card rounded-xl overflow-hidden cursor-pointer group">
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
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-base text-[#E8EAF0] truncate group-hover:text-[#00FF87] transition-colors">
                        {hack.name}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-[#7A8099]">
                        {daysLeft !== null && (
                          <span className={`flex items-center gap-1 font-mono ${countdownClass}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {daysLeft > 0
                              ? `${daysLeft}d left`
                              : daysLeft === 0
                              ? "Today!"
                              : "Ended"}
                          </span>
                        )}
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

                      {/* Deadline */}
                      <div className="text-xs text-[#454D66] pt-1 border-t border-[#1E2330] font-mono">
                        Submission: {formatDate(hack.submission_deadline)}
                      </div>
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
