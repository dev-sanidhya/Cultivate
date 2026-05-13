# Cultivate - Plan.md

## What is Cultivate?
A personality-card-based social discovery platform. Users must fill out a personality card before accessing the platform. Cards surface rich info about who a person is and what they're looking for. Others browse these cards to find people worth connecting with.

## Current Approach
- Next.js 16 + TypeScript + TailwindCSS (App Router)
- Dark theme with violet accent (#8b5cf6 / violet-600)
- No auth yet - Sign In and Get Started both route to /signup
- Supabase (PostgreSQL) for data persistence - live and wired
- Profile ID stored in localStorage after signup (temporary identity until auth lands)

## What's Been Built

### Landing & Auth
- `app/page.tsx` - Homepage with hero, feature cards, CTAs
- `app/signup/page.tsx` - Card builder form (name, gender, school/college accordion). Writes to Supabase, stores profile ID in localStorage, redirects to /home

### Dashboard (app/(dashboard)/)
- `layout.tsx` - Fixed sidebar with logo + 5 nav items (Home, My Card, Search, Chat, Saved)
- `home/page.tsx` - Live card grid fetched from Supabase. Like/Save toggles (client state). Filters (UI only for now). Hides own card.
- `my-card/page.tsx` - Full profile view for the logged-in user (reads from localStorage ID)
- `search/page.tsx` - Real-time client-side search across name, college, branch. Edu and gender filters.
- `chat/page.tsx` - Conversation list shell with mock data. Real-time messaging deferred.
- `saved/page.tsx` - Liked/Saved tabs shell. Persistence deferred (needs likes/saves table).

### Components
- `components/PersonalityCard.tsx` - Reusable card UI with avatar gradient, edu info, like/save/chat actions

### Database (Supabase - ngijqnojxrxdlsobxrlw)
- `public.profiles` table: id, name, gender, edu_type, school/college fields, created_at
- RLS: open insert + select (tighten when auth lands)

### Lib
- `lib/supabase.ts` - singleton client from env vars

## Key Decisions
- Route group `(dashboard)` keeps sidebar layout isolated from landing/signup
- Profile identity via localStorage until Supabase Auth is wired
- Like/Save state is client-only for now - needs a DB table (profile_likes, profile_saves) later
- Chat is UI shell only - real-time via WebSockets/Supabase Realtime is next big feature

## Next Steps / Priorities
1. Expanded personality card fields: interests, goals, what you're looking for, personality type
2. Persist likes and saves to Supabase (profile_likes, profile_saves tables)
3. Real-time chat with Supabase Realtime / WebSockets
4. Supabase Auth (email/password or Google OAuth) - replaces localStorage identity
5. Edit profile / update card
6. Sidebar avatar shows actual user name/initials

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: TailwindCSS v4 + lucide-react icons
- DB: Supabase (PostgreSQL) - ngijqnojxrxdlsobxrlw.supabase.co
- Hosting: TBD (Vercel likely)
- Auth: TBD (Supabase Auth, deferred)
