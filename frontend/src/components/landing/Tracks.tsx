"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tracks = [
  {
    title: "SMART SCRAPER",
    desc: "Paste any hackathon URL from Devfolio, Unstop, or Devpost. HackTrack's scraper automatically pulls registration deadlines, submission cutoffs, prize pools, problem tracks, and team size requirements. What took 20 minutes now takes 3 seconds.",
    visual: (
      <div className="track-visual-terminal">
        <div className="track-visual-bar">
          <span className="track-dot" style={{ background: "#ff5f57" }} />
          <span className="track-dot" style={{ background: "#febc2e" }} />
          <span className="track-dot" style={{ background: "#28c840" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 10, marginLeft: 8 }}>terminal</span>
        </div>
        <div className="track-visual-body">
          <p style={{ color: "var(--text-terminal)" }}>$ hacktrack scrape</p>
          <p style={{ color: "var(--text-secondary)" }}>→ Fetching devfolio.co/h/ai-buildathon...</p>
          <p style={{ color: "var(--cyan-accent)" }}>✓ Deadline: Apr 15, 2025</p>
          <p style={{ color: "var(--cyan-accent)" }}>✓ Prize: ₹5,00,000</p>
          <p style={{ color: "var(--cyan-accent)" }}>✓ Tracks: AI/ML, Web3, Climate</p>
          <p style={{ color: "var(--text-terminal)" }}>Done in 2.3s <span className="cursor" /></p>
        </div>
      </div>
    ),
  },
  {
    title: "KANBAN BOARD",
    desc: "Visualise your hackathon lifecycle with a drag-and-drop kanban. Move cards from Interested → Registered → Building → Submitted → Won. At a glance, see exactly where each hackathon stands in your pipeline.",
    visual: (
      <div className="track-visual-kanban">
        {["Interested", "Building", "Submitted"].map((col) => (
          <div key={col} className="track-kanban-col">
            <span className="track-kanban-header">{col}</span>
            <div className="track-kanban-card" />
            {col === "Building" && <div className="track-kanban-card track-kanban-card-active" />}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "LIVE DISCOVERY",
    desc: "HackTrack actively scrapes Devfolio, Unstop, and Devpost every 6 hours, maintaining a live feed of open hackathons. Filter by city, platform, prize pool, or mode (online/in-person). No more manual hunting.",
    visual: (
      <div className="track-visual-feed">
        {["AI Buildathon", "Web3 Forge", "Climate Hack"].map((name, i) => (
          <div key={name} className="track-feed-item">
            <span className="track-feed-dot" style={{ background: i === 0 ? "var(--cyan-accent)" : "var(--purple-primary)" }} />
            <div>
              <p style={{ color: "#fff", fontSize: 12 }}>{name}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 10 }}>Ends in {3 + i * 4}d</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "AI IDEA GENERATOR",
    desc: "Stuck on a problem statement? Our Groq LLaMA integration reads the hackathon's tracks and generates 4 tailored project ideas — complete with tech stack, wow factor, and feasibility score.",
    visual: (
      <div className="track-visual-ai">
        <div className="track-ai-header">
          <span style={{ color: "var(--text-terminal)" }}>🤖 Generating ideas...</span>
        </div>
        {["SmartCity Dashboard", "AI Study Buddy", "EcoTrack"].map((idea, i) => (
          <div key={idea} className="track-ai-idea">
            <span style={{ color: "var(--cyan-accent)", fontSize: 11 }}>#{i + 1}</span>
            <span style={{ color: "#fff", fontSize: 12 }}>{idea}</span>
            <span style={{ color: "var(--text-terminal)", fontSize: 10 }}>⚡ {85 + i * 5}%</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Tracks() {
  const [current, setCurrent] = useState(0);

  return (
    <motion.section
      className="tracks-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <p className="terminal-prefix">
        $ ls -a FEATURES/<span className="cursor" />
      </p>

      <div className="tracks-carousel">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4 }}
            className="tracks-card card-glow"
          >
            <div className="tracks-card-left">
              <h3 className="tracks-card-title pixel">{tracks[current].title}</h3>
              <p className="tracks-card-desc">{tracks[current].desc}</p>
              <span className="tracks-card-link">Try it →</span>
            </div>
            <div className="tracks-card-right">
              {tracks[current].visual}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="tracks-nav">
        <button
          className="schedule-arrow"
          onClick={() => setCurrent((current - 1 + tracks.length) % tracks.length)}
          aria-label="Previous track"
        >
          ‹
        </button>
        <span className="tracks-counter">
          {String(current + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}
        </span>
        <div className="tracks-dots">
          {tracks.map((_, i) => (
            <span
              key={i}
              className={`tracks-dot ${i === current ? "tracks-dot-active" : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <button
          className="schedule-arrow"
          onClick={() => setCurrent((current + 1) % tracks.length)}
          aria-label="Next track"
        >
          ›
        </button>
      </div>
    </motion.section>
  );
}
