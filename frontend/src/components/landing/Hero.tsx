"use client";

import { motion } from "framer-motion";
import StarCanvas from "./StarCanvas";
import Link from "next/link";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <section className="hero-section">
      <StarCanvas />

      {/* Circuit board trace pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full z-[2] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="circuit-pattern"
            x="0"
            y="0"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            {/* Horizontal traces */}
            <line x1="0" y1="30" x2="50" y2="30" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="70" y1="30" x2="120" y2="30" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="0" y1="90" x2="40" y2="90" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="80" y1="90" x2="120" y2="90" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            {/* Vertical traces */}
            <line x1="30" y1="0" x2="30" y2="50" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="90" y1="40" x2="90" y2="120" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="60" y1="0" x2="60" y2="30" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            <line x1="60" y1="60" x2="60" y2="120" stroke="rgba(123,47,255,0.08)" strokeWidth="1" />
            {/* Nodes at junctions */}
            <rect x="28" y="28" width="4" height="4" fill="rgba(123,47,255,0.12)" />
            <rect x="58" y="28" width="4" height="4" fill="rgba(123,47,255,0.12)" />
            <rect x="88" y="28" width="4" height="4" fill="rgba(123,47,255,0.10)" />
            <rect x="28" y="88" width="4" height="4" fill="rgba(123,47,255,0.10)" />
            <rect x="58" y="58" width="4" height="4" fill="rgba(123,47,255,0.14)" />
            <rect x="88" y="88" width="4" height="4" fill="rgba(123,47,255,0.12)" />
            {/* Diagonal trace */}
            <line x1="50" y1="30" x2="60" y2="60" stroke="rgba(123,47,255,0.06)" strokeWidth="1" />
            <line x1="40" y1="90" x2="60" y2="60" stroke="rgba(123,47,255,0.06)" strokeWidth="1" />
            {/* Extra connector */}
            <line x1="70" y1="30" x2="90" y2="40" stroke="rgba(123,47,255,0.06)" strokeWidth="1" />
            <line x1="80" y1="90" x2="90" y2="80" stroke="rgba(123,47,255,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-pattern)" />
      </svg>

      {/* Nebula layers */}
      <div className="hero-nebula" />

      <motion.div
        className="hero-content"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow */}
        <motion.div variants={fadeUp} className="hero-eyebrow">
          Code With Purpose • Innovate, Collaborate, Dominate
        </motion.div>

        {/* Title */}
        <motion.h1 variants={fadeUp} className="hero-title glitch">
          <span style={{ color: "#fff" }}>HACK</span>
          <br />
          <span style={{ color: "var(--purple-primary)" }}>TRACK</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="hero-tagline">
          Your All-In-One Hackathon Command Center
        </motion.p>

        {/* Description */}
        <motion.p variants={fadeUp} className="hero-description">
          From discovering the perfect hackathon to tracking deadlines,
          building your team, and bringing home the trophy — HackTrack
          has your entire journey covered.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={fadeUp} className="hero-cta-row">
          <Link href="/login" className="btn-primary-lg">
            Start Tracking →
          </Link>
          <Link href="/discover" className="btn-ghost-lg">
            Explore Hackathons
          </Link>
        </motion.div>

        {/* Live stats */}
        <motion.div variants={fadeUp} className="hero-stats">
          <span>🟢 <span className="stat-number">247</span> hackathons tracked live</span>
          <span className="stat-separator">·</span>
          <span>⚡ <span className="stat-number">3</span> platforms synced</span>
          <span className="stat-separator">·</span>
          <span>🏆 <span className="stat-number">50+</span> wins recorded</span>
        </motion.div>
      </motion.div>

      {/* Mountains */}
      <div className="hero-mountains">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" width="100%" height="180">
          <polygon
            points="0,180 0,140 80,90 160,120 240,60 320,100 400,40 500,80 600,20 700,70 800,30 900,90 1000,50 1100,110 1200,70 1300,120 1380,85 1440,100 1440,180"
            fill="#0d0525"
          />
          <polygon
            points="0,180 0,160 100,130 200,150 350,110 450,140 600,105 750,135 900,115 1050,145 1200,120 1350,150 1440,130 1440,180"
            fill="#060315"
          />
        </svg>
      </div>
    </section>
  );
}
