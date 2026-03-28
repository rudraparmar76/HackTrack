"use client";

import { motion } from "framer-motion";

const manPage = [
  { text: "HACKTRACK(1)    Hackathon Tools    HACKTRACK(1)", bold: true },
  { text: "" },
  { text: "NAME", bold: true },
  { text: "       HackTrack — the hacker's command center for hackathons" },
  { text: "" },
  { text: "DESCRIPTION", bold: true },
  { text: "       HackTrack is a full-stack platform built for developers" },
  { text: "       who take hackathons seriously. Track your journey from" },
  { text: "       discovery to submission, collaborate with your team," },
  { text: "       and build a public portfolio of your wins." },
  { text: "" },
  { text: "AUTHORS", bold: true },
  { text: "       Built by hackers, for hackers." },
];

export default function About() {
  return (
    <motion.section
      id="about"
      className="about-section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="about-overlay" />
      <p className="terminal-prefix about-terminal">
        $ man HackTrack<span className="cursor" />
      </p>
      <div className="about-content">
        {manPage.map((line, i) => (
          <div key={i} className={`about-line ${line.bold ? "about-line-bold" : ""}`}>
            {line.text || "\u00A0"}
          </div>
        ))}
      </div>
    </motion.section>
  );
}
