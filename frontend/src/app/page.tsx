"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Schedule from "@/components/landing/Schedule";
import Features from "@/components/landing/Features";
import About from "@/components/landing/About";
import Tracks from "@/components/landing/Tracks";
import TechStack from "@/components/landing/TechStack";
import FAQ from "@/components/landing/FAQ";
import DiscordCTA from "@/components/landing/DiscordCTA";
import Footer from "@/components/landing/Footer";
import CustomCursor from "@/components/landing/CustomCursor";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <CustomCursor />
      <Navbar />
      <Hero />
      <Schedule />
      <Features />
      <About />
      <Tracks />
      <TechStack />
      <FAQ />
      <DiscordCTA />
      <Footer />
    </div>
  );
}
