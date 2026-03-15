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
  switch (status) {
    case "active":
      return "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30";
    case "upcoming":
      return "bg-[#EF9F27]/15 text-[#EF9F27] border-[#EF9F27]/30";
    case "completed":
      return "bg-[#454D66]/20 text-[#454D66] border-[#454D66]/30";
    case "archived":
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
      return "bg-[#00FF87]/15 text-[#00FF87]";
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
      return "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30";
    default:
      return "bg-[#454D66]/20 text-[#7A8099] border-[#454D66]/30";
  }
}
