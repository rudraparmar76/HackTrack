"use client";

import { motion } from "framer-motion";

const tiers = [
  {
    label: "FRONTEND",
    color: "var(--cyan-accent)",
    techs: ["Next.js 14", "React", "Tailwind", "Framer Motion", "shadcn/ui"],
  },
  {
    label: "BACKEND",
    color: "var(--purple-primary)",
    techs: ["Node.js", "Express", "TypeScript"],
  },
  {
    label: "DATABASE",
    color: "var(--gold)",
    techs: ["Supabase", "PostgreSQL", "Row Level Security"],
  },
  {
    label: "AI",
    color: "var(--text-terminal)",
    techs: ["Groq API", "LLaMA 3.3 70B"],
  },
  {
    label: "SCRAPING",
    color: "#ff6b6b",
    techs: ["Playwright", "httpx", "BeautifulSoup"],
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function TechStack() {
  return (
    <motion.section
      className="techstack-section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={container}
    >
      <motion.p variants={item} className="terminal-prefix">
        $ tar -xvz STACK<span className="cursor" />
      </motion.p>

      <motion.p variants={item} className="techstack-intro">
        The battle-tested stack powering HackTrack&apos;s real-time infrastructure
      </motion.p>

      <div className="techstack-tiers">
        {tiers.map((tier) => (
          <motion.div key={tier.label} variants={item} className="techstack-tier">
            <span className="techstack-tier-label" style={{ color: tier.color }}>
              {tier.label}
            </span>
            <div className="techstack-pills">
              {tier.techs.map((tech) => (
                <span key={tech} className="techstack-pill">
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
