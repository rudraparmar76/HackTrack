import Link from "next/link";
import { UserX, Home, Search } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background aesthetic blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EF9F27]/[0.05] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[rgba(123,47,255,0.04)] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Abstract 404 Icon Container */}
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-[#EF9F27]/10 rounded-2xl rotate-3" />
          <div className="absolute inset-0 bg-[#1A1F2E] border border-[#1E2330] rounded-2xl -rotate-3 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <UserX className="w-10 h-10 text-[#EF9F27]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-[#E8EAF0] mb-3 tracking-tight">
          Hacker Not Found
        </h1>
        
        <p className="text-[#7A8099] mb-8 leading-relaxed">
          We searched the mainframe but couldn&apos;t locate a public profile with that username. They might be in stealth mode, or the URL might be incorrect.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link 
            href="/discover" 
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1F2E] hover:bg-[#1E2330] border border-[#1E2330] hover:border-[#EF9F27]/30 text-[#E8EAF0] rounded-xl font-medium transition-all duration-200"
          >
            <Search className="w-4 h-4 text-[#EF9F27]" />
            Find Hackers
          </Link>
          
          <Link 
            href="/" 
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[rgba(123,47,255,0.12)] hover:bg-[rgba(123,47,255,0.2)] border border-[rgba(123,47,255,0.25)] text-[var(--purple-primary)] rounded-xl font-medium transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Home Base
          </Link>
        </div>

        {/* Decorative status code */}
        <div className="mt-12 pt-8 border-t border-[#1E2330]/50 w-full flex items-center justify-center gap-3 opacity-50">
          <span className="w-2 h-2 rounded-full bg-[#EF9F27] animate-pulse" />
          <span className="text-xs font-mono text-[#7A8099] tracking-widest uppercase">
            Error 404 • Profile Sync Failed
          </span>
        </div>
      </div>
    </div>
  );
}
