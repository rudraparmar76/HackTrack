"use client";

import { motion } from "framer-motion";

const cards = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="#7b2fff" strokeWidth="1.5" />
        <path d="M8 8l-3 3 3 3M16 8l3 3-3 3M13 7l-2 10" stroke="#7b2fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "SMART SCRAPER",
    stat: "3 PLATFORMS",
    statColor: "var(--cyan-accent)",
    desc: "Paste any Devfolio, Unstop, or Devpost link. AI extracts deadlines, prizes, and tracks automatically.",
    featured: false,
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#00e5ff" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="#00e5ff" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1" fill="#00e5ff" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "LIVE DISCOVERY",
    stat: "247 LIVE",
    statColor: "var(--gold)",
    desc: "Actively updated feed of open hackathons. Never miss an opportunity — we hunt them for you.",
    featured: true,
    label: "✦ FEATURED",
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3 6 6.5 1-4.75 4.5L18 20l-6-3.5L6 20l1.25-6.5L2.5 9l6.5-1L12 2z" stroke="#ffd700" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    title: "WIN TRACKER",
    stat: "100% YOURS",
    statColor: "var(--gold)",
    desc: 'Public profile showcasing every win, participation, and project. Share hack-track.tech/u/[username]',
    featured: false,
  },
];

const badges = [
  { icon: "🤖", text: "AI IDEA GENERATOR — Groq LLaMA powered" },
  { icon: "👥", text: "TEAM COLLAB — Invite teammates via email" },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Features() {
  return (
    <motion.section
      id="features"
      className="features-section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={container}
    >
      <motion.p variants={item} className="terminal-prefix">
        $ vi FEATURES.yml<span className="cursor" />
      </motion.p>

      <div className="features-grid">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            variants={item}
            className={`feature-card card-glow ${card.featured ? "feature-card-featured" : ""} ${i === 1 ? "feature-card-center" : ""}`}
          >
            {card.featured && card.label && (
              <span className="feature-label">{card.label}</span>
            )}
            <div className="feature-icon">{card.icon}</div>
            <h3 className="feature-title pixel">{card.title}</h3>
            <p className="feature-stat" style={{ color: card.statColor }}>
              {card.stat}
            </p>
            <p className="feature-desc">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="feature-badges">
        {badges.map((badge) => (
          <span key={badge.text} className="feature-badge">
            <span>{badge.icon}</span> {badge.text}
          </span>
        ))}
      </motion.div>

      <motion.p variants={item} className="feature-fine-print">
        * All features available free. No credit card required.
      </motion.p>
    </motion.section>
  );
}
