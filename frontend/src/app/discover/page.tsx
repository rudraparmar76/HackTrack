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
import { Sidebar } from "@/components/sidebar";

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
      <span style={{ color: "var(--text-secondary)", opacity: 0.5, fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
        Closed
      </span>
    );
  }

  if (days === 0) {
    return (
      <span style={{ background: "rgba(255,51,51,0.15)", border: "1px solid rgba(255,51,51,0.4)", color: "#ff3333", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "2px" }}>
        DUE TODAY
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)", color: "#ffaa00", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "2px" }}>
        {days}d left
      </span>
    );
  }

  return (
    <span style={{ background: "rgba(123,47,255,0.1)", border: "1px solid var(--border-glow)", color: "var(--text-secondary)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "2px" }}>
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
  const uniqueTags = Array.from(new Set(hackathon.tags || [])).slice(0, 3);
  const isValidDate = (d: string | null) => d && !isNaN(new Date(d).getTime());

  // Determine mode badge styles
  let modeBorder = "var(--border-glow)";
  let modeText = "var(--text-secondary)";
  const lDesc = (hackathon.description || "").toLowerCase();
  const lName = (hackathon.name || "").toLowerCase();
  
  let modeLabel = "Online";
  if (lDesc.includes("offline") || lName.includes("offline")) { 
    modeLabel = "Offline"; 
    modeBorder = "rgba(0,229,255,0.4)"; 
    modeText = "var(--cyan-accent)"; 
  } else if (lDesc.includes("hybrid") || lName.includes("hybrid")) { 
    modeLabel = "Hybrid"; 
    modeBorder = "rgba(255,215,0,0.4)"; 
    modeText = "var(--gold)"; 
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col relative"
      style={{ 
        background: "var(--bg-card)",
        border: "1px solid var(--border-glow)",
        overflow: "hidden",
        borderRadius: "4px",
        transition: "border-color 200ms, box-shadow 200ms"
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--purple-primary)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--glow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-glow)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Banner */}
      <div className="relative h-[140px] w-full" style={{ background: "linear-gradient(135deg, #1a0a3a 0%, #0a0520 100%)" }}>
        {hackathon.banner_url ? (
          <Image
            src={hackathon.banner_url}
            alt={hackathon.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: "var(--text-secondary)", opacity: 0.5 }}>
              {hackathon.platform || "HACKATHON"}
            </span>
          </div>
        )}
        
        {/* Top Badges overlay */}
        <div className="absolute top-3 inset-x-3 flex justify-between items-start pointer-events-none">
          {hackathon.platform && (
            <span
              style={{
                background: hackathon.platform.toLowerCase() === 'devfolio' ? 'rgba(61,90,254,0.15)' : 
                            hackathon.platform.toLowerCase() === 'unstop' ? 'rgba(255,107,53,0.15)' : 
                            hackathon.platform.toLowerCase() === 'devpost' ? 'rgba(0,62,84,0.15)' : 'rgba(123,47,255,0.15)',
                border: `1px solid ${hackathon.platform.toLowerCase() === 'devfolio' ? '#3D5AFE' : 
                                    hackathon.platform.toLowerCase() === 'unstop' ? '#FF6B35' : 
                                    hackathon.platform.toLowerCase() === 'devpost' ? '#003E54' : 'var(--border-glow)'}`,
                color: hackathon.platform.toLowerCase() === 'devfolio' ? '#3D5AFE' : 
                       hackathon.platform.toLowerCase() === 'unstop' ? '#FF6B35' : 
                       hackathon.platform.toLowerCase() === 'devpost' ? '#00B4D8' : 'var(--cyan-accent)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "2px"
              }}
            >
              {hackathon.platform}
            </span>
          )}
          
          {isValidDate(hackathon.registration_deadline) && (
             <DeadlineBadge date={hackathon.registration_deadline} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Badges Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {modeLabel !== "Online" && (
            <span style={{
              border: `1px solid ${modeBorder}`,
              color: modeText,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "2px"
            }}>
              {modeLabel}
            </span>
          )}
          {uniqueTags.map(t => {
            const isLocation = CITY_GROUPS.some(g => g.cities.some(c => c.toLowerCase() === t.toLowerCase())) || 
                               t.toLowerCase().includes("india") || t.toLowerCase().includes("usa");
            if (isLocation) {
              return (
                <span key={t} className="flex items-center gap-1" style={{ background: "rgba(123,47,255,0.1)", border: "1px solid var(--border-glow)", color: "var(--purple-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", padding: "2px 8px", borderRadius: "2px" }}>
                  <MapPin className="w-3 h-3" /> {t}
                </span>
              );
            }
            return (
              <span key={t} style={{ border: "1px solid rgba(123,47,255,0.2)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", padding: "2px 8px", borderRadius: "2px" }}>
                {t}
              </span>
            );
          })}
        </div>
        
        <h3 className="text-white mb-1.5 line-clamp-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 500 }}>
          {hackathon.name}
        </h3>

        {hackathon.description && (
          <p className="line-clamp-2 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-secondary)", margin: "6px 0 12px" }}>
            {hackathon.description}
          </p>
        )}

        {/* Prize */}
        {hackathon.prize_pool && (
          <div className="flex items-center gap-1.5 mb-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--gold)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-3.5 h-3.5"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--gold)" }}>
              {hackathon.prize_pool}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          <button
            onClick={() => onTrack(hackathon)}
            disabled={isTracking}
            className="flex-1 flex items-center justify-center gap-2 h-9 transition-colors relative overflow-hidden focus:outline-none"
            style={{
              background: isTracking ? "rgba(123,47,255,0.1)" : "var(--purple-primary)",
              border: "1px solid var(--purple-primary)",
              color: isTracking ? "var(--text-secondary)" : "white",
              opacity: isTracking ? 0.7 : 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              borderRadius: "4px",
              cursor: isTracking ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isTracking) (e.currentTarget as HTMLElement).style.boxShadow = "var(--glow-sm)";
            }}
            onMouseLeave={(e) => {
               if (!isTracking) (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <Bookmark className="w-3.5 h-3.5" style={{ fill: isTracking ? "rgba(123,47,255,0.5)" : "none" }} />
            {isTracking ? "Tracking..." : "Track This"}
          </button>
          <a
            href={hackathon.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-9 px-3 transition-colors focus:outline-none"
            title="View hackathon"
            style={{
              background: "transparent",
              border: "1px solid var(--border-glow)",
              color: "var(--text-secondary)",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(123,47,255,0.1)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--purple-primary)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-glow)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
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

  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user);
      setAuthChecked(true);
    });
  }, [supabase.auth]);

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

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-void)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--purple-primary)" }} />
      </div>
    );
  }

  const PageContent = (
    <>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 relative z-10 w-full">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Near Me */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative w-full sm:flex-1 sm:max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors" style={{ color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search hackathons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 rounded text-sm transition-all focus:outline-none placeholder:text-[#8888bb]"
                style={{
                  height: "40px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-glow)",
                  color: "white",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--purple-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-glow)"; }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--purple-primary)"; }}
                onMouseLeave={(e) => { 
                  if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "var(--border-glow)"; 
                }}
              />
            </div>

            {/* Near Me button */}
            <button
              onClick={detectLocation}
              disabled={detectingLocation}
              className="inline-flex items-center justify-center gap-2 rounded transition-all whitespace-nowrap focus:outline-none"
              style={{
                height: "40px",
                padding: "0 16px",
                background: detectingLocation ? "rgba(123,47,255,0.15)" : "var(--bg-card)",
                border: "1px solid " + (detectingLocation ? "var(--purple-primary)" : "var(--border-glow)"),
                color: detectingLocation ? "var(--purple-primary)" : "white",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              }}
              onMouseEnter={(e) => {
                if (!detectingLocation) {
                  e.currentTarget.style.borderColor = "var(--purple-primary)";
                  e.currentTarget.style.color = "var(--cyan-accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (!detectingLocation) {
                  e.currentTarget.style.borderColor = "var(--border-glow)";
                  e.currentTarget.style.color = "white";
                }
              }}
            >
              {detectingLocation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" style={{ color: "var(--cyan-accent)" }} />
                  Near me
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
                  className="w-full sm:w-[180px] px-3 rounded transition-all appearance-none cursor-pointer focus:outline-none"
                  style={{
                    height: "40px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-glow)",
                    color: city ? "white" : "var(--text-secondary)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px"
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--purple-primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-glow)"; }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--purple-primary)"; }}
                  onMouseLeave={(e) => { 
                    if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "var(--border-glow)"; 
                  }}
                >
                  <option value="">All Cities</option>
                  {CITY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label} style={{ background: "var(--bg-card)", color: "white" }}>
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
                     className="w-full sm:w-[160px] rounded focus:ring-0 focus:ring-offset-0 transition-all border outline-none"
                    style={{ 
                      height: "40px", 
                      background: "var(--bg-card)", 
                      borderColor: "var(--border-glow)", 
                      color: "white", 
                      fontFamily: "'JetBrains Mono', monospace", 
                      fontSize: "12px" 
                    }}
                  >
                    <div className="flex items-center gap-2">
                       <Filter className="w-3.5 h-3.5 hidden sm:block" style={{ color: "var(--text-secondary)" }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", borderColor: "var(--purple-primary)" }}>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="focus:bg-[#0f0830]" style={{ color: "white", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
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
                    className="w-full sm:w-[180px] rounded focus:ring-0 focus:ring-offset-0 transition-all border outline-none"
                    style={{ 
                      height: "40px", 
                      background: "var(--bg-card)", 
                      borderColor: "var(--border-glow)", 
                      color: "white", 
                      fontFamily: "'JetBrains Mono', monospace", 
                      fontSize: "12px" 
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--bg-card)", borderColor: "var(--purple-primary)" }}>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="focus:bg-[#0f0830]" style={{ color: "white", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
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
              <span style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>Active filters:</span>
              {city && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "var(--cyan-accent)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}
                >
                  <MapPin className="w-3 h-3" />
                  {city}
                  <button
                    onClick={() => {
                      setCity("");
                      setPage(1);
                      syncUrl({ city: "", page: 1 });
                    }}
                    className="ml-1 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {platform !== "all" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm"
                  style={{ background: "rgba(123,47,255,0.1)", border: "1px solid var(--border-glow)", color: "var(--purple-primary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}
                >
                  {platform}
                  <button
                    onClick={() => {
                      setPlatform("all");
                      setPage(1);
                      syncUrl({ platform: "all", page: 1 });
                    }}
                    className="ml-1 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Count */}
          {!loading && (
            <span className="ml-0 sm:ml-auto text-right hidden sm:block" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
              {pagination.total} hackathon{pagination.total !== 1 ? "s" : ""} found
              {city && ` near "${city}"`}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10 w-full flex-1">
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

    </>
  );

  if (authUser) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-void)" }}>
        {/* Mobile Topbar */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b z-40 flex items-center justify-between px-4" style={{ background: "rgba(6, 3, 18, 0.98)", borderColor: "rgba(123,47,255,0.15)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-purple-400" />
            </div>
            <span className="pixel text-[10px] text-[#E8EAF0] tracking-wide">
              HACK<span className="text-purple-400">TRACK</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-[#E8EAF0] hover:text-purple-400 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-[#04040f]/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative">
          {/* Background gradients */}
          <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse 80% 50% at 20% 30%, rgba(80,0,160,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 75% 60%, rgba(0,60,120,0.08) 0%, transparent 60%), transparent` }} />
          <div className="fixed inset-0 pointer-events-none z-[1]" style={{ backgroundImage: "linear-gradient(rgba(123, 47, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(123, 47, 255, 0.03) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

          <div className="relative z-10 flex flex-col min-h-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-8 pb-4">
              <div className="dash-terminal mb-2">
                <span>$ hacktrack search --live</span>
                <span className="cursor"></span>
              </div>
              <h1 className="dash-heading" style={{ fontSize: "20px" }}>DISCOVER</h1>
              <p className="text-sm text-[#8888bb] mt-2 mono mb-2">
                Live hackathons from Devfolio · Unstop · Devpost — updated every 6 hours
              </p>
            </div>
            {PageContent}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col" style={{ backgroundColor: "var(--bg-void)" }}>
      {/* Background gradients */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, rgba(80,0,160,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 75% 60%, rgba(0,60,120,0.08) 0%, transparent 60%),
            var(--bg-void)
          `
        }}
      />

      {/* Grid overlay for scanning effect */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        backgroundImage: "linear-gradient(rgba(123, 47, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(123, 47, 255, 0.03) 1px, transparent 1px)",
        backgroundSize: "30px 30px"
      }} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(4,4,15,0.85)", borderColor: "rgba(123,47,255,0.2)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size="md" showText />
            </Link>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="mono text-xs hover:text-white" style={{ borderColor: "var(--border-glow)", color: "var(--text-secondary)", background: "transparent" }}>
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button style={{ background: "var(--purple-primary)", color: "white" }} className="mono text-xs font-semibold gap-1.5 hover:opacity-90">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="sm:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md transition-colors" style={{ color: "white" }}>
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
              style={{ background: "rgba(4,4,15,0.95)", borderColor: "var(--border-glow)" }}
            >
              <div className="px-4 py-4 flex flex-col gap-3 shadow-2xl">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start mono" style={{ borderColor: "var(--border-glow)", color: "var(--text-secondary)", background: "transparent" }}>
                    Sign In
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-start mono text-xs font-semibold gap-1.5 hover:opacity-90" style={{ background: "var(--purple-primary)", color: "white" }}>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full" style={{ padding: "40px 40px 0" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "20px", color: "white" }}>
                DISCOVER
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold" style={{ background: "rgba(123,47,255,0.15)", border: "1px solid var(--border-glow)", borderRadius: "4px", color: "var(--cyan-accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="live-dot" />
                LIVE
              </span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.5 }}>
              Live hackathons from Devfolio · Unstop · Devpost — updated every 6 hours
            </p>
          </motion.div>
        </div>

        {/* Filters and Content */}
        {PageContent}

        {/* Footer */}
        <footer className="border-t py-8 mt-auto" style={{ borderColor: "rgba(123,47,255,0.15)" }}>
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} />
              <span className="pixel text-[8px]">HACKTRACK</span>
            </div>
            <p className="mono text-xs">Built with ❤️ for hackers</p>
          </div>
        </footer>
      </div>
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
