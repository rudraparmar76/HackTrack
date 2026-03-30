"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ────────────────────────────────────────────
   Animated SVG Illustrations for each track
   ──────────────────────────────────────────── */

/** Scraper — Typewriter terminal with streaming text */
function ScraperVisual() {
  const lines = [
    { color: "var(--cyan-accent)", text: "$ hacktrack scrape" },
    { color: "var(--text-secondary)", text: "→ Fetching devfolio.co/h/ai-buildathon..." },
    { color: "var(--cyan-accent)", text: "✓ Deadline: Apr 15, 2025" },
    { color: "var(--cyan-accent)", text: "✓ Prize: ₹5,00,000" },
    { color: "var(--cyan-accent)", text: "✓ Tracks: AI/ML, Web3, Climate" },
    { color: "var(--purple-primary)", text: "Done in 2.3s █" },
  ];

  return (
    <div className="track-visual-terminal">
      <div className="track-visual-bar">
        <span className="track-dot" style={{ background: "#7b2fff" }} />
        <span className="track-dot" style={{ background: "#4a1a99" }} />
        <span className="track-dot" style={{ background: "#00e5ff", opacity: 0.6 }} />
        <span style={{ color: "var(--text-secondary)", fontSize: 10, marginLeft: 8, fontFamily: "'JetBrains Mono', monospace" }}>terminal</span>
      </div>
      <div className="track-visual-body">
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              color: line.color,
              animation: `typewriter-fade 0.4s ease ${i * 0.5}s both`,
              opacity: 0,
            }}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Discovery — Radar dish with rotating sweep + pinging dots */
function DiscoveryVisual() {
  return (
    <svg
      width="100%"
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: 200 }}
    >
      {/* Outer ring */}
      <circle cx="90" cy="90" r="75" stroke="rgba(0,229,255,0.2)" strokeWidth="1.5" />
      <circle cx="90" cy="90" r="55" stroke="rgba(0,229,255,0.15)" strokeWidth="1" />
      <circle cx="90" cy="90" r="35" stroke="rgba(0,229,255,0.1)" strokeWidth="1" />
      {/* Crosshairs */}
      <line x1="90" y1="10" x2="90" y2="170" stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" />
      <line x1="10" y1="90" x2="170" y2="90" stroke="rgba(0,229,255,0.08)" strokeWidth="0.5" />
      {/* Center dot */}
      <circle cx="90" cy="90" r="3" fill="#00e5ff" opacity="0.8" />
      {/* Rotating sweep line */}
      <line
        x1="90"
        y1="90"
        x2="90"
        y2="15"
        stroke="url(#radar-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transformOrigin: "90px 90px", animation: "radar-sweep 3s linear infinite" }}
      />
      {/* Sweep gradient trail */}
      <defs>
        <linearGradient id="radar-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {/* Pinging dots */}
      <circle cx="60" cy="55" r="4" fill="#00e5ff" style={{ animation: "ping-dot 3s ease-in-out 0.5s infinite" }} />
      <circle cx="120" cy="70" r="3" fill="#00e5ff" style={{ animation: "ping-dot 3s ease-in-out 1.2s infinite" }} />
      <circle cx="75" cy="115" r="3.5" fill="#00e5ff" style={{ animation: "ping-dot 3s ease-in-out 2s infinite" }} />
      <circle cx="115" cy="110" r="2.5" fill="#7b2fff" style={{ animation: "ping-dot 3s ease-in-out 0.8s infinite" }} />
      <circle cx="50" cy="85" r="2" fill="#7b2fff" style={{ animation: "ping-dot 3s ease-in-out 1.6s infinite" }} />
    </svg>
  );
}

