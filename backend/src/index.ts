import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const resendFrom = process.env.RESEND_FROM_EMAIL || "HackTrack <info@hack-track.tech>";
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://www.hack-track.tech"
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

const DEFAULT_CHECKLIST_ITEMS = [
  "Read all problem statements",
  "Form team & assign roles",
  "Finalise project idea",
  "Set up GitHub repository",
  "Build working prototype",
  "Record demo video (max 3 min)",
  "Write project README",
  "Deploy project (Vercel/Railway/etc)",
  "Submit project link on platform",
  "Submit devpost/devfolio submission form",
];

async function insertDefaultChecklist(hackathonId: string) {
  const rows = DEFAULT_CHECKLIST_ITEMS.map((label, idx) => ({
    hackathon_id: hackathonId,
    label,
    checked: false,
    order_index: idx,
  }));
  const { data } = await supabase.from("checklist_items").insert(rows).select("*");
  return data || [];
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

type TeamMemberEmailRow = {
  hackathon_id: string;
  email: string | null;
};

type TeamInviteRow = {
  id: string;
  hackathon_id: string;
  email: string;
  name: string | null;
  role: string | null;
  token: string;
  status: string;
  invited_by: string;
  expires_at: string | null;
  accepted_at: string | null;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  // Pre-fetch team member emails for all hackathons in due reminders
  const reminderHackathonIds = [...new Set(reminders.map((r) => r.hackathon_id).filter(Boolean))] as string[];
  const teamByHackathon = new Map<string, Set<string>>();
  if (reminderHackathonIds.length > 0) {
    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select("hackathon_id, email")
      .in("hackathon_id", reminderHackathonIds)
      .not("email", "is", null);
    if (!teamError) {
      for (const row of (teamRows || []) as TeamMemberEmailRow[]) {
        if (!row.email) continue;
        const emails = teamByHackathon.get(row.hackathon_id) || new Set<string>();
        emails.add(row.email.toLowerCase());
        teamByHackathon.set(row.hackathon_id, emails);
      }
    }
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const ownerEmail = await getUserEmail(reminder.user_id);

    // Collect all recipients: owner + team members
    const recipients = new Set<string>();
    if (ownerEmail) recipients.add(ownerEmail.toLowerCase());
    if (reminder.hackathon_id) {
      const teammateEmails = teamByHackathon.get(reminder.hackathon_id);
      if (teammateEmails) {
        for (const memberEmail of teammateEmails) {
          recipients.add(memberEmail);
        }
      }
    }

    if (recipients.size === 0) {
      skipped += 1;
      continue;
    }

    try {
      const hackathonName = reminder.hackathons?.[0]?.name || "Your Hackathon";
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2 style="margin-bottom: 8px;">HackTrack Reminder</h2>
            <p style="margin: 0 0 8px 0;"><strong>${hackathonName}</strong></p>
            <p style="margin: 0 0 8px 0;">${reminder.message}</p>
            <p style="margin: 0; color: #555;">Scheduled at: ${formatDeadline(reminder.remind_at)}</p>
          </div>
        `;

      for (const recipientEmail of recipients) {
        try {
          await resend.emails.send({
            from: resendFrom,
            to: recipientEmail,
            subject: `Deadline Reminder: ${hackathonName}`,
            html: emailHtml,
          });
          sent += 1;
        } catch (emailError) {
          console.error("Reminder email send failed", reminder.id, recipientEmail, emailError);
          failed += 1;
        }
      }

      await supabase.from("reminders").update({ sent: true }).eq("id", reminder.id);

      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        hackathon_id: reminder.hackathon_id,
        message: `Email reminder sent: ${reminder.message}`,
        read: false,
      });
    } catch (outerError) {
      console.error("Reminder processing failed", reminder.id, outerError);
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
  const hackathonIds = rows.map((row) => row.id);
  const teamByHackathon = new Map<string, Set<string>>();

  if (hackathonIds.length > 0) {
    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select("hackathon_id, email")
      .in("hackathon_id", hackathonIds)
      .not("email", "is", null);

    if (teamError) throw teamError;

    for (const row of (teamRows || []) as TeamMemberEmailRow[]) {
      if (!row.email) continue;
      const emails = teamByHackathon.get(row.hackathon_id) || new Set<string>();
      emails.add(row.email.toLowerCase());
      teamByHackathon.set(row.hackathon_id, emails);
    }
  }

  const grouped = new Map<string, HackathonDeadlineRow[]>();
  const ownerByEmail = new Map<string, string>();

  for (const row of rows) {
    const recipients = new Set<string>();
    const ownerEmail = await getUserEmail(row.user_id);
    if (ownerEmail) {
      const ownerEmailKey = ownerEmail.toLowerCase();
      recipients.add(ownerEmailKey);
      ownerByEmail.set(ownerEmailKey, row.user_id);
    }

    const teammateEmails = teamByHackathon.get(row.id);
    if (teammateEmails) {
      for (const memberEmail of teammateEmails) {
        recipients.add(memberEmail);
      }
    }

    for (const recipient of recipients) {
      const current = grouped.get(recipient) || [];
      current.push(row);
      grouped.set(recipient, current);
    }
  }

  let usersEmailed = 0;
  let usersSkipped = 0;

  for (const [email, hackathons] of grouped.entries()) {

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

      const ownerId = ownerByEmail.get(email);
      if (ownerId) {
        await supabase.from("notifications").insert({
          user_id: ownerId,
          message: "Daily deadline digest email sent",
          read: false,
        });
      }

      usersEmailed += 1;
    } catch (emailError) {
      console.error("Daily digest email failed", email, emailError);
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
  const dueRows = rows.filter((row) => {
    const regDueToday = daysUntil(row.registration_deadline) === 0;
    const subDueToday = daysUntil(row.submission_deadline) === 0;
    return regDueToday || subDueToday;
  });

  const dueHackathonIds = dueRows.map((row) => row.id);
  const teamByHackathon = new Map<string, Set<string>>();

  if (dueHackathonIds.length > 0) {
    const { data: teamRows, error: teamError } = await supabase
      .from("team_members")
      .select("hackathon_id, email")
      .in("hackathon_id", dueHackathonIds)
      .not("email", "is", null);

    if (teamError) throw teamError;

    for (const row of (teamRows || []) as TeamMemberEmailRow[]) {
      if (!row.email) continue;
      const emails = teamByHackathon.get(row.hackathon_id) || new Set<string>();
      emails.add(row.email.toLowerCase());
      teamByHackathon.set(row.hackathon_id, emails);
    }
  }

  const grouped = new Map<string, HackathonDeadlineRow[]>();
  const ownerByEmail = new Map<string, string>();

  for (const row of dueRows) {
    const recipients = new Set<string>();
    const ownerEmail = await getUserEmail(row.user_id);
    if (ownerEmail) {
      const ownerEmailKey = ownerEmail.toLowerCase();
      recipients.add(ownerEmailKey);
      ownerByEmail.set(ownerEmailKey, row.user_id);
    }

    const teammateEmails = teamByHackathon.get(row.id);
    if (teammateEmails) {
      for (const memberEmail of teammateEmails) {
        recipients.add(memberEmail);
      }
    }

    for (const recipient of recipients) {
      const current = grouped.get(recipient) || [];
      current.push(row);
      grouped.set(recipient, current);
    }
  }

  let usersEmailed = 0;
  let usersSkipped = 0;

  for (const [email, dueHackathons] of grouped.entries()) {
    const ownerId = ownerByEmail.get(email);
    if (ownerId) {
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", ownerId)
        .eq("message", dedupeTag)
        .maybeSingle();

      if (existingNotification) {
        usersSkipped += 1;
        continue;
      }
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

      if (ownerId) {
        await supabase.from("notifications").insert([
          {
            user_id: ownerId,
            message: dedupeTag,
            read: true,
          },
          {
            user_id: ownerId,
            message: `Deadline alert email sent for ${todayKey}`,
            read: false,
          },
        ]);
      }

      usersEmailed += 1;
    } catch (emailError) {
      console.error("Today deadline alert email failed", email, emailError);
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

// ============ STATS ============
app.get("/api/stats", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .select("status, won")
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });

  const hackathons = data || [];
  
  const wins = hackathons.filter(h => h.won === true || h.status === "won").length;
  // Active = pipeline status is between registered and submitted
  const active = hackathons.filter(h => 
    ["registered", "ideating", "building", "submitted"].includes(h.status?.toLowerCase())
  ).length;
  // Participated = everything except interested
  const participated = hackathons.filter(h => 
    h.status && h.status.toLowerCase() !== "interested"
  ).length;

  res.json({ wins, active, participated, total: hackathons.length });
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

  // Fetch hackathons owned by the user
  const { data: ownedData, error: ownedError } = await supabase
    .from("hackathons")
    .select("*, team_members(id, name), problem_statements(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ownedError) return res.status(500).json({ error: ownedError.message });

  const owned = ownedData || [];
  const ownedIds = new Set(owned.map((h: any) => h.id));

  // Also fetch hackathons where the user is a team member
  let shared: any[] = [];
  if (user.email) {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("hackathon_id")
      .eq("email", user.email.toLowerCase());

    const sharedIds = (memberships || [])
      .map((r: any) => r.hackathon_id)
      .filter((id: string) => id && !ownedIds.has(id));

    const uniqueSharedIds = [...new Set(sharedIds)] as string[];

    if (uniqueSharedIds.length > 0) {
      const { data: sharedData } = await supabase
        .from("hackathons")
        .select("*, team_members(id, name), problem_statements(*)")
        .in("id", uniqueSharedIds)
        .order("created_at", { ascending: false });
      shared = sharedData || [];
    }
  }

  res.json([...owned, ...shared]);
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

  // Auto-insert default checklist items for new hackathon
  if (data?.id) {
    await insertDefaultChecklist(data.id);
  }

  res.json(data);
});

app.get("/api/hackathons/:id", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathons")
    .select("*, team_members(*), problem_statements(*), tasks(*), notes(*)")
    .eq("id", req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Not found" });

  // Allow access if user is the owner
  const isOwner = data.user_id === user.id;

  // Or if user is a team member
  let isMember = false;
  if (!isOwner && user.email) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("hackathon_id", req.params.id)
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    isMember = Boolean(membership);
  }

  if (!isOwner && !isMember) {
    return res.status(403).json({ error: "Access denied" });
  }

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

app.get("/api/team-invites/:token", async (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(400).json({ error: "Token is required" });

  const { data, error } = await supabase
    .from("team_invites")
    .select("id, email, role, status, expires_at, hackathon_id, hackathons(name)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: "Invite not found" });

  const isExpired = data.expires_at ? new Date(data.expires_at).getTime() < Date.now() : false;
  res.json({
    id: data.id,
    email: data.email,
    role: data.role,
    status: data.status,
    expires_at: data.expires_at,
    is_expired: isExpired,
    hackathon_id: data.hackathon_id,
    hackathon_name: data.hackathons?.[0]?.name || "Hackathon",
  });
});

app.post("/api/hackathons/:id/invites", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const hackathonId = req.params.id;
  const emailRaw = String(req.body?.email || "").trim().toLowerCase();
  const role = String(req.body?.role || "Member").trim();
  const name = req.body?.name ? String(req.body.name).trim() : null;

  if (!isValidEmail(emailRaw)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  // Prevent owner from inviting themselves
  const ownerEmail = (user.email || "").toLowerCase();
  if (emailRaw === ownerEmail) {
    return res.status(400).json({ error: "You cannot invite yourself to your own team" });
  }

  const { data: hackathon, error: hackathonError } = await supabase
    .from("hackathons")
    .select("id, name, user_id")
    .eq("id", hackathonId)
    .eq("user_id", user.id)
    .single();

  if (hackathonError || !hackathon) {
    return res.status(404).json({ error: "Hackathon not found" });
  }

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("email", emailRaw)
    .maybeSingle();

  if (existingMember) {
    return res.status(409).json({ error: "This email is already a team member" });
  }

  const { data: existingInvite } = await supabase
    .from("team_invites")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("email", emailRaw)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return res.status(409).json({ error: "A pending invite already exists for this email" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("team_invites")
    .insert({
      hackathon_id: hackathonId,
      email: emailRaw,
      name,
      role,
      token,
      status: "pending",
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (resend) {
    const frontendUrl = process.env.FRONTEND_URL || "https://www.hack-track.tech";
    // console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
    const inviteUrl = `${frontendUrl}/invite/accept?token=${token}`;
    const safeHackathonName = escapeHtml(hackathon.name || "Hackathon");
    const safeInviterName = escapeHtml((user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email || "Your teammate");

    try {
      await resend.emails.send({
        from: resendFrom,
        to: emailRaw,
        subject: `You're invited to join ${hackathon.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
            <h2 style="margin-bottom: 8px;">HackTrack Team Invite</h2>
            <p style="margin: 0 0 8px 0;"><strong>${safeInviterName}</strong> invited you to join <strong>${safeHackathonName}</strong>.</p>
            <p style="margin: 0 0 14px 0;">Role: <strong>${escapeHtml(role)}</strong></p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 10px 14px; background: #00FF87; color: #111; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invite</a>
            <p style="margin-top: 12px; color: #555; font-size: 12px;">This invite expires in 7 days.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Team invite email failed", emailError);
    }
  }

  res.json(data);
});

