"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Terminal,
  Search,
  ExternalLink,
  Bookmark,
  Clock,
  Trophy,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { getPlatformColor, daysUntil, formatDate } from "@/lib/utils";

type PublicHackathon = {
  id: string;
  name: string;
  platform: string | null;
  banner_url: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  prize_pool: string | null;
  tags: string[] | null;
  source_url: string;
  status: string;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "devfolio", label: "Devfolio" },
  { value: "devpost", label: "DevPost" },
  { value: "unstop", label: "Unstop" },
  { value: "dorahacks", label: "DoraHacks" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "deadline", label: "Deadline (Soonest)" },
  { value: "prize", label: "Prize Pool" },
];

function DeadlineBadge({ date }: { date: string | null }) {
  const days = daysUntil(date);
  if (days === null) return null;

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#454D66]/20 text-[#7A8099]">
        <Clock className="w-3 h-3" />
        Closed
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
        <Clock className="w-3 h-3" />
        Last Day!
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        <Clock className="w-3 h-3" />
        {days}d left
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EF9F27]/20 text-[#EF9F27] border border-[#EF9F27]/30">
        <Clock className="w-3 h-3" />
        {days}d left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/20">
      <Clock className="w-3 h-3" />
      {days}d left
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="hack-card rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-[#252A3A]" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-[#252A3A] rounded" />
        <div className="h-4 w-1/2 bg-[#252A3A] rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#252A3A] rounded-full" />
          <div className="h-6 w-20 bg-[#252A3A] rounded-full" />
        </div>
        <div className="h-10 w-full bg-[#252A3A] rounded-lg" />
      </div>
    </div>
  );
}

