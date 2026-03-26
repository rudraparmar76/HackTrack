"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Bell,
  Clock,
  Settings,
  LogOut,
  Plus,
  Terminal,
  Sparkles,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/reminders", label: "Reminders", icon: Clock },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false);
        setUnreadCount(count || 0);
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#151820] border-r border-[#1E2330] flex flex-col z-50">
      {/* Logo */}
      <Link
        href={user ? "/dashboard" : "/"}
        className="flex items-center gap-2.5 px-5 py-5 group"
      >
        <div className="w-8 h-8 rounded-lg bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center group-hover:bg-[#00FF87]/15 transition-colors">
          <Terminal className="w-4 h-4 text-[#00FF87]" />
        </div>
        <span className="text-base font-bold text-[#E8EAF0] tracking-tight">
          Hack<span className="text-[#00FF87]">Track</span>
        </span>
      </Link>

      {/* Add Hackathon CTA */}
      <div className="px-4 mb-4">
        <Link href="/hackathon/new">
          <button className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#00FF87] text-[#0F1117] text-sm font-semibold hover:bg-[#00FF87]/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Hackathon
          </button>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "text-[#00FF87] bg-[#00FF87]/5"
                  : "text-[#7A8099] hover:text-[#E8EAF0] hover:bg-white/[0.02]"
              }`}
            >
              {/* Active left border */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#00FF87]" />
              )}
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {/* Notification badge */}
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[#00FF87]/20 text-[#00FF87] text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="px-3 pb-4 pt-3 border-t border-[#1E2330]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-[#00FF87]/10 text-[#00FF87] text-xs font-bold">
                    {(
                      user.user_metadata?.name ||
                      user.email ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-[#E8EAF0] truncate">
                    {user.user_metadata?.name || "User"}
                  </p>
                  <p className="text-[11px] text-[#7A8099] truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
