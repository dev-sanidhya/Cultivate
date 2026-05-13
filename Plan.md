# Cultivate - Plan.md

## What is Cultivate?
A personality-card-based social discovery platform. Users sign up (name, gender, school/college), then separately build a personality card via /create-card. Others browse these cards to find people worth connecting with.

## Current Approach
- Next.js 16 + TypeScript + TailwindCSS (App Router)
- Dark theme with violet accent (#8b5cf6 / violet-600)
- Supabase (PostgreSQL) for data persistence - live and wired
- Profile ID stored in localStorage after signup (temporary identity until auth lands)
- Signup and card creation are separate flows

## What's Been Built

### Landing & Auth
- `app/page.tsx` - Homepage with hero, feature cards, CTAs. Auto-redirects to /home if already signed in.
- `app/signup/page.tsx` - Simple account creation: name, gender, school/college accordion. Writes to Supabase, stores profile_id in localStorage, redirects to /home.

### Dashboard (app/(dashboard)/)
- `layout.tsx` - Fixed sidebar: logo, 5 nav items (Home, My Card, Search, Chat, Saved), "Create Card" CTA at bottom, real user name + institution from Supabase, sign-out button.
- `home/page.tsx` - Live card grid fetched from Supabase. Like/Save toggles (client state). Hides own card.
- `my-card/page.tsx` - Shows empty state + "Create my card" CTA if no personality_type; shows full card view (avatar, MBTI badge, edu, relation, qualities, interests, note) if card exists. "Edit card" button links to /create-card.
- `create-card/page.tsx` - 4-step personality card builder:
  - Step 1: Age (manual input) + MBTI personality type (dropdown, 16 types + unknown)
  - Step 2: Qualities (multi-select chips, up to 5)
  - Step 3: Interests (multi-select, up to 8) + Looking For/Relation (single-select)
  - Step 4: Note (free text, 500 chars, optional)
  - Submits via supabase UPDATE on profiles table
- `search/page.tsx` - Real-time client-side search across name, college, branch. Edu and gender filters.
- `chat/page.tsx` - Conversation list shell with mock data. Real-time messaging deferred.
- `saved/page.tsx` - Liked/Saved tabs shell. Persistence deferred.

### Components
- `components/PersonalityCard.tsx` - Reusable card: gradient avatar, name+age, gender badge, MBTI badge, school/college block, "looking for", qualities chips, interests chips (violet), note italic preview, Like/Save/Chat buttons.

### Database (Supabase - ngijqnojxrxdlsobxrlw)
- `public.profiles` table: id, name, gender, edu_type, school/college fields, age, personality_type, qualities[], interests[], relations[], note, created_at
- RLS: open INSERT + SELECT + UPDATE policies (tighten when auth lands)

### Lib
- `lib/supabase.ts` - singleton client from env vars
- `lib/useCurrentUser.ts` - hook: reads localStorage profile_id, fetches full profile from Supabase, returns { profile, loading }

## Key Decisions
- Route group `(dashboard)` keeps sidebar layout isolated from landing/signup
- Signup only captures base identity (name, gender, school/college); personality card is built separately
- Profile identity via localStorage until Supabase Auth is wired
- Like/Save state is client-only for now - needs DB table later
- Chat is UI shell only - real-time via Supabase Realtime is next big feature

## Bugs Fixed
- Missing Supabase RLS UPDATE policy (blocked create-card submit) - fixed by applying migration

## Next Steps / Priorities
1. Persist likes and saves to Supabase (profile_likes, profile_saves tables)
2. Real-time chat with Supabase Realtime / WebSockets
3. Supabase Auth (email/password or Google OAuth) - replaces localStorage identity
4. Search: filter by MBTI, qualities, interests
5. Pre-fill create-card form with existing data (for editing)

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: TailwindCSS v4 + lucide-react icons
- DB: Supabase (PostgreSQL) - ngijqnojxrxdlsobxrlw.supabase.co
- Hosting: TBD (Vercel likely)
- Auth: TBD (Supabase Auth, deferred)