/** Kanban — Pixel-art static kanban board */
function KanbanVisual() {
  return (
    <div className="track-visual-kanban" style={{ gap: 6 }}>
      {[
        { title: "TODO", cards: [{ active: false }, { active: false }] },
        { title: "BUILD", cards: [{ active: true }, { active: false }, { active: false }] },
        { title: "DONE", cards: [{ active: false }] },
      ].map((col) => (
        <div key={col.title} className="track-kanban-col" style={{ padding: 6 }}>
          <span className="track-kanban-header" style={{ fontSize: 8, letterSpacing: "0.15em", color: "var(--purple-primary)" }}>{col.title}</span>
          {col.cards.map((card, i) => (
            <div
              key={i}
              className={`track-kanban-card ${card.active ? "track-kanban-card-active" : ""}`}
              style={{
                height: 20,
                marginBottom: 4,
                borderRadius: 2,
                imageRendering: "pixelated",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** AI — Neural network node diagram with pulse animation */
function AIVisual() {
  // 3 layers: 3 → 4 → 2
  const layers = [
    [{ x: 25, y: 35 }, { x: 25, y: 90 }, { x: 25, y: 145 }],
    [{ x: 90, y: 20 }, { x: 90, y: 65 }, { x: 90, y: 110 }, { x: 90, y: 155 }],
    [{ x: 155, y: 60 }, { x: 155, y: 120 }],
  ];

  const connections: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = [];
  layers[0].forEach((from, fi) => {
    layers[1].forEach((to, ti) => {
      connections.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, delay: (fi + ti) * 0.2 });
    });
  });
  layers[1].forEach((from, fi) => {
    layers[2].forEach((to, ti) => {
      connections.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, delay: (fi + ti) * 0.3 + 0.5 });
    });
  });

  return (
    <svg width="100%" viewBox="0 0 180 180" fill="none" style={{ maxWidth: 200 }}>
      <defs>
        <linearGradient id="nn-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7b2fff" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      {/* Connections with pulse */}
      {connections.map((c, i) => (
        <line
          key={i}
          x1={c.x1}
          y1={c.y1}
          x2={c.x2}
          y2={c.y2}
          stroke="url(#nn-line-grad)"
          strokeWidth="1"
          opacity="0.3"
          style={{ animation: `nn-pulse 2.5s ease-in-out ${c.delay}s infinite` }}
        />
      ))}
      {/* Nodes */}
      {layers.flat().map((node, i) => (
        <g key={i}>
          <circle
            cx={node.x}
            cy={node.y}
            r="8"
            fill={i < 3 ? "rgba(123,47,255,0.3)" : i < 7 ? "rgba(123,47,255,0.2)" : "rgba(0,229,255,0.3)"}
            stroke={i < 3 ? "#7b2fff" : i < 7 ? "#7b2fff" : "#00e5ff"}
            strokeWidth="1.5"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r="3"
            fill={i >= 7 ? "#00e5ff" : "#7b2fff"}
            style={{ animation: `nn-node-glow 2s ease-in-out ${i * 0.3}s infinite` }}
          />
        </g>
      ))}
    </svg>
  );
}

/* ──── Track data ──── */
const tracks = [
  {
    title: "SMART SCRAPER",
    desc: "Paste any hackathon URL from Devfolio, Unstop, or Devpost. HackTrack's scraper automatically pulls registration deadlines, submission cutoffs, prize pools, problem tracks, and team size requirements. What took 20 minutes now takes 3 seconds.",
    visual: <ScraperVisual />,
  },
  {
    title: "LIVE DISCOVERY",
    desc: "HackTrack actively scrapes Devfolio, Unstop, and Devpost every 6 hours, maintaining a live feed of open hackathons. Filter by city, platform, or prize pool. No more manual hunting.",
    visual: <DiscoveryVisual />,
  },
  {
    title: "KANBAN BOARD",
    desc: "Visualise your hackathon lifecycle with a drag-and-drop kanban. Move cards from Interested → Registered → Building → Submitted → Won. At a glance, see exactly where each hackathon stands in your pipeline.",
    visual: <KanbanVisual />,
  },
  {
    title: "AI IDEA GENERATOR",
    desc: "Stuck on a problem statement? Our Groq LLaMA integration reads the hackathon's tracks and generates 4 tailored project ideas — complete with tech stack, wow factor, and feasibility score.",
    visual: <AIVisual />,
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
