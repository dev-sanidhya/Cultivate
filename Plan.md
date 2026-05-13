# Cultivate - Plan.md

## What is Cultivate?
A personality-card-based social discovery platform. Users must fill out a personality card before accessing the platform. Cards surface rich info about who a person is and what they're looking for. Others browse these cards to find people worth connecting with.

## Current Approach
- Next.js 16 + TypeScript + TailwindCSS (App Router)
- Dark theme with violet accent (#8b5cf6 / violet-600)
- No auth backend yet - UI-only for now to skip API costs
- All state is client-side (React useState)

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
   - Success screen after submit ("You're in, [Name].")

## Key Decisions
- Auth is intentionally skipped for now - the Sign In and Get Started buttons both go to /signup
- School/College picker uses CSS max-height transition accordion (no external library)
- PIN code input is sanitized to digits only, max 6 chars
- Year selectors span current year -4 to +5

## Next Steps / Priorities
- Personality card itself: more fields (interests, goals, personality type, what you're looking for, etc.)
- Dashboard / browse page: grid of personality cards from other users
- Actual auth (email + password or OAuth) - deferred
- Backend: Supabase or similar to persist profiles
- Personality card design: the card UI that others see when browsing

## Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: TailwindCSS v4
- Hosting: TBD (Vercel likely)
- DB: TBD (Supabase likely)
- Auth: TBD (deferred)
