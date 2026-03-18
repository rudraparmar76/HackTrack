import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://hackk-track.vercel.app",
  "https://frontend-eight-umber-62.vercel.app",
]);

function isAllowedPreviewOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    if (!hostname.endsWith(".vercel.app")) return false;

    // Allow preview deployments for this project naming pattern.
    return hostname.startsWith("hackk-track-") || hostname.startsWith("frontend-");
  } catch {
    return false;
  }
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header).
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin) || isAllowedPreviewOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ SCRAPER PROXY ============
app.post("/api/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const scraperUrl = process.env.SCRAPER_URL || "https://hacktrack-scraper.onrender.com";
    const response = await fetch(`${scraperUrl}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Scraper error:", error.message);
    res.json({
      scrape_success: false,
      name: "",
      platform: "",
      error: "Scraper service unavailable. Please enter details manually.",
    });
  }
});

// ============ HACKATHONS ============
// Middleware to extract user from auth header
async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

app.get("/api/hackathons", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .select("*, team_members(id, name), problem_statements(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/hackathons", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .insert({ ...req.body, user_id: user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/hackathons/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .select("*, team_members(*), problem_statements(*), tasks(*), notes(*)")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .single();

  if (error) return res.status(404).json({ error: "Not found" });
  res.json(data);
});

app.put("/api/hackathons/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .update(req.body)
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/hackathons/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await supabase
    .from("hackathons")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============ TASKS ============
app.get("/api/hackathons/:id/tasks", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("hackathon_id", req.params.id)
    .order("position");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/hackathons/:id/tasks", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...req.body, hackathon_id: req.params.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put("/api/tasks/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("tasks")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============ TEAM ============
app.get("/api/hackathons/:id/team", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("hackathon_id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/hackathons/:id/team", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("team_members")
    .insert({ ...req.body, hackathon_id: req.params.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============ REMINDERS ============
app.get("/api/reminders", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("reminders")
    .select("*, hackathons(name)")
    .eq("user_id", user.id)
    .order("remind_at");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/reminders", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("reminders")
    .insert({ ...req.body, user_id: user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/reminders/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ============ NOTIFICATIONS ============
app.get("/api/notifications", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch("/api/notifications/read-all", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Only start a local server outside Vercel Serverless runtime.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log("HackTrack API running on port " + PORT);
  });
}

export default app;
