"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type ProgressArcProps = {
  stage: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  onStageClick?: (stageId: string) => void;
  loadingStage?: string | null;
};

const STAGES = [
  { id: 0, label: "INT", name: "Interested", internalId: "interested" },
  { id: 1, label: "REG", name: "Registered", internalId: "registered" },
  { id: 2, label: "BUILD", name: "Building", internalId: "building" },
  { id: 3, label: "SUB", name: "Submitted", internalId: "submitted" },
  { id: 4, label: "WON", name: "Won", internalId: "result" },
];

const getProgressIndex = (stage: string) => {
  const s = stage?.toLowerCase() || "";
  if (s === "won" || s === "lost" || s === "withdrew" || s === "result") return 4;
  if (s === "submitted") return 3;
  if (s === "building") return 2;
  if (s === "registered") return 1;
  if (s === "active" || s === "ideating") return 1; 
  return 0; // fallback to Interested
};

const getCurrentStageName = (idx: number) => {
  return STAGES.find((s) => s.id === idx)?.name || "Interested";
};

const sizesMap = {
  sm: { w: 120, h: 65, cx: 60, cy: 55, r: 48, stroke: 4 },
  md: { w: 200, h: 110, cx: 100, cy: 100, r: 80, stroke: 6 },
  lg: { w: 280, h: 150, cx: 140, cy: 135, r: 110, stroke: 6 },
};

export function ProgressArc({ stage, size = "md", animated = true, onStageClick, loadingStage }: ProgressArcProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const progressIdx = getProgressIndex(stage);
  
  // Custom display name based on current actual stage (e.g. if lost/withdrew)
  let currentStageName = getCurrentStageName(progressIdx);
  if (progressIdx === 4 && (stage === "lost" || stage === "withdrew")) {
    currentStageName = stage.charAt(0).toUpperCase() + stage.slice(1);
  }

  const { w, h, cx, cy, r, stroke } = sizesMap[size] || sizesMap.md;

  const circumference = Math.PI * r;
  const dashoffset = circumference * (1 - progressIdx / 4);
  const initialOffset = animated ? circumference : dashoffset;

  const getDotProps = (idx: number, isLostOrWithdrew: boolean) => {
    const isCompleted = idx < progressIdx;
    const isCurrent = idx === progressIdx;
    if (isCurrent) {
      if (idx === 4 && isLostOrWithdrew) {
        return { fill: "var(--purple-primary)", filter: "drop-shadow(0px 0px 4px rgba(123,47,255,0.8))" }; // Less bright for negative outcome
      }
      return { fill: "var(--cyan-accent)", filter: "drop-shadow(0px 0px 6px var(--cyan-accent))" };
    }
    if (isCompleted) {
      return { fill: "var(--purple-primary)", filter: "drop-shadow(0px 0px 4px rgba(123,47,255,0.8))" };
    }
    return { fill: "rgba(123,47,255,0.2)" };
  };

  const isLostOrWithdrew = stage === "lost" || stage === "withdrew";

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={`arcGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--purple-primary)" />
            <stop offset="100%" stopColor="var(--cyan-accent)" />
          </linearGradient>
        </defs>

        {/* Track Arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(123,47,255,0.2)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Progress Arc */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#arcGrad-${size})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: initialOffset }}
          animate={{ strokeDashoffset: mounted ? dashoffset : initialOffset }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Center Text */}
        <text
          x={cx}
          y={cy - r * 0.35}
          textAnchor="middle"
          fill="white"
          className="font-mono font-medium"
          style={{ fontSize: size === "sm" ? "10px" : size === "lg" ? "14px" : "11px" }}
        >
          {loadingStage ? "Updating..." : currentStageName}
        </text>

        {/* Stage Dots & Labels */}
        {STAGES.map((s, idx) => {
          const angle = Math.PI - (idx * Math.PI) / 4;
          const x = cx + r * Math.cos(angle);
          const y = cy - r * Math.sin(angle);
          const dotRadius = size === "sm" ? 3 : size === "md" ? 4 : 5;
          const { fill, filter } = getDotProps(idx, isLostOrWithdrew);

          // Labels positioned strictly below the dots
          const labelOffsetY = size === "sm" ? 10 : size === "md" ? 12 : 14;

          // Special logic for final dot label
          let labelText = s.label;
          if (idx === 4 && isLostOrWithdrew) {
            labelText = "END";
          }
          
          return (
            <g 
              key={s.id} 
              onClick={() => onStageClick?.(s.internalId)}
              className={onStageClick ? "cursor-pointer transition-all hover:scale-110" : ""}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle cx={x} cy={y} r={dotRadius} fill={fill} style={{ filter }} />
              {/* Increase click target area */}
              {onStageClick && (
                <circle cx={x} cy={y} r={dotRadius * 3} fill="transparent" />
              )}
              <text
                x={x}
                y={y + labelOffsetY}
                textAnchor="middle"
                className="font-mono font-bold"
                fill="var(--text-secondary)"
                style={{ fontSize: size === "sm" ? "6px" : size === "md" ? "8px" : "10px" }}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
