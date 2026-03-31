"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Schedule from "@/components/landing/Schedule";
import Features from "@/components/landing/Features";
import About from "@/components/landing/About";
import Tracks from "@/components/landing/Tracks";
import FAQ from "@/components/landing/FAQ";
import DiscordCTA from "@/components/landing/DiscordCTA";
import Footer from "@/components/landing/Footer";
import CustomCursor from "@/components/landing/CustomCursor";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "HackTrack",
            url: "https://hack-track.tech",
            description: "All-in-one hackathon tracking platform",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0" },
          }),
        }}
      />
      <CustomCursor />
      <Navbar />
      <Hero />
      <Schedule />
      <Features />
      <About />
      <Tracks />
      <FAQ />
      <DiscordCTA />
      <Footer />
    </div>
  );
}
