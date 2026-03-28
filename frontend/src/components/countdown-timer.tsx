"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  deadline: string | null | undefined;
  label?: string;
  variant?: "danger" | "warning" | "normal" | "auto";
  compact?: boolean;
}

function getTimeRemaining(deadline: string) {
  const target = new Date(deadline).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return { total: diff, days: 0, hours: 0, minutes: 0, seconds: 0, overdue: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { total: diff, days, hours, minutes, seconds, overdue: false };
}

function autoVariant(deadline: string): "danger" | "warning" | "normal" {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "normal"; // overdue
  if (diff <= 3 * 24 * 60 * 60 * 1000) return "danger";   // < 3 days
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "warning";   // < 7 days
  return "normal";
}

export default function CountdownTimer({
  deadline,
  label,
  variant = "auto",
  compact = false,
}: CountdownTimerProps) {
  const [time, setTime] = useState(() =>
    deadline ? getTimeRemaining(deadline) : null
  );

  useEffect(() => {
    if (!deadline) return;
    setTime(getTimeRemaining(deadline));
    const interval = setInterval(() => {
      setTime(getTimeRemaining(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || !time) {
    return (
      <span className="text-[10px] text-[#454D66] font-mono">TBD</span>
    );
  }

  const resolvedVariant = variant === "auto" ? autoVariant(deadline) : variant;

  const variantStyles = {
    danger: "text-red-400",
    warning: "text-[#EF9F27]",
    normal: "text-[#7A8099]",
  };

  // Overdue
  if (time.overdue) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? "" : "flex-col items-start"}`}>
        {label && <span className="text-[10px] text-[#454D66] line-through">{label}</span>}
        <span className="text-[10px] font-mono text-[#454D66]">Overdue</span>
      </div>
    );
  }

  // Due very soon (< 1 hour)
  if (time.total <= 60 * 60 * 1000) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? "" : "flex-col items-start"}`}>
        {label && <span className="text-[10px] text-[#454D66]">{label}</span>}
        <span className="text-[10px] font-mono text-red-400 animate-pulse font-bold">
          Due today!
        </span>
      </div>
    );
  }

  // Format based on time remaining
  const isUnder24h = time.total <= 24 * 60 * 60 * 1000;
  const display = isUnder24h
    ? `${time.hours}h ${time.minutes}m ${time.seconds}s`
    : `${time.days}d ${time.hours}h ${time.minutes}m`;

  if (compact) {
    return (
      <span className={`text-[10px] font-mono font-semibold ${variantStyles[resolvedVariant]}`}>
        {display}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      {label && <span className="text-[10px] text-[#454D66]">{label}</span>}
      <span className={`text-xs font-mono font-semibold tabular-nums ${variantStyles[resolvedVariant]}`}>
        {display}
      </span>
    </div>
  );
}
