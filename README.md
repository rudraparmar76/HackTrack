# HackTrack 🚀

HackTrack is your all-in-one hackathon command center. From finding the perfect hackathon to building your idea, tracking progress, and bringing home the trophy, we've got you covered.

## ✨ Core Features

*   **Smart Link Scraper:** Paste an event link (Devfolio, DevPost, etc.) and our built-in AI will automatically extract all the crucial details like deadlines, prize pools, and tracks.
*   **Live Hackathon Discovery:** An actively updated *Discover* page with live hackathons scraped directly from the web, so you don't even have to hunt for them.
*   **Visual Dashboard & Kanban Progress:** Track your entire hackathon lifecycle across stages (`Interested`, `Building`, `Submitted`, `Won`) with a clean, drag-and-drop workflow.
*   **Live Countdown Timers:** Never miss a deadline again. Smart countdowns alert you about impending registration and submission cutoffs.
*   **Team Collaboration:** Invite friends to your hackathon workspace via email. Shared visibility ensures everyone is on the same page.
*   **Rich Notes System:** A unified place to capture your brainstormed ideas, API keys, tech stack decisions, and mentor feedback.
*   **AI Idea Generator:** Stuck on a problem statement? Use our generative AI tools to spin up winning project ideas.
*   **Public Profiles:** Showcase your hackathon wins, participation stats, and portfolio proudly by sharing your public `hack-track.tech/u/[username]` link.

## 🗺️ App Navigation & Pages

The application is structured around a fast, responsive Next.js frontend and a resilient Express backend:

### Marketing & Onboarding
*   🏠 **Landing Page (`/`)**: A sleek, animated overview of HackTrack's features.
*   🌟 **Discover (`/discover`)**: Browse through open hackathons collected from various platforms.
*   🔐 **Authentication (`/login`)**: Seamless sign in / sign up flow powered by Supabase Auth.

### Core Application (Protected)
*   📊 **Dashboard (`/dashboard`)**: Your personal command center displaying key stats, upcoming deadlines, and tracked hackathons.
*   ➕ **Track New Hackathon (`/hackathon/new`)**: The hub to paste links for auto-scraping or to add hackathons manually.
*   🖥️ **Hackathon Workspace (`/hackathon/[id]`)**: Deep-dive into a specific hackathon. Manage the kanban board, organize your team, write notes, and edit details.
*   ⏰ **Reminders (`/reminders`)**: Your personal push notification settings and timeline for various events.

### Social & Settings
*   🔔 **Notifications (`/notifications`)**: Alerts for upcoming deadlines and team invites.
*   🤝 **Team Invites (`/invite`)**: Securely manage and accept incoming team invitations.
*   ⚙️ **Settings (`/settings`)**: Configure your user profile, avatar, and app preferences.
*   👤 **Public Profile (`/u/[username]`)**: A fully public shareable page highlighting a user's track record and wins.

## 🛠️ Tech Stack
*   **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion, shadcn/ui
*   **Backend**: Node.js, Express, TypeScript
*   **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
*   **AI Integrations**: LLaMA via Groq API
