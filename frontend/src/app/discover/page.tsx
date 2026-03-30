"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Menu,
  X,
  MapPin,
  Loader2,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { getPlatformColor, daysUntil, formatDate } from "@/lib/utils";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

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

/* ──── Grouped city list ──── */
const CITY_GROUPS: { label: string; cities: string[] }[] = [
  { label: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Nashik"] },
  { label: "Karnataka", cities: ["Bangalore", "Mysuru", "Hubli", "Mangalore"] },
  { label: "Delhi NCR", cities: ["Delhi", "Noida", "Gurugram", "Faridabad"] },
  { label: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Trichy"] },
  { label: "Telangana", cities: ["Hyderabad", "Warangal"] },
  { label: "West Bengal", cities: ["Kolkata"] },
  { label: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"] },
  { label: "Rajasthan", cities: ["Jaipur", "Udaipur", "Jodhpur"] },
  { label: "Other Cities", cities: ["Lucknow", "Chandigarh", "Bhopal", "Indore", "Kochi", "Goa", "Patna", "Bhubaneswar", "Guwahati", "Dehradun"] },
  { label: "International", cities: ["San Francisco", "New York", "London", "Singapore", "Dubai", "Berlin", "Toronto", "Tokyo", "Sydney"] },
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
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20">
      <Clock className="w-3 h-3" />
      {days}d left
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border-glow)" }}>
      <div className="h-40" style={{ background: "var(--bg-card-hover)" }} />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded" style={{ background: "var(--bg-card-hover)" }} />
        <div className="h-4 w-1/2 rounded" style={{ background: "var(--bg-card-hover)" }} />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
          <div className="h-6 w-20 rounded-full" style={{ background: "var(--bg-card-hover)" }} />
        </div>
        <div className="h-10 w-full rounded-lg" style={{ background: "var(--bg-card-hover)" }} />
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
      className="discover-card rounded-lg overflow-hidden group flex flex-col"
      style={{ background: "var(--bg-card)" }}
    >
      {/* Banner */}
      <div className="relative h-40 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--bg-card-hover))" }}>
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
            <Terminal className="w-12 h-12" style={{ color: "var(--purple-dim)" }} />
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
        <h3 className="text-base font-semibold text-[#E8EAF0] mb-1.5 line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors">
          {hackathon.name}
        </h3>

        {hackathon.description && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
                className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: "rgba(123,47,255,0.1)", color: "var(--text-secondary)", border: "1px solid var(--border-glow)" }}
              >
                {tag}
              </span>
            ))}
            {hackathon.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: "rgba(123,47,255,0.1)", color: "var(--text-secondary)" }}>
                +{hackathon.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="text-xs mb-4 mt-auto" style={{ color: "var(--text-secondary)" }}>
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
            className="btn-purple flex-1 gap-1.5 font-semibold text-xs h-9 mono"
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
              className="h-9 px-3"
              style={{ borderColor: "var(--border-glow)", color: "var(--text-secondary)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Main Discover Page (with URL state)
   ──────────────────────────────────────────── */
function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hackathons, setHackathons] = useState<PublicHackathon[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1") || 1);
  const [city, setCity] = useState(searchParams.get("city") || "");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /* ──── Sync state → URL params ──── */
  const syncUrl = useCallback(
    (overrides: Record<string, string | number>) => {
      const newParams = new URLSearchParams();
      const state = {
        search: searchQuery,
        platform,
        sort,
        page: String(page),
        city,
        ...Object.fromEntries(
          Object.entries(overrides).map(([k, v]) => [k, String(v)])
        ),
      };

      if (state.search) newParams.set("search", state.search);
      if (state.platform && state.platform !== "all") newParams.set("platform", state.platform);
      if (state.sort && state.sort !== "newest") newParams.set("sort", state.sort);
      if (state.page && state.page !== "1") newParams.set("page", state.page);
      if (state.city) newParams.set("city", state.city);

      const qs = newParams.toString();
      router.replace(`/discover${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchQuery, platform, sort, page, city, router]
  );

  /* ──── Fetch hackathons ──── */
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

      // Combine search query + city for smart text filtering
      let combinedSearch = searchQuery.trim();
      if (city) {
        combinedSearch = combinedSearch ? `${combinedSearch} ${city}` : city;
      }
      if (combinedSearch) params.set("search", combinedSearch);

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
  }, [page, sort, platform, searchQuery, city]);

  useEffect(() => {
    fetchHackathons();
  }, [fetchHackathons]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      syncUrl({ page: 1, search: searchQuery });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  /* ──── Near Me geolocation ──── */
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district ||
            "";

          if (detectedCity) {
            setCity(detectedCity);
            setPage(1);
            syncUrl({ city: detectedCity, page: 1 });
            toast({ title: `📍 Location detected`, description: `Showing hackathons near ${detectedCity}` });
          } else {
            toast({ title: "Location unavailable", description: "Couldn't determine your city.", variant: "destructive" });
          }
        } catch {
          toast({ title: "Location unavailable", description: "Reverse geocoding failed.", variant: "destructive" });
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast({ title: "Location unavailable", description: "Permission denied or location error.", variant: "destructive" });
        setDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const handleTrack = async (hackathon: PublicHackathon) => {
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
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-void)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(4,4,15,0.85)", borderColor: "rgba(123,47,255,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" showText />
          </Link>
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="outline"
                className="mono text-xs"
                style={{ borderColor: "rgba(123,47,255,0.3)", color: "#E8EAF0" }}
              >
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="btn-purple mono text-xs font-semibold gap-1.5">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md transition-colors"
              style={{ color: "#E8EAF0" }}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden overflow-hidden border-b backdrop-blur-xl absolute top-[73px] left-0 right-0 z-40"
            style={{ background: "rgba(4,4,15,0.95)", borderColor: "rgba(123,47,255,0.15)" }}
          >
            <div className="px-4 py-4 flex flex-col gap-3 shadow-2xl">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start" style={{ borderColor: "var(--border-glow)", color: "#E8EAF0" }}>
                  Sign In
                </Button>
              </Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="btn-purple w-full justify-start mono text-xs font-semibold gap-1.5">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="hero-nebula" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="dash-terminal justify-center mb-4">
              <span>$ hacktrack discover</span>
              <span className="cursor"></span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded card-glow text-purple-300 text-sm font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs mono">Live Hackathons</span>
            </div>
            <h1
              className="pixel text-lg sm:text-xl lg:text-2xl text-[#E8EAF0] mb-4"
              style={{ textShadow: "0 0 30px rgba(123,47,255,0.4)", lineHeight: "1.6" }}
            >
              Discover{" "}
              <span style={{ color: "var(--cyan-accent)" }}>Open Hackathons</span>
            </h1>
            <p className="text-sm mono max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Browse hackathons from Devfolio, DevPost, Unstop & more.
              Track the ones you love.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Near Me */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--purple-dim)" }} />
              <input
                type="text"
                placeholder="Search hackathons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-[#E8EAF0] text-sm placeholder-[#454D66] input-terminal transition-all mono"
              />
            </div>

            {/* Near Me button */}
            <button
              onClick={detectLocation}
              disabled={detectingLocation}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs mono font-medium transition-all whitespace-nowrap"
              style={{
                background: detectingLocation ? "rgba(123,47,255,0.15)" : "rgba(0,229,255,0.1)",
                border: "1px solid " + (detectingLocation ? "rgba(123,47,255,0.3)" : "rgba(0,229,255,0.3)"),
                color: detectingLocation ? "var(--purple-primary)" : "var(--cyan-accent)",
              }}
            >
              {detectingLocation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  📍 Near me
                </>
              )}
            </button>

            <div className="flex w-full sm:w-auto gap-3 flex-col xs:flex-row sm:items-center sm:ml-auto">
              {/* City filter */}
              <div className="flex-1 sm:flex-none">
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setPage(1);
                    syncUrl({ city: e.target.value, page: 1 });
                  }}
                  className="w-full sm:w-[180px] h-10 px-3 rounded-lg text-sm mono transition-all appearance-none"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-glow)",
                    color: city ? "#E8EAF0" : "var(--text-secondary)",
                  }}
                >
                  <option value="">All Cities</option>
                  {CITY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Platform filter */}
              <div className="flex-1 sm:flex-none">
                <Select
                  value={platform}
                  onValueChange={(v) => {
                    setPlatform(v);
                    setPage(1);
                    syncUrl({ platform: v, page: 1 });
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-[160px] text-sm h-10"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-glow)", color: "#E8EAF0" }}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 hidden sm:block" style={{ color: "var(--purple-dim)" }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", borderColor: "var(--border-glow)" }}>
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
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setSort(v);
                    setPage(1);
                    syncUrl({ sort: v, page: 1 });
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-[180px] text-sm h-10"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-glow)", color: "#E8EAF0" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", borderColor: "var(--border-glow)" }}>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[#E8EAF0] text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active filter pills */}
          {(city || (platform !== "all")) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs mono" style={{ color: "var(--text-secondary)" }}>Active filters:</span>
              {city && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mono"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "var(--cyan-accent)" }}
                >
                  <MapPin className="w-3 h-3" />
                  {city}
                  <button
                    onClick={() => {
                      setCity("");
                      setPage(1);
                      syncUrl({ city: "", page: 1 });
                    }}
                    className="ml-1 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </span>
              )}
              {platform !== "all" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mono"
                  style={{ background: "rgba(123,47,255,0.1)", border: "1px solid rgba(123,47,255,0.3)", color: "var(--purple-primary)" }}
                >
                  {platform}
                  <button
                    onClick={() => {
                      setPlatform("all");
                      setPage(1);
                      syncUrl({ platform: "all", page: 1 });
                    }}
                    className="ml-1 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Count */}
          {!loading && (
            <span className="text-xs ml-0 sm:ml-auto text-right hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              {pagination.total} hackathon{pagination.total !== 1 ? "s" : ""} found
              {city && ` near "${city}"`}
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
            <Terminal className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--purple-dim)" }} />
            <h3 className="text-lg font-semibold text-[#E8EAF0] mb-2">
              No hackathons found
            </h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              {searchQuery || platform !== "all" || city
                ? "Try adjusting your filters or search query."
                : "Hackathons are being scraped. Check back in a bit!"}
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${platform}-${sort}-${searchQuery}-${city}`}
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
                  onClick={() => {
                    const p = Math.max(1, page - 1);
                    setPage(p);
                    syncUrl({ page: p });
                  }}
                  disabled={page <= 1}
                  className="gap-1"
                  style={{ borderColor: "var(--border-glow)", color: "#E8EAF0" }}
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
                        onClick={() => {
                          setPage(pageNum);
                          syncUrl({ page: pageNum });
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                          page === pageNum
                            ? "page-active-purple"
                            : "hover:text-[#E8EAF0]"
                        }`}
                        style={page !== pageNum ? { color: "var(--text-secondary)" } : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = Math.min(pagination.totalPages, page + 1);
                    setPage(p);
                    syncUrl({ page: p });
                  }}
                  disabled={page >= pagination.totalPages}
                  className="gap-1"
                  style={{ borderColor: "var(--border-glow)", color: "#E8EAF0" }}
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
      <footer className="border-t py-8" style={{ borderColor: "rgba(123,47,255,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="pixel text-[8px]">HACKTRACK</span>
          </div>
          <p className="mono text-xs">Built with ❤️ for hackers</p>
        </div>
      </footer>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-void)" }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--purple-primary)" }} />
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
