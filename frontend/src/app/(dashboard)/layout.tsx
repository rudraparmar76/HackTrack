"use client";

import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { Menu, Terminal } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#151820] border-b border-[#1E2330] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#00FF87]" />
          </div>
          <span className="text-base font-bold text-[#E8EAF0] tracking-tight">
            Hack<span className="text-[#00FF87]">Track</span>
          </span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-[#E8EAF0] hover:text-[#00FF87] transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0F1117]/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className="md:ml-[220px] ml-0 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
