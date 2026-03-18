import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const resendFrom = process.env.RESEND_FROM_EMAIL || "HackTrack <onboarding@resend.dev>";

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://hack-trackk.vercel.app",
  "https://frontend-eight-umber-62.vercel.app",
]);

function isAllowedPreviewOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    if (!hostname.endsWith(".vercel.app")) return false;

    // Allow preview deployments for this project naming pattern.
    return hostname.startsWith("hack-trackk-") || hostname.startsWith("frontend-");
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

function isCronAuthorized(req: express.Request): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return process.env.VERCEL === "1" && Boolean(req.headers["x-vercel-cron"]);
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === configuredSecret) return true;
  }

  const secretHeader = req.headers["x-cron-secret"];
  if (typeof secretHeader === "string" && secretHeader === configuredSecret) {
    return true;
  }

  return false;
}

function formatDeadline(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const deadlineDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((deadlineDay - todayDay) / 86400000);
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

type ReminderRow = {
  id: string;
  user_id: string;
  hackathon_id: string | null;
  message: string;
  remind_at: string;
  type: string;
  hackathons?: { name: string | null }[] | null;
};

type HackathonDeadlineRow = {
  id: string;
  user_id: string;
  name: string;
  registration_deadline: string | null;
  submission_deadline: string | null;
};

async function sendDueReminderEmails() {
  if (!resend) {
    return { sent: 0, failed: 0, skipped: 0, reason: "RESEND_API_KEY missing" };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("reminders")
    .select("id, user_id, hackathon_id, message, remind_at, type, hackathons(name)")
    .in("type", ["email", "both"])
    .eq("sent", false)
    .lte("remind_at", nowIso)
    .order("remind_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  const reminders = (data || []) as ReminderRow[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const email = await getUserEmail(reminder.user_id);
    if (!email) {
      skipped += 1;
      continue;
    }

    try {
      const hackathonName = reminder.hackathons?.[0]?.name || "Your Hackathon";
      await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: `Deadline Reminder: ${hackathonName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2 style="margin-bottom: 8px;">HackTrack Reminder</h2>
            <p style="margin: 0 0 8px 0;"><strong>${hackathonName}</strong></p>
            <p style="margin: 0 0 8px 0;">${reminder.message}</p>
            <p style="margin: 0; color: #555;">Scheduled at: ${formatDeadline(reminder.remind_at)}</p>
          </div>
        `,
      });

      await supabase.from("reminders").update({ sent: true }).eq("id", reminder.id);

      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        hackathon_id: reminder.hackathon_id,
        message: `Email reminder sent: ${reminder.message}`,
        read: false,
      });

      sent += 1;
    } catch (emailError) {
      console.error("Reminder email send failed", reminder.id, emailError);
      failed += 1;
    }
  }

  return { sent, failed, skipped, totalDue: reminders.length };
}

