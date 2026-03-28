"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "What platforms does the scraper support?",
    a: "Currently Devfolio, Unstop, and Devpost. Dorahacks and MLH support are in active development.",
  },
  {
    q: "Is HackTrack free to use?",
    a: "Yes, completely free. No credit card, no paywalls. We may introduce optional Pro features in the future.",
  },
  {
    q: "How accurate is the auto-scraper?",
    a: "Structured data (dates, prizes) is pulled directly from platform APIs and Next.js __NEXT_DATA__ — typically 95%+ accurate. For complex pages, we fall back to smart regex.",
  },
  {
    q: "Can I use HackTrack for team hackathons?",
    a: "Absolutely. Invite teammates via email to share a hackathon workspace. Everyone sees the same kanban, notes, and deadlines.",
  },
  {
    q: "Does HackTrack work for in-person hackathons?",
    a: "Yes. The Discover feed supports city-based filtering — find hackathons in Mumbai, Bangalore, Delhi, and 30+ cities.",
  },
  {
    q: "How do I get the AI idea generator to work?",
    a: "Add at least one problem statement or track to your hackathon. The AI reads those and generates 4 tailored project ideas using Groq's LLaMA 3.3 70B model.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <motion.section
      className="faq-section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={container}
    >
      <motion.p variants={item} className="terminal-prefix">
        $ ./FAQ<span className="cursor" />
      </motion.p>

      <div className="faq-list">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            variants={item}
            className="faq-item"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="faq-question">
              <div className="faq-question-left">
                <span className="faq-index">[{i + 1}]</span>
                <span className="faq-q-text">{faq.q}</span>
              </div>
              <span className="faq-toggle">{open === i ? "−" : "+"}</span>
            </div>
            <div
              className="faq-answer"
              style={{
                maxHeight: open === i ? 300 : 0,
                opacity: open === i ? 1 : 0,
                padding: open === i ? "12px 0 12px 32px" : "0 0 0 32px",
              }}
            >
              {faq.a}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