app.post("/api/team-invites/accept", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const token = String(req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token is required" });

  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (inviteError || !invite) return res.status(404).json({ error: "Invite not found" });

  const inviteRow = invite as TeamInviteRow;
  if (inviteRow.status !== "pending") return res.status(409).json({ error: "Invite already processed" });
  if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: "Invite expired" });
  }

  const authEmail = (user.email || "").toLowerCase();
  if (!authEmail || authEmail !== inviteRow.email.toLowerCase()) {
    return res.status(403).json({ error: "Sign in with the invited email to accept this invite" });
  }

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("hackathon_id", inviteRow.hackathon_id)
    .eq("email", authEmail)
    .maybeSingle();

  if (!existingMember) {
    const fallbackName =
      inviteRow.name ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      authEmail.split("@")[0];

    const { error: memberError } = await supabase.from("team_members").insert({
      hackathon_id: inviteRow.hackathon_id,
      name: fallbackName,
      email: authEmail,
      role: inviteRow.role || "Member",
    });

    if (memberError) return res.status(500).json({ error: memberError.message });
  }

  const { error: updateError } = await supabase
    .from("team_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_user_id: user.id })
    .eq("id", inviteRow.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  await supabase.from("notifications").insert({
    user_id: inviteRow.invited_by,
    hackathon_id: inviteRow.hackathon_id,
    message: `${authEmail} accepted your team invite`,
    read: false,
  });

  res.json({ success: true, hackathon_id: inviteRow.hackathon_id });
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

// ============ SUBMISSION CHECKLIST ============
app.get("/api/hackathons/:id/checklist", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("hackathon_id", req.params.id)
    .order("order_index", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  
  // If no items exist, this might be an older tracked hackathon. Auto-populate!
  if (!data || data.length === 0) {
    const insertedItems = await insertDefaultChecklist(req.params.id);
    return res.json(insertedItems.length > 0 ? insertedItems : []);
  }

  res.json(data);
});

app.post("/api/hackathons/:id/checklist", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const label = String(req.body?.label || "").trim();
  if (!label) return res.status(400).json({ error: "Label is required" });

  // Get highest order_index for this hackathon
  const { data: existing } = await supabase
    .from("checklist_items")
    .select("order_index")
    .eq("hackathon_id", req.params.id)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = (existing && existing.length > 0 ? existing[0].order_index : -1) + 1;

  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      hackathon_id: req.params.id,
      label,
      checked: false,
      order_index: nextIndex,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch("/api/checklist/:itemId", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const updates: Record<string, any> = {};
  if (typeof req.body.checked === "boolean") updates.checked = req.body.checked;
  if (typeof req.body.label === "string") updates.label = req.body.label.trim();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { data, error } = await supabase
    .from("checklist_items")
    .update(updates)
    .eq("id", req.params.itemId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/checklist/:itemId", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", req.params.itemId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Reorder checklist items (batch update order_index)
app.patch("/api/hackathons/:id/checklist/reorder", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const items: { id: string; order_index: number }[] = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is required" });
  }

  const updates = items.map((item) =>
    supabase
      .from("checklist_items")
      .update({ order_index: item.order_index })
      .eq("id", item.id)
      .eq("hackathon_id", req.params.id)
  );

  await Promise.all(updates);
  res.json({ success: true });
});

// ============ LOOKING FOR TEAM (LFT) ============
app.get("/api/hackathons/:id/lft", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // 1. Get current hackathon to find its global identifier (url or name)
  const { data: currentHackathon } = await supabase
    .from("hackathons")
    .select("url, name")
    .eq("id", req.params.id)
    .single();

  if (!currentHackathon) return res.status(404).json({ error: "Hackathon not found" });

  // 2. Find all local hackathon IDs that represent this same global hackathon
  let matchingIds = [req.params.id];
  
  if (currentHackathon.name) {
    // Match by exact name first, as URLs might have trailing slash differences
    const { data: matches } = await supabase
      .from("hackathons")
      .select("id")
      .eq("name", currentHackathon.name);
      
    if (matches && matches.length > 0) {
      matchingIds = matches.map((m: any) => m.id);
    }
  } else if (currentHackathon.url) {
    // Fallback to URL if name is somehow missing
    const { data: matches } = await supabase
      .from("hackathons")
      .select("id")
      .eq("url", currentHackathon.url);
    if (matches) matchingIds = matches.map((m: any) => m.id);
  }

  // 3. Get all active LFT posts across all matching hackathon instances
  const { data, error } = await supabase
    .from("lft_posts")
    .select("*")
    .in("hackathon_id", matchingIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Attach display name for each post's user
  const posts = data || [];
  const userIds = [...new Set(posts.map((p: any) => p.user_id))];
  const nameMap = new Map<string, { name: string; avatar_url: string | null }>();
  for (const uid of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(uid);
    if (userData?.user) {
      const meta = userData.user.user_metadata || {};
      nameMap.set(uid, {
        name: (meta.full_name as string) || (meta.name as string) || userData.user.email?.split("@")[0] || "User",
        avatar_url: (meta.avatar_url as string) || null,
      });
    }
  }

  const enriched = posts.map((p: any) => ({
    ...p,
    display_name: nameMap.get(p.user_id)?.name || "User",
    avatar_url: nameMap.get(p.user_id)?.avatar_url || null,
    is_own: p.user_id === user.id,
  }));

  res.json(enriched);
});

app.post("/api/hackathons/:id/lft", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const skills = Array.isArray(req.body.skills) ? req.body.skills.map((s: any) => String(s).trim()).filter(Boolean) : [];
  const lookingFor = Array.isArray(req.body.looking_for) ? req.body.looking_for.map((s: any) => String(s).trim()).filter(Boolean) : [];
  const message = String(req.body.message || "").trim().slice(0, 300);
  const discordHandle = req.body.discord_handle ? String(req.body.discord_handle).trim() : null;
  const twitterHandle = req.body.twitter_handle ? String(req.body.twitter_handle).trim() : null;

  if (skills.length === 0) return res.status(400).json({ error: "At least one skill is required" });
  if (lookingFor.length === 0) return res.status(400).json({ error: "At least one role needed is required" });
  if (!message) return res.status(400).json({ error: "Message is required" });

  const { data, error } = await supabase
    .from("lft_posts")
    .upsert(
      {
        hackathon_id: req.params.id,
        user_id: user.id,
        skills,
        looking_for: lookingFor,
        message,
        discord_handle: discordHandle,
        twitter_handle: twitterHandle,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "hackathon_id,user_id" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/lft/:postId", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("lft_posts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", req.params.postId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Post not found" });
  res.json({ success: true });
});

app.get("/api/lft/mine", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("lft_posts")
    .select("*, hackathons(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ============ AI IDEA GENERATOR ============
app.post("/api/hackathons/:id/generate-ideas", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (!groq) return res.status(500).json({ error: "AI service not configured" });

  const hackathonId = req.params.id;

  try {
    // Verify hackathon access
    const { data: hackathon, error: hackError } = await supabase
      .from("hackathons")
      .select("id, name, prize_pool, user_id")
      .eq("id", hackathonId)
      .single();

    if (hackError || !hackathon) return res.status(404).json({ error: "Hackathon not found" });

    // Check access: owner or team member
    let hasAccess = hackathon.user_id === user.id;
    if (!hasAccess && user.email) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("id")
        .eq("hackathon_id", hackathonId)
        .eq("email", user.email.toLowerCase())
        .maybeSingle();
      hasAccess = Boolean(membership);
    }
    if (!hasAccess) return res.status(403).json({ error: "Access denied" });

    // Rate limit: max 3 generations per user per hackathon
    const { count, error: countError } = await supabase
      .from("hackathon_ideas")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .eq("user_id", user.id);

    if (countError) return res.status(500).json({ error: countError.message });
    if ((count || 0) >= 3) {
      return res.status(429).json({ error: "Generation limit reached (3/3). You've used all your idea generations for this hackathon." });
    }

    // Fetch problem statements
    const { data: problems } = await supabase
      .from("problem_statements")
      .select("title, track")
      .eq("hackathon_id", hackathonId);

    if (!problems || problems.length === 0) {
      return res.status(400).json({ error: "Add problem statements first to get targeted ideas" });
    }

    // Build prompt
    const systemPrompt = "You are a hackathon mentor who has judged 500+ hackathons. Generate practical, innovative, and winnable project ideas. Focus on ideas that are impressive but feasible within a typical 24-48 hour hackathon. Always return valid JSON only, no markdown formatting.";

    const userPrompt = `Hackathon: ${hackathon.name}
Problem statements/tracks: ${JSON.stringify(problems)}
Prize: ${hackathon.prize_pool || "Not specified"}

Generate 4 project ideas. For each idea return JSON with these exact fields:
{
  "title": string (catchy project name),
  "tagline": string (one compelling sentence),
  "track": string (which problem statement/track it targets),
  "tech_stack": string[] (3-4 specific technologies),
  "wow_factor": string (what makes judges pick this over others),
  "difficulty": "beginner" | "intermediate" | "advanced",
  "feasibility_hours": number (realistic hours to build MVP)
}

Return a JSON array of 4 ideas only. No markdown, no code fences, just the JSON array.`;

    // Call Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const rawContent = chatCompletion.choices?.[0]?.message?.content || "[]";

    // Parse the response
    let ideas: any[];
    try {
      const parsed = JSON.parse(rawContent);
      // Handle both direct array and { ideas: [...] } wrapper
      ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.projects || parsed.data || []);
    } catch {
      console.error("Failed to parse Groq response:", rawContent);
      return res.status(500).json({ error: "AI returned invalid response. Please try again." });
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      return res.status(500).json({ error: "AI returned empty ideas. Please try again." });
    }

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from("hackathon_ideas")
      .insert({
        hackathon_id: hackathonId,
        user_id: user.id,
        ideas: ideas,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save ideas:", saveError);
      return res.status(500).json({ error: saveError.message });
    }

    res.json({ ideas, id: saved.id, generation: (count || 0) + 1 });
  } catch (error: any) {
    console.error("Generate ideas error:", error);
    res.status(500).json({ error: error.message || "Failed to generate ideas" });
  }
});

app.get("/api/hackathons/:id/ideas", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("hackathon_ideas")
    .select("*")
    .eq("hackathon_id", req.params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ============ PUBLIC HACKATHON DISCOVERY ============
app.get("/api/public/hackathons", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const platform = (req.query.platform as string)?.trim();
    const status = (req.query.status as string)?.trim() || "open";
    const search = (req.query.search as string)?.trim();
    const sort = (req.query.sort as string)?.trim() || "newest";

    let query = supabase
      .from("public_hackathons")
      .select("id, name, platform, banner_url, description, start_date, end_date, registration_deadline, prize_pool, tags, source_url, status", { count: "exact" })
      .eq("is_public", true);

    if (status) query = query.eq("status", status);
    if (platform) query = query.ilike("platform", platform);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    // Sorting
    switch (sort) {
      case "deadline":
        query = query.order("registration_deadline", { ascending: true, nullsFirst: false });
        break;
      case "prize":
        query = query.order("prize_pool", { ascending: false, nullsFirst: false });
        break;
      case "newest":
      default:
        query = query.order("scraped_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({
      hackathons: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("Public hackathons error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cron: Scrape hackathons from all platforms and upsert into public_hackathons
app.all("/api/cron/scrape-hackathons", async (req, res) => {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: "Unauthorized cron request" });

  try {
    const scraperUrl = process.env.SCRAPER_URL;
    if (!scraperUrl) return res.status(500).json({ error: "SCRAPER_URL not configured" });

    const response = await fetch(`${scraperUrl}/crawl/all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120000), // 2 min timeout for crawling
    });

    const crawlData: any = await response.json();
    const hackathons = crawlData.hackathons || [];

    let upserted = 0;
    let failed = 0;

    for (const h of hackathons) {
      const row: Record<string, any> = {
        name: h.name,
        platform: h.platform || null,
        banner_url: h.banner_url || null,
        description: h.description || null,
        prize_pool: h.prize_pool || null,
        tags: h.tags || [],
        source_url: h.source_url,
        status: h.status || "open",
        is_public: true,
        scraped_at: new Date().toISOString(),
      };

      if (h.start_date) row.start_date = h.start_date;
      if (h.end_date) row.end_date = h.end_date;
      if (h.registration_deadline) row.registration_deadline = h.registration_deadline;

      const { error } = await supabase
        .from("public_hackathons")
        .upsert(row, { onConflict: "source_url" });

      if (error) {
        console.error("Upsert failed:", h.source_url, error.message);
        failed += 1;
      } else {
        upserted += 1;
      }
    }

    res.json({
      ok: true,
      job: "scrape-hackathons",
      result: {
        crawled: hackathons.length,
        upserted,
        failed,
        by_platform: crawlData.by_platform || {},
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron scrape-hackathons failed", error);
    res.status(500).json({ ok: false, job: "scrape-hackathons", error: error.message || "Unknown error" });
  }
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