function HackathonCard({
  hackathon,
  onTrack,
  isTracking,
}: {
  hackathon: PublicHackathon;
  onTrack: (h: PublicHackathon) => void;
  isTracking: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="hack-card rounded-2xl overflow-hidden group flex flex-col"
    >
      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-br from-[#1A1F2E] to-[#252A3A] overflow-hidden">
        {hackathon.banner_url ? (
          <Image
            src={hackathon.banner_url}
            alt={hackathon.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Terminal className="w-12 h-12 text-[#2A3045]" />
          </div>
        )}
        {/* Platform badge */}
        {hackathon.platform && (
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${getPlatformColor(hackathon.platform)}`}
            >
              {hackathon.platform}
            </span>
          </div>
        )}
        {/* Deadline badge */}
        <div className="absolute top-3 right-3">
          <DeadlineBadge date={hackathon.registration_deadline} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-[#E8EAF0] mb-1.5 line-clamp-2 leading-snug group-hover:text-[#00FF87] transition-colors">
          {hackathon.name}
        </h3>

        {hackathon.description && (
          <p className="text-xs text-[#7A8099] mb-3 line-clamp-2 leading-relaxed">
            {hackathon.description}
          </p>
        )}

        {/* Prize */}
        {hackathon.prize_pool && (
          <div className="flex items-center gap-1.5 mb-3">
            <Trophy className="w-3.5 h-3.5 text-[#EF9F27]" />
            <span className="text-sm font-semibold text-[#EF9F27]">
              {hackathon.prize_pool}
            </span>
          </div>
        )}

        {/* Tags */}
        {hackathon.tags && hackathon.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {hackathon.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#252A3A] text-[#7A8099] border border-[#2A3045]"
              >
                {tag}
              </span>
            ))}
            {hackathon.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#252A3A] text-[#7A8099]">
                +{hackathon.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="text-xs text-[#7A8099] mb-4 mt-auto">
          {hackathon.registration_deadline && (
            <span>Deadline: {formatDate(hackathon.registration_deadline)}</span>
          )}
          {!hackathon.registration_deadline && hackathon.end_date && (
            <span>Ends: {formatDate(hackathon.end_date)}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => onTrack(hackathon)}
            disabled={isTracking}
            className="flex-1 gap-1.5 bg-[#00FF87] text-[#0F1117] hover:bg-[#00FF87]/90 font-semibold text-xs h-9 shadow-sm shadow-[#00FF87]/10 hover:shadow-[#00FF87]/20 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {isTracking ? "Tracking..." : "Track This"}
          </Button>
          <a
            href={hackathon.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="h-9 px-3 border-[#2A3045] hover:bg-[#1A1F2E] text-[#7A8099] hover:text-[#E8EAF0]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [hackathons, setHackathons] = useState<PublicHackathon[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchHackathons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort,
        status: "open",
      });
      if (platform !== "all") params.set("platform", platform);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`${API_URL}/api/public/hackathons?${params}`);
      const data = await res.json();
      setHackathons(data.hackathons || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error("Failed to fetch hackathons:", error);
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, platform, searchQuery]);

  useEffect(() => {
    fetchHackathons();
  }, [fetchHackathons]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTrack = async (hackathon: PublicHackathon) => {
    // Check auth
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    setTrackingId(hackathon.id);
    try {
      const res = await fetch(`${API_URL}/api/hackathons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: hackathon.name,
          url: hackathon.source_url,
          platform: hackathon.platform,
          banner_url: hackathon.banner_url,
          description: hackathon.description,
          start_date: hackathon.start_date,
          end_date: hackathon.end_date,
          registration_deadline: hackathon.registration_deadline,
          prize_pool: hackathon.prize_pool,
          status: "interested",
        }),
      });

      if (res.ok) {
        // Show success — redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        alert(data.error || "Failed to track hackathon");
      }
    } catch {
      alert("Failed to track hackathon. Please try again.");
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0F1117]/80 border-b border-[#1E2330]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center">
              <Terminal className="w-4.5 h-4.5 text-[#00FF87]" />
            </div>
            <span className="text-lg font-bold text-[#E8EAF0]">
              Hack<span className="text-[#00FF87]">Track</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="outline"
                className="border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0] text-sm"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#00FF87] text-[#0F1117] hover:bg-[#00FF87]/90 font-semibold text-sm gap-1.5">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-[#00FF87]/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-sm font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Live Hackathons</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#E8EAF0] mb-3">
              Discover{" "}
              <span className="glow-text">Open Hackathons</span>
            </h1>
            <p className="text-[#7A8099] text-base max-w-xl mx-auto">
              Browse hackathons from Devfolio, DevPost, Unstop & more.
              Track the ones you love.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#454D66]" />
            <input
              type="text"
              placeholder="Search hackathons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1F2E] border border-[#1E2330] text-[#E8EAF0] text-sm placeholder-[#454D66] focus:outline-none focus:border-[#00FF87]/40 focus:ring-1 focus:ring-[#00FF87]/20 transition-all"
            />
          </div>

          <div className="flex w-full sm:w-auto gap-3 flex-col xs:flex-row sm:items-center sm:ml-auto">
            {/* Platform filter */}
            <div className="flex-1 sm:flex-none">
              <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px] bg-[#1A1F2E] border-[#1E2330] text-[#E8EAF0] text-sm h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#454D66] hidden sm:block" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2E] border-[#1E2330]">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[#E8EAF0] text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex-1 sm:flex-none">
              <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] bg-[#1A1F2E] border-[#1E2330] text-[#E8EAF0] text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2E] border-[#1E2330]">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[#E8EAF0] text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Count */}
          {!loading && (
            <span className="text-xs text-[#7A8099] ml-0 sm:ml-auto pt-1 sm:pt-0 w-full sm:w-auto text-center sm:text-right hidden sm:block">
              {pagination.total} hackathon{pagination.total !== 1 ? "s" : ""} found
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : hackathons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Terminal className="w-16 h-16 text-[#2A3045] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#E8EAF0] mb-2">
              No hackathons found
            </h3>
            <p className="text-sm text-[#7A8099] max-w-md mx-auto">
              {searchQuery || platform !== "all"
                ? "Try adjusting your filters or search query."
                : "Hackathons are being scraped. Check back in a bit!"}
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${platform}-${sort}-${searchQuery}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {hackathons.map((h) => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    onTrack={handleTrack}
                    isTracking={trackingId === h.id}
                  />
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0] gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                          page === pageNum
                            ? "bg-[#00FF87] text-[#0F1117]"
                            : "text-[#7A8099] hover:bg-[#1A1F2E] hover:text-[#E8EAF0]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0] gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1E2330] py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm text-[#7A8099]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00FF87]" />
            <span>HackTrack</span>
          </div>
          <p>Built with ❤️ for hackers</p>
        </div>
      </footer>
    </div>
  );
}
