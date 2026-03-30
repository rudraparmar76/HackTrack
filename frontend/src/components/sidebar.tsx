"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import {
  Compass,
  LayoutGrid,
  PlusCircle,
  List,
  Bell,
  User as UserIcon,
  Users,
  BellDot,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
}

const navSections = [
  {
    label: "DISCOVER",
    items: [{ href: "/discover", label: "Discover", icon: Compass }],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/hackathon/new", label: "Track New", icon: PlusCircle },
      // { href: "/my-hackathons", label: "My Hackathons", icon: List },
      { href: "/reminders", label: "Reminders", icon: Bell },
    ],
  },
  {
    label: "SOCIAL",
    items: [
      { href: "/profile", label: "My Profile", icon: UserIcon },
      // { href: "/team-finder", label: "Team Finder", icon: Users },
      { href: "/notifications", label: "Notifications", icon: BellDot },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/help", label: "Help", icon: HelpCircle },
    ],
  },
];

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [username, setUsername] = useState<string | null>(null);

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUsername(profile.username);
        }
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") && href !== "/";

  // When Profile path is unique, like /u/[username], we just handle the base /profile map for now.
  // We'll map "My Profile" to their user link if needed later.

  return (
    <>
      <div className="hidden md:block w-[240px] shrink-0 h-screen" />
      <aside
        className={`fixed left-0 top-0 h-screen w-[240px] flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "rgba(6, 3, 18, 0.98)",
          borderRight: "1px solid rgba(123,47,255,0.2)",
          padding: "20px 0",
          overflowY: "auto",
        }}
      >
        <style jsx>{`
          aside::-webkit-scrollbar {
            width: 4px;
          }
          aside::-webkit-scrollbar-track {
            background: rgba(6, 3, 18, 0.98);
          }
          aside::-webkit-scrollbar-thumb {
            background: rgba(123, 47, 255, 0.4);
            border-radius: 4px;
          }
        `}</style>
        {/* Top Section */}
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(123,47,255,0.15)", marginBottom: "24px" }}>
          <Logo size="sm" showText={true} />
        </div>

        {/* Nav Sections */}
        <div className="flex-1 flex flex-col gap-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(123,47,255,0.6)",
                  padding: "0 20px 8px",
                }}
              >
                {section.label}
              </div>
              <div className="flex flex-col">
                {section.items.map((item) => {
                  let resolvedHref = item.href;
                  if (item.label === "My Profile" && username) {
                    resolvedHref = `/u/${username}`;
                  }
                  
                  const active = isActive(resolvedHref);
                  return (
                    <Link
                      href={resolvedHref}
                      key={item.label}
                      onClick={() => setIsOpen?.(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: active ? "10px 20px 10px 18px" : "10px 20px",
                        borderRadius: "4px",
                        margin: "1px 8px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: active ? "white" : "var(--text-secondary)",
                        transition: "all 150ms",
                        background: active ? "rgba(123,47,255,0.15)" : "transparent",
                        borderLeft: active ? "2px solid var(--purple-primary)" : "none",
                        boxShadow: active ? "inset 0 0 20px rgba(123,47,255,0.05)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "rgba(123,47,255,0.1)";
                          (e.currentTarget as HTMLElement).style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <item.icon style={{ width: "16px", height: "16px", color: "inherit" }} />
                      <span className="flex-1">{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span
                          style={{
                            minWidth: "18px",
                            height: "18px",
                            background: "var(--purple-primary)",
                            borderRadius: "9px",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "10px",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: "auto",
                            padding: "0 4px",
                          }}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        {user && (
          <div className="mt-auto pt-4 px-4" style={{ borderTop: "1px solid rgba(123,47,255,0.15)" }}>
            <div className="flex items-center gap-3 px-2 mb-3">
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(123,47,255,0.2)",
                  border: "1px solid var(--border-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "var(--purple-primary)",
                  flexShrink: 0
                }}
              >
                {(user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "white",
                    lineHeight: "1.2",
                    marginBottom: "2px"
                  }}
                >
                  {user.user_metadata?.name || "Hacker"}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text-secondary)",
                    lineHeight: "1"
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 transition-colors"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,50,50,0.2)",
                color: "rgba(255,100,100,0.7)",
                borderRadius: "4px",
                padding: "8px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,50,50,0.5)";
                (e.currentTarget as HTMLElement).style.color = "#ff6666";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,50,50,0.2)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.7)";
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
