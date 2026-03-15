import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "HackTrack — Hackathon Command Center",
  description:
    "Track your hackathons, auto-extract event details, manage teams, set reminders, and track progress from idea to submission.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F1117]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
