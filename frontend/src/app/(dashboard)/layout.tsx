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
    <div className="min-h-screen bg-void">
      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 sidebar-dark border-b z-40 flex items-center justify-between px-4" style={{ borderColor: 'rgba(123,47,255,0.15)' }}>
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
      
      <main className="md:ml-[220px] ml-0 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
