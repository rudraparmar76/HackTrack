"use client";

const sizes = {
  sm: { icon: 24, fontSize: 8, gap: 6 },
  md: { icon: 32, fontSize: 10, gap: 8 },
  lg: { icon: 48, fontSize: 14, gap: 10 },
} as const;

type LogoSize = keyof typeof sizes;

export default function Logo({
  size = "md",
  showText = true,
  className = "",
}: {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}) {
  const s = sizes[size];

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      {/* Icon: Terminal window + lightning bolt */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 0 6px rgba(123,47,255,0.6))",
          flexShrink: 0,
        }}
      >
        {/* Terminal window outline */}
        <rect
          x="3"
          y="6"
          width="42"
          height="36"
          rx="4"
          stroke="#7b2fff"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Title bar line */}
        <line
          x1="3"
          y1="14"
          x2="45"
          y2="14"
          stroke="#7b2fff"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {/* Title bar dots */}
        <circle cx="9" cy="10" r="1.5" fill="#7b2fff" opacity="0.6" />
        <circle cx="14" cy="10" r="1.5" fill="#7b2fff" opacity="0.4" />
        <circle cx="19" cy="10" r="1.5" fill="#7b2fff" opacity="0.3" />

        {/* Terminal prompt >_ */}
        <path
          d="M10 22L16 27L10 32"
          stroke="#7b2fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="19"
          y1="32"
          x2="27"
          y2="32"
          stroke="#7b2fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Lightning bolt cutting through */}
        {/* <path
          d="M30 16L25 26H32L27 38"
          stroke="#00e5ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M30 16L25 26H32L27 38"
          fill="#00e5ff"
          opacity="0.15"
        /> */}
      </svg>

      {/* Text part */}
      {showText && (
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: s.fontSize,
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#fff" }}>HACK</span>
          <span style={{ color: "#7b2fff" }}>TRACK</span>
        </span>
      )}
    </span>
  );
}
