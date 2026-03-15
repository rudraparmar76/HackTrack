# HackTrack — Hackathon Command Center

> A pro hacker's war room for tracking hackathons. Dark charcoal meets electric green.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3FCF8E?logo=supabase)

## Features

- **Smart Link Scraper** — Paste any hackathon URL and auto-extract dates, prizes, tracks
- **Visual Dashboard** — Status filters, countdown timers, and smart sorting
- **Kanban Progress** — Drag tasks from Idea → Design → Building → Testing → Submitted
- **Team Management** — Add members, assign roles, track capacity
- **Smart Reminders** — Auto-reminders for deadlines and announcements
- **Rich Notes** — Per-hackathon notes for ideas, tech stack, API keys

## Design System

| Token | Value |
|---|---|
| Background Page | `#0F1117` |
| Background Card | `#1A1F2E` |
| Background Sidebar | `#151820` |
| Accent Green | `#00FF87` |
| Accent Cyan | `#00D4FF` |
| Accent Amber | `#EF9F27` |
| Font UI | DM Sans |
| Font Mono | JetBrains Mono |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom CSS
- **UI Components:** Radix UI / shadcn-ui
- **Animations:** Framer Motion
- **Backend:** Supabase (Auth, Postgres, Realtime)
- **Scraper:** FastAPI + BeautifulSoup (separate service)

## Getting Started

```bash
cd frontend
npm install
cp .env.local.example .env.local  # Add your Supabase keys
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Auth-protected pages
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── hackathon/    # Detail & new hackathon
│   │   │   ├── reminders/    # Reminder management
│   │   │   ├── notifications/# Notification center
│   │   │   └── settings/     # Profile settings
│   │   ├── login/            # Auth page
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── sidebar.tsx       # Main navigation
│   │   └── ui/               # shadcn/ui primitives
│   └── lib/
│       ├── utils.ts          # Helpers & color utilities
│       └── supabase/         # Supabase client config
├── tailwind.config.js
└── package.json
```

## License

Private — All rights reserved.
