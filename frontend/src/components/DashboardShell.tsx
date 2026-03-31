"use client";

import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";
import Logo from "@/components/Logo";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-void)" }}>
      {/* Mobile Topbar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 h-16 border-b z-40 flex items-center justify-between px-4"
        style={{ background: "rgba(6, 3, 18, 0.98)", borderColor: "rgba(123,47,255,0.15)" }}
      >
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -mr-2 text-[#E8EAF0] hover:text-purple-400 transition-colors"
        >
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

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
