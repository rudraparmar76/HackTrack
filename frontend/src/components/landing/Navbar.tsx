"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "DISCOVER", href: "/discover" },
  { label: "FEATURES", href: "#features" },
  { label: "ABOUT", href: "#about" },
  { label: "GITHUB", href: "https://github.com/rudraparmar76/HackTrack", external: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="landing-navbar"
    >
      <div className="navbar-inner">
        {/* Brand */}
        <Link href="/" className="navbar-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="navbar-bolt">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#7b2fff" />
          </svg>
          <span className="pixel" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
            HACK<span style={{ color: "var(--purple-primary)" }}>TRACK</span>
          </span>
        </Link>

        {/* Center links — desktop */}
        <div className="navbar-links">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-link"
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="navbar-link">
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right buttons — desktop */}
        <div className="navbar-actions">
          <Link href="/login" className="btn-ghost-sm">
            Sign In
          </Link>
          <Link href="/login" className="btn-primary-sm">
            Get Started →
          </Link>
        </div>

        {/* Hamburger — mobile */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "≡"}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="navbar-mobile-overlay"
          >
            <div className="navbar-mobile-inner">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="navbar-mobile-link"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="navbar-mobile-link"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <Link href="/login" className="btn-ghost-sm" onClick={() => setMobileOpen(false)} style={{ textAlign: "center" }}>
                  Sign In
                </Link>
                <Link href="/login" className="btn-primary-sm" onClick={() => setMobileOpen(false)} style={{ textAlign: "center" }}>
                  Get Started →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