async function sendDailyDeadlineDigestEmails() {
  if (!resend) {
    return { usersEmailed: 0, usersSkipped: 0, reason: "RESEND_API_KEY missing" };
  }

  const { data, error } = await supabase
    .from("hackathons")
    .select("id, user_id, name, registration_deadline, submission_deadline")
    .or("registration_deadline.not.is.null,submission_deadline.not.is.null")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data || []) as HackathonDeadlineRow[];
  const grouped = new Map<string, HackathonDeadlineRow[]>();

  for (const row of rows) {
    const current = grouped.get(row.user_id) || [];
    current.push(row);
    grouped.set(row.user_id, current);
  }

  let usersEmailed = 0;
  let usersSkipped = 0;

  for (const [userId, hackathons] of grouped.entries()) {
    const email = await getUserEmail(userId);
    if (!email) {
      usersSkipped += 1;
      continue;
    }

    const listItems = hackathons
      .sort((a, b) => {
        const aDays = Math.min(
          daysUntil(a.registration_deadline) ?? Number.MAX_SAFE_INTEGER,
          daysUntil(a.submission_deadline) ?? Number.MAX_SAFE_INTEGER
        );
        const bDays = Math.min(
          daysUntil(b.registration_deadline) ?? Number.MAX_SAFE_INTEGER,
          daysUntil(b.submission_deadline) ?? Number.MAX_SAFE_INTEGER
        );
        return aDays - bDays;
      })
      .map((h) => {
        const regLabel = formatDeadline(h.registration_deadline);
        const subLabel = formatDeadline(h.submission_deadline);
        const nearest = Math.min(
          daysUntil(h.registration_deadline) ?? Number.MAX_SAFE_INTEGER,
          daysUntil(h.submission_deadline) ?? Number.MAX_SAFE_INTEGER
        );
        const nearestText =
          nearest === Number.MAX_SAFE_INTEGER
            ? "No upcoming deadline"
            : nearest < 0
              ? `${Math.abs(nearest)} day(s) overdue`
              : nearest === 0
                ? "Due today"
                : `${nearest} day(s) left`;

        return `<li style=\"margin-bottom: 10px;\">
          <div style=\"font-weight: 600;\">${h.name}</div>
          <div style=\"color: #444;\">Registration: ${regLabel}</div>
          <div style=\"color: #444;\">Submission: ${subLabel}</div>
          <div style=\"color: #0a7a3f; font-size: 12px;\">${nearestText}</div>
        </li>`;
      })
      .join("");

    try {
      await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: "HackTrack Daily Deadlines Digest",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2 style="margin-bottom: 8px;">Your Daily Hackathon Deadlines</h2>
            <p style="margin: 0 0 12px 0; color: #555;">Here are all your tracked hackathons and their deadlines.</p>
            <ul style="padding-left: 18px; margin: 0;">
              ${listItems || "<li>No deadlines found.</li>"}
            </ul>
          </div>
        `,
      });

      await supabase.from("notifications").insert({
        user_id: userId,
        message: "Daily deadline digest email sent",
        read: false,
      });

      usersEmailed += 1;
    } catch (emailError) {
      console.error("Daily digest email failed", userId, emailError);
      usersSkipped += 1;
    }
  }

  return { usersEmailed, usersSkipped, usersFound: grouped.size };
}

async function sendTodayDeadlineAlertEmails() {
  if (!resend) {
    return { usersEmailed: 0, usersSkipped: 0, reason: "RESEND_API_KEY missing" };
  }

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const dedupeTag = `deadline-alert:${todayKey}`;

  const { data, error } = await supabase
    .from("hackathons")
    .select("id, user_id, name, registration_deadline, submission_deadline")
    .or("registration_deadline.not.is.null,submission_deadline.not.is.null");

  if (error) throw error;
  const rows = (data || []) as HackathonDeadlineRow[];
  const grouped = new Map<string, HackathonDeadlineRow[]>();

  for (const row of rows) {
    const regDueToday = daysUntil(row.registration_deadline) === 0;
    const subDueToday = daysUntil(row.submission_deadline) === 0;
    if (!regDueToday && !subDueToday) continue;

    const current = grouped.get(row.user_id) || [];
    current.push(row);
    grouped.set(row.user_id, current);
  }

  let usersEmailed = 0;
  let usersSkipped = 0;

  for (const [userId, dueHackathons] of grouped.entries()) {
    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("message", dedupeTag)
      .maybeSingle();

    if (existingNotification) {
      usersSkipped += 1;
      continue;
    }

    const email = await getUserEmail(userId);
    if (!email) {
      usersSkipped += 1;
      continue;
    }

    const listItems = dueHackathons
      .map((h) => {
        const regDueToday = daysUntil(h.registration_deadline) === 0;
        const subDueToday = daysUntil(h.submission_deadline) === 0;

        const dueLines = [
          regDueToday ? "Registration deadline is today" : "",
          subDueToday ? "Submission deadline is today" : "",
        ].filter(Boolean);

        return `<li style=\"margin-bottom: 10px;\">
          <div style=\"font-weight: 600;\">${h.name}</div>
          <div style=\"color: #444;\">${dueLines.join(" and ")}</div>
        </li>`;
      })
      .join("");

    try {
      await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: "HackTrack: Deadline Alert for Today",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2 style="margin-bottom: 8px;">Deadline Alert</h2>
            <p style="margin: 0 0 12px 0; color: #555;">These hackathon deadlines are due today:</p>
            <ul style="padding-left: 18px; margin: 0;">
              ${listItems}
            </ul>
          </div>
        `,
      });

      await supabase.from("notifications").insert([
        {
          user_id: userId,
          message: dedupeTag,
          read: true,
        },
        {
          user_id: userId,
          message: `Deadline alert email sent for ${todayKey}`,
          read: false,
        },
      ]);

      usersEmailed += 1;
    } catch (emailError) {
      console.error("Today deadline alert email failed", userId, emailError);
      usersSkipped += 1;
    }
  }

  return { usersEmailed, usersSkipped, usersDueToday: grouped.size };
}

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

    const scraperUrl = process.env.SCRAPER_URL ;
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

// ============ EMAIL CRON JOBS ============
app.all("/api/cron/reminder-dispatch", async (req, res) => {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: "Unauthorized cron request" });

  try {
    const [reminders, deadlinesToday] = await Promise.all([
      sendDueReminderEmails(),
      sendTodayDeadlineAlertEmails(),
    ]);
    res.json({
      ok: true,
      job: "reminder-dispatch",
      result: { reminders, deadlinesToday },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron reminder-dispatch failed", error);
    res.status(500).json({ ok: false, job: "reminder-dispatch", error: error.message || "Unknown error" });
  }
});

app.all("/api/cron/daily-deadlines", async (req, res) => {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: "Unauthorized cron request" });

  try {
    const result = await sendDailyDeadlineDigestEmails();
    res.json({ ok: true, job: "daily-deadlines", result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Cron daily-deadlines failed", error);
    res.status(500).json({ ok: false, job: "daily-deadlines", error: error.message || "Unknown error" });
  }
});

// Only start a local server outside Vercel Serverless runtime.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log("HackTrack API running on port " + PORT);
  });
}

export default app;
