import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function hoursUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60));
}

/** Returns countdown CSS class based on urgency */
export function getCountdownClass(date: string | Date | null | undefined): string {
  const hours = hoursUntil(date);
  if (hours === null) return "countdown-normal";
  if (hours <= 24) return "countdown-urgent";
  if (hours <= 168) return "countdown-warning"; // 7 days
  return "countdown-normal";
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "submitted":
      return "bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30";
    case "upcoming":
    case "building":
      return "bg-[#EF9F27]/15 text-[#EF9F27] border-[#EF9F27]/30";
    case "registered":
      return "bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/30";
    case "ideating":
      return "bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30";
    case "won":
      return "bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30 shadow-[0_0_10px_rgba(255,215,0,0.15)]";
    case "lost":
      return "bg-red-500/15 text-red-500 border-red-500/30";
    case "completed":
    case "archived":
    case "withdrew":
    case "interested":
      return "bg-[#454D66]/20 text-[#454D66] border-[#454D66]/30";
    default:
      return "bg-[#454D66]/20 text-[#454D66] border-[#454D66]/30";
  }
}

export function getPlatformColor(platform: string | null | undefined): string {
  switch (platform?.toLowerCase()) {
    case "devfolio":
      return "bg-[#00D4FF]/15 text-[#00D4FF]";
    case "unstop":
      return "bg-[#EF9F27]/15 text-[#EF9F27]";
    case "devpost":
      return "bg-[#00D4FF]/15 text-[#00D4FF]";
    case "dorahacks":
      return "bg-[#7b2fff]/15 text-[#7b2fff]";
    default:
      return "bg-[#454D66]/20 text-[#7A8099]";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "high":
      return "bg-[#EF9F27]/15 text-[#EF9F27] border-[#EF9F27]/30";
    case "medium":
      return "bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/30";
    case "low":
      return "bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30";
    default:
      return "bg-[#454D66]/20 text-[#7A8099] border-[#454D66]/30";
  }
}
