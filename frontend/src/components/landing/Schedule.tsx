"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const steps = [
  { title: "Discover", desc: "Browse live hackathons" },
  { title: "Scrape", desc: "Auto-import details via link" },
  { title: "Build", desc: "Track progress on kanban" },
  { title: "Submit", desc: "Beat every deadline" },
  { title: "Win", desc: "Add trophy to profile" },
];

export default function Schedule() {
  const [active, setActive] = useState(2);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="schedule-section"
    >
      <p className="terminal-prefix">
        $ cat WORKFLOW.txt<span className="cursor" />
      </p>

      <div className="schedule-container">
        <button
          className="schedule-arrow"
          onClick={() => setActive(Math.max(0, active - 1))}
          aria-label="Previous step"
        >
          ‹
        </button>

        <div className="timeline-wrapper">
          <div className="timeline-line" />
          <div className="timeline-steps">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`timeline-step ${i === active ? "timeline-step-active" : ""}`}
                onClick={() => setActive(i)}
              >
                <div className={`timeline-dot ${i === active ? "timeline-dot-active" : ""}`} />
                <div className={`timeline-card card-glow ${i === active ? "timeline-card-active" : ""}`}>
                  <span className="timeline-title pixel">{step.title}</span>
                  <span className="timeline-desc">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="schedule-arrow"
          onClick={() => setActive(Math.min(steps.length - 1, active + 1))}
          aria-label="Next step"
        >
          ›
        </button>
      </div>
    </motion.section>
  );
}
