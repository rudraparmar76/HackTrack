"use client";

import { motion } from "framer-motion";
import { Terminal, HelpCircle, Mail, BookOpen, Bug, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "How do I start tracking a hackathon?",
    answer: "You can easily track any hackathon from the 'Discover' tab. If your hackathon is not listed there, click 'Track New' in the sidebar to manually add your own hackathon with custom details."
  },
  {
    question: "Can I manage a hackathon team?",
    answer: "Yes. When you open a specific hackathon from your Dashboard, you can invite team members via their email. They must have a HackTrack account to accept the invitation."
  },
  {
    question: "Are deadlines automatically synchronized?",
    answer: "Hackathons added via the 'Discover' platform are automatically synchronized and updated. However, manually tracked hackathons require you to update their timelines yourself."
  },
  {
    question: "How do reminders work?",
    answer: "The platform marks any hackathon deadlines falling within the next 48 hours as 'Urgent' and will display a banner alert in your Dashboard. You can also monitor all dates in the 'Reminders' tab."
  }
];

export default function HelpPage() {
  return (
    <div className="space-y-8 pb-10 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="dash-terminal mb-2">
            <span>$ hacktrack --help</span>
            <span className="cursor"></span>
          </div>
          <h1 className="dash-heading">Support Center</h1>
          <p className="text-sm text-[#8888bb] mt-2 mono">Need a hand navigating the matrix?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hack-card dash-card-glow rounded-xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--purple-primary)]" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[rgba(123,47,255,0.15)] border border-[var(--border-glow)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--purple-primary)]" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white">Knowledge Base</h2>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-[rgba(6,3,18,0.5)] border border-[rgba(123,47,255,0.1)]">
                  <h3 className="text-[#E8EAF0] text-sm font-semibold mb-2 flex items-start gap-2">
                    <span className="text-[var(--cyan-accent)] mt-0.5">&gt;</span>
                    {faq.question}
                  </h3>
                  <p className="text-xs text-[#8888bb] leading-relaxed pl-4">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Controls Area */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hack-card dash-card-glow rounded-xl p-6"
          >
            <h2 className="text-sm font-bold font-mono text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8888bb]" /> Contact Support
            </h2>
            <p className="text-xs text-[#8888bb] mb-4">
              If you couldn't find your answer in the knowledge base, feel free to reach out directly to our maintainers.
            </p>
            <a href="mailto:support@hack-track.tech">
              <Button style={{ background: "var(--purple-primary)", color: "white" }} className="w-full font-mono text-xs hover:opacity-90 transition-opacity">
                Send an Email
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hack-card rounded-xl p-6 border-dashed"
            style={{ borderColor: "rgba(123,47,255,0.3)" }}
          >
            <h2 className="text-sm font-bold font-mono text-white mb-4 flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-400" /> Report a Bug
            </h2>
            <p className="text-xs text-[#8888bb] mb-4">
              Found a glitch in the matrix? Let us know so we can patch it up.
            </p>
            <Link href="https://github.com/rudraparmar76/HackTrack/issues/new" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full text-xs font-mono gap-2 hover:bg-red-500/10 hover:text-red-400 border-red-500/20 text-[#8888bb]">
                Open GitHub Issue <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
