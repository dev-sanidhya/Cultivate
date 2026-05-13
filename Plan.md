# Cultivate - Plan.md

## What is Cultivate?
A personality-card-based social discovery platform. Users must fill out a personality card before accessing the platform. Cards surface rich info about who a person is and what they're looking for. Others browse these cards to find people worth connecting with.

## Current Approach
- Next.js 16 + TypeScript + TailwindCSS (App Router)
- Dark theme with violet accent (#8b5cf6 / violet-600)
- No auth yet - Sign In and Get Started both route to /signup
- Supabase (PostgreSQL) for data persistence - live and wired

## What's Been Built (Session 1 - 2026-05-13)

### Pages
1. `app/page.tsx` - Homepage
   - Navbar with logo + "Sign in" link
   - Hero section: headline, subtext, "Get Started" and "Sign In" CTAs
   - Feature cards section (3 cards: Personality Cards, Intentional Bonds, Honest Profiles)
   - Footer

2. `app/signup/page.tsx` - Sign-up / Card Builder
   - Name field
   - Gender selector (Male / Female / Other toggle buttons)
   - Education selector: School or College accordion
     - School card: School name, PIN code, Higher secondary pass-out year
     - College card: College name, Graduation year, Branch, Section
   - Client-side validation on all fields
   - Writes to Supabase `profiles` table on submit with loading/error states
   - Success screen after submit

### Database (Supabase)
- Project: Cultivate (`ngijqnojxrxdlsobxrlw`)
- Region: ap-southeast-1 (Singapore)
- Table: `public.profiles`
  - id (uuid, PK)
  - name, gender, edu_type
  - school_name, school_pin_code, school_pass_out_year
  - college_name, college_graduation_year, college_branch, college_section
  - created_at
- RLS enabled: open insert + select policies (no auth yet)

### Lib
- `lib/supabase.ts` - singleton Supabase client using env vars

## Key Decisions
- Auth intentionally skipped - will add Supabase Auth later, RLS policies will tighten then
- School/College picker uses CSS max-height accordion (no external library)
- PIN code sanitized to digits only, max 6 chars
- `.env.local` holds keys, covered by `.gitignore` (.env*)

## Next Steps / Priorities
1. Personality card expanded fields: interests, goals, personality type, what you're looking for
2. Dashboard / browse page: grid of personality cards fetched from Supabase
3. Personality card UI component: the card design others see when browsing
4. Auth (Supabase Auth - email/password or Google OAuth) - deferred

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: TailwindCSS v4
- DB: Supabase (PostgreSQL) - ngijqnojxrxdlsobxrlw.supabase.co
- Hosting: TBD (Vercel likely)
- Auth: TBD (Supabase Auth, deferred)
