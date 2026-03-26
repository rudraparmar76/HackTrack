"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Link2,
  BarChart3,
  Users,
  Bell,
  Kanban,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Link2,
    title: "Smart Link Scraper",
    description: "Paste any hackathon URL and auto-extract all event details — dates, prizes, tracks, and more.",
    accent: "text-[#00FF87]",
    bg: "bg-[#00FF87]/10",
  },
  {
    icon: BarChart3,
    title: "Visual Dashboard",
    description: "Track all your hackathons at a glance with status filters, countdown timers, and smart sorting.",
    accent: "text-[#00D4FF]",
    bg: "bg-[#00D4FF]/10",
  },
  {
    icon: Kanban,
    title: "Kanban Progress",
    description: "Drag-and-drop task boards to track your journey from Idea to Submission.",
    accent: "text-[#00FF87]",
    bg: "bg-[#00FF87]/10",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Add team members, assign roles, and collaborate with shared notes and tasks.",
    accent: "text-[#00D4FF]",
    bg: "bg-[#00D4FF]/10",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Auto-reminders for registration deadlines, submissions, and result announcements.",
    accent: "text-[#EF9F27]",
    bg: "bg-[#EF9F27]/10",
  },
  {
    icon: Sparkles,
    title: "Rich Notes",
    description: "Capture ideas, tech stack decisions, API keys, and mentor feedback in a rich text editor.",
    accent: "text-[#00FF87]",
    bg: "bg-[#00FF87]/10",
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Green Glow Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#00FF87]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#00D4FF]/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <nav className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-[#00FF87]" />
            </div>
            <span className="text-xl font-bold text-[#E8EAF0]">
              Hack<span className="text-[#00FF87]">Track</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/discover">
              <Button variant="outline" className="border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0]">
                Browse Hackathons
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0]">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-sm font-medium mb-8">
              <Terminal className="w-4 h-4" />
              <span className="font-mono text-xs">$ your hackathon command center</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-[#E8EAF0] mb-6">
              Never miss a
              <br />
              <span className="glow-text">hackathon deadline</span>
              <br />
              again.
            </h1>
            <p className="text-lg sm:text-xl text-[#7A8099] max-w-2xl mx-auto mb-10 leading-relaxed">
              Paste a link, auto-extract event details, track your team&apos;s
              progress with kanban boards, and get smart reminders — all in one
              beautiful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="text-base px-8 h-12 gap-2 bg-[#00FF87] text-[#0F1117] hover:bg-[#00FF87]/90 font-semibold shadow-lg shadow-[#00FF87]/20 hover:shadow-[#00FF87]/30 transition-all">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/discover">
                <Button variant="outline" size="lg" className="text-base px-8 h-12 gap-2 border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0]">
                  <Sparkles className="w-5 h-5 text-[#00D4FF]" /> Discover Hackathons
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Discover Section */}
      <section className="relative py-16 border-t border-[#1E2330]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00D4FF]/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-xs font-medium mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              NEW
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#E8EAF0] mb-3">
              Explore <span className="text-[#00D4FF]">Live Hackathons</span>
            </h2>
            <p className="text-[#7A8099] text-base max-w-lg mx-auto mb-8">
              We automatically scrape Devfolio, DevPost, Unstop & more so you can browse and track open hackathons — no searching required.
            </p>
            <Link href="/discover">
              <Button size="lg" className="text-base px-8 h-12 gap-2 bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/20 font-semibold transition-all">
                Browse All Hackathons <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 border-t border-[#1E2330]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00FF87]/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#E8EAF0] mb-4">
              Everything you need to{" "}
              <span className="text-[#00FF87]">win hackathons</span>
            </h2>
            <p className="text-[#7A8099] text-lg max-w-xl mx-auto">
              From registration to submission, HackTrack has you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="hack-card rounded-2xl p-6 group cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.accent}`} />
                </div>
                <h3 className="text-lg font-semibold text-[#E8EAF0] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#7A8099] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 border-t border-[#1E2330]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#00FF87]/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#E8EAF0] mb-4">
            Ready to level up your hackathon game?
          </h2>
          <p className="text-[#7A8099] text-lg mb-8">
            Join HackTrack and never lose track of a hackathon again.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-10 h-12 gap-2 bg-[#00FF87] text-[#0F1117] hover:bg-[#00FF87]/90 font-semibold shadow-lg shadow-[#00FF87]/20">
              Start Tracking <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

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
