# dormplanner

Event planner for UW Seattle dorms. Students create events (cooking nights,
pizza parties, study breaks, grocery runs — anything), others on their floor
or dorm RSVP, and everyone shares a live, editable "what to bring" list.

## What's in v1

- **Guest RSVPs** — no account needed, just type your name once
- Username + password accounts for **hosts** (who create events)
- Dorm + floor profile; feed defaults to your dorm
- Event creation with templates (potluck, pizza, study break, cooking night…)
- RSVP (yes / maybe / can't) with capacity cap
- **Live collaborative bring-list** with quantity + dietary tags (veg, GF, halal, ⚠ pork, ⚠ alcohol…) — polls every ~2.5s
- Quiet-hours warning for weeknight events past 10pm

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Drizzle ORM** → TigerData Postgres
- **Auth.js (NextAuth v5)** with Credentials provider (username + bcrypt password, JWT sessions)

## Setup

```bash
# 1. install
npm install

# 2. configure env — copy .env.example and fill in
cp .env.example .env.local
#   DATABASE_URL  — your TigerData service URI
#   AUTH_SECRET   — node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. migrate schema + seed dorms
npm run db:migrate
npm run db:seed

# 4. run
npm run dev
```

Open http://localhost:3000. Browse events + RSVP as a guest, or hit **Sign in to host → Create one** to make a host account.

## Deploy

**Vercel** is the fast path:

1. Push the repo to GitHub.
2. Import into Vercel (free tier is plenty for a hackathon).
3. Set the env vars from `.env.example` in Project Settings → Environment Variables.
4. Add your GoDaddy domain in Vercel → Domains, then at GoDaddy point the
   `CNAME` for `www` to `cname.vercel-dns.com` and the apex `A` record to `76.76.21.21`.
5. Update `AUTH_URL` to the deployed URL.

## Roadmap (stretch goals)

- **Leftovers board** — "we have 6 slices of pizza in Lander 304"
- **Cost-split helper** — attach Venmo/Zelle handle to a bring-item
- **Grocery run** event type with ingredient list
- **Recurring events** — weekly Sunday dinners
- Floor-level feed (not just dorm-level)
- Push notifications when a bring-list item you claimed changes
