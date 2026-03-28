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
