import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "user";

  // Fetch profile data
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let profile: any = null;

  try {
    const res = await fetch(`${apiUrl}/api/public/profile/${username}`);
    if (res.ok) {
      profile = await res.json();
    }
  } catch {}

  const name = profile?.display_name || username;
  const participated = profile?.stats?.total_participated || 0;
  const wins = profile?.stats?.wins || 0;
  const winRate = profile?.stats?.win_rate || "0%";
  const domains = (profile?.stats?.top_domains || []).slice(0, 4);
  const streak = profile?.stats?.streak || 0;

  // Generate color from username hash
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const accentColor = `hsl(${hue}, 70%, 55%)`;

  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0F1117",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,47,255,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "60px 70px",
            flex: 1,
            position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "36px" }}>
            {/* Avatar */}
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 700,
                color: accentColor,
                backgroundColor: `${accentColor}22`,
                border: `3px solid ${accentColor}33`,
              }}
            >
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "42px", fontWeight: 700, color: "#E8EAF0", lineHeight: 1.1 }}>
                {name}
              </div>
              <div style={{ fontSize: "18px", color: "#7A8099", marginTop: "4px" }}>
                @{username}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#1A1F2E",
                border: "1px solid #1E2330",
                borderRadius: "16px",
                padding: "20px 32px",
                minWidth: "140px",
              }}
            >
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#00D4FF" }}>
                {participated}
              </div>
              <div style={{ fontSize: "13px", color: "#7A8099", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                Hackathons
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#1A1F2E",
                border: "1px solid #1E2330",
                borderRadius: "16px",
                padding: "20px 32px",
                minWidth: "140px",
              }}
            >
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#FFD700" }}>
                {wins}
              </div>
              <div style={{ fontSize: "13px", color: "#7A8099", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                Wins
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#1A1F2E",
                border: "1px solid #1E2330",
                borderRadius: "16px",
                padding: "20px 32px",
                minWidth: "140px",
              }}
            >
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#7b2fff" }}>
                {winRate}
              </div>
              <div style={{ fontSize: "13px", color: "#7A8099", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                Win Rate
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#1A1F2E",
                border: "1px solid #1E2330",
                borderRadius: "16px",
                padding: "20px 32px",
                minWidth: "140px",
              }}
            >
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#EF9F27" }}>
                {streak}
              </div>
              <div style={{ fontSize: "13px", color: "#7A8099", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                Mo. Streak
              </div>
            </div>
          </div>

          {/* Domains */}
          {domains.length > 0 && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {domains.map((d: string) => (
                <div
                  key={d}
                  style={{
                    backgroundColor: "rgba(167,139,250,0.12)",
                    color: "#A78BFA",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "auto",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "rgba(123,47,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "#7b2fff",
                fontWeight: 700,
              }}
            >
              H
            </div>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#E8EAF0" }}>
              Hack
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#7b2fff" }}>
              Track
            </span>
            <span style={{ fontSize: "13px", color: "#454D66", marginLeft: "8px" }}>
              hack-track.tech
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
