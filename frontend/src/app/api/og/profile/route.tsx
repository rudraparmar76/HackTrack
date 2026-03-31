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
  } catch {
    // Fallback if fetch fails
  }

  const name = profile?.display_name || username;
  const participated = profile?.stats?.total_participated || 0;
  const wins = profile?.stats?.wins || 0;
  const winRate = profile?.stats?.win_rate || "0%";
  const domains = (profile?.stats?.top_domains || []).slice(0, 3).join(" · ");
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
          backgroundColor: "#04040f",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Nebula background gradients */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,47,255,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Logo area - top left */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            left: "50px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#7b2fff",
          }}
        >
          ⬡ HackTrack
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "80px 70px",
            flex: 1,
            position: "relative",
            justifyContent: "center",
          }}
        >
          {/* Profile Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              marginBottom: "48px",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
                fontWeight: 700,
                color: accentColor,
                backgroundColor: `${accentColor}22`,
                border: `3px solid ${accentColor}44`,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            {/* Name + Username */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "52px",
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.1,
                  marginBottom: "8px",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  color: "#8888bb",
                  marginBottom: "12px",
                }}
              >
                @{username}
              </div>
              {domains && (
                <div
                  style={{
                    fontSize: "16px",
                    color: "#8888bb",
                  }}
                >
                  {domains}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              justifyContent: "flex-start",
            }}
          >
            {/* Total */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 15, 0.6)",
                border: "1px solid rgba(123, 47, 255, 0.35)",
                borderRadius: "8px",
                padding: "20px 28px",
                minWidth: "130px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#00e5ff",
                  marginBottom: "4px",
                }}
              >
                {participated}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8888bb",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                }}
              >
                Total
              </div>
            </div>

            {/* Wins */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 15, 0.6)",
                border: "1px solid rgba(123, 47, 255, 0.35)",
                borderRadius: "8px",
                padding: "20px 28px",
                minWidth: "130px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#ffd700",
                  marginBottom: "4px",
                }}
              >
                {wins}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8888bb",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                }}
              >
                Wins
              </div>
            </div>

            {/* Win Rate */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 15, 0.6)",
                border: "1px solid rgba(123, 47, 255, 0.35)",
                borderRadius: "8px",
                padding: "20px 28px",
                minWidth: "130px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#ffd700",
                  marginBottom: "4px",
                }}
              >
                {winRate}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8888bb",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                }}
              >
                Win Rate
              </div>
            </div>

            {/* Streak */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "rgba(4, 4, 15, 0.6)",
                border: "1px solid rgba(123, 47, 255, 0.35)",
                borderRadius: "8px",
                padding: "20px 28px",
                minWidth: "130px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#00e5ff",
                  marginBottom: "4px",
                }}
              >
                {streak}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#8888bb",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  fontWeight: 600,
                }}
              >
                Streak
              </div>
            </div>
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
