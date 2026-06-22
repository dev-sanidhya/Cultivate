# Strefo - Plan.md

## What is Strefo?
A personality-card-based connection platform (web-only, mobile-first) where users create Personality Cards describing who they are and what kind of connection they're looking for (travel partner, gaming buddy, co-founder, best friend, etc.). Others can search, browse, like, save and chat with card owners.

## Tech Stack
- **Framework**: Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS v4, light + pastel theme (violet + pink)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **OTP**: 2factor.in API (phone-number based auth)
- **Payments**: Mocked (Razorpay to be integrated)
- **Hosting**: TBD (Vercel)

## Architecture

### Auth Flow
- Phone + OTP via 2factor.in API
- On successful OTP: create/sign-in Supabase user via admin API
- Synthetic email: `{phone}@strefo.app`, HMAC-derived password
- Persistent sessions via Supabase cookies (`@supabase/ssr`)

### Design System (globals.css)
- Primary: `#7C3AED` (violet), Accent: `#EC4899` (pink)
- Background: `#FAFAFA`, Surface: `#FFFFFF`, Border: `#EDE9FE`
- Mobile-first: max-width 480px, bottom nav, safe-area insets

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=https://ngijqnojxrxdlsobxrlw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     (Supabase dashboard > Settings > API)
TWO_FACTOR_API_KEY=...             (2factor.in dashboard)
AUTH_SECRET=...                    (any long random string)
```

## Database
Full schema at `supabase/schema.sql`. Apply via Supabase SQL Editor.

Tables: `profiles`, `cards`, `field_options`, `custom_option_requests`, `searches`, `card_interactions`, `chats`, `messages`, `chat_unlocks`, `notifications`, `contact_groups`, `tagged_address_suggestions`, `admin_users`, `platform_config`, `chat_pricing`, `visit_logs`

## Routes Built

### User-facing (protected under `(app)` layout)
- `/` - Landing page
- `/signup` - 3-step: phone -> OTP -> name/gender/dob
- `/login` - Phone + OTP
- `/home` - Home with contacts upload CTA + feedback CTA
- `/cards` - My Cards list with close/unlock-chat/edit actions
- `/cards/create` - Create personality card with field options + custom options
- `/cards/[cardId]/edit` - Edit card (Looking For locked once chat enabled)
- `/search` - Search history list with new-cards counter
- `/search/new` - Create/edit search (filter or card ID modes)
- `/search/results` - Results with prev/next navigation, filters (All/Read/Unread/Saved/Liked)
- `/chat` - Chat list
- `/chat/[chatId]` - Realtime conversation (3-message rule enforced)
- `/saved` - Liked & Saved tabs
- `/profile` - View profile (permanent fields, sign out)
- `/contacts` - Check/upload group contacts
- `/notifications` - Notification inbox
- `/card/[cardId]` - Public shareable card (increments view count)

### Admin Panel (`/admin/*`)
- `/admin/login` - Credential login (session-based, no Supabase auth)
- `/admin/stats` - Users, cards, chat, visit frequency stats
- `/admin/users` - All users with phone search
- `/admin/fields` - Field options management + approve/reject/modify custom option requests
- `/admin/contacts` - Contact group status (uploaded / outreach done)
- `/admin/config` - Platform config (emails, social handles) + chat pricing per category
- `/admin/notifications` - Send notification to any user by phone
- `/admin/access` - Admin account management (owner: Prateek Chauhan / prateek)

## Key Business Logic
- **Chat unlock**: user must have active unlock (`chat_unlocks` row with non-expired `expires_at`) for same "Looking For" category as target card
- **3-message rule**: can only send 3 messages until other party replies
- **Custom options**: submitted for admin review; on reject -> notification + removed from card; on approve/modify -> added to platform options
- **Card ID**: 6-char alphanumeric, case-insensitive (stored uppercase)
- **Note moderation**: regex-based blocking of phone numbers, emails, social handles, URLs
- **View count**: incremented every time a card appears on another user's screen
- **Visit tracking**: `VisitTracker` component logs a visit if 30+ min since last session
- **Chat auto-deletion**: Not yet implemented (needs cron job)

## Owner Admin Account Setup
Run in Supabase SQL Editor:
```sql
UPDATE admin_users
SET password_hash = encode(sha256('prateekchauhan'::bytea), 'hex')
WHERE username = 'prateek';
```

## Not Yet Built (Next Steps)
- [ ] Payment integration (Razorpay) for paid chat unlock
- [ ] Cron job for chat auto-deletion after 2 weeks inactivity
- [ ] Background job to update `new_cards_count` on search history cards
- [ ] Profile photo upload (Supabase Storage)
- [ ] Owner account OTP-protected settings change
- [ ] Web push notifications

---

# Extra Features Build (in progress)

Source: `Downloads/Extra Features.docx`. Reviewed with user; all 15 review questions + 2 follow-ups answered.
Supabase project ref: `ngijqnojxrxdlsobxrlw`.

## Confirmed decisions

1. `looking_for_gender` = NEW column on `cards` (target gender), distinct from `cards.gender` (owner gender from profile).
2. Messaging eligibility (§3) matches a card's `looking_for_gender` against the **contacting user's profile gender**.
3. Non-matching users see the chat button **visible-but-blocked** (tap -> swipe message "Only X users can chat with this user").
4. **Remove** pre-gendered `field_options` ("Male/Female Best Friend"); gender comes only from the sub-field.
5. Unlock key = `(looking_for_category, target_gender)` -> add `target_gender` column to `chat_unlocks` and `chats`.
6. Chat-unlock **pricing stays per category** (one price, applies regardless of gender).
7. Gender-specific options (Sugar Daddy=male, Sugar Mommy=female) + complementary pairs are **hardcoded** in `lib/lookingFor.ts`.
8. Special pairs use a matching path separate from normal equality matching.
9. Auto-created card (direct unlock): own gender+age from profile, `looking_for`/`looking_for_gender` = counterpart, rest empty, chat_enabled, redirect to conversation.
10. `looking_for` editable only if the card has no associated chats.
11. S-Prioritize bypasses all filters except gender + Looking For type + Looking For gender. N must fully qualify.
12. Prioritized views: count views arriving **while prioritized** (no unique dedup).
13. Expiry notifications: **lazy evaluation** on next app load; no cron.
14. Search order: prioritized (by prioritization time, newest first) -> non-prioritized (by **creation** time, **oldest** first).
15. Field hide/unhide: `is_hidden` column; hidden drop from forms but a verified hidden value is still manually enterable with no new review request.
16. Custom Looking For value can't unlock chats until it is an approved `field_options` row.

## Special-pair / gender model (`lib/lookingFor.ts`)

`getCounterpart(target, targetOwnerGender)` -> `{ looking_for, looking_for_gender|null, requiredViewerGender }`:
- Sugar Daddy/Mommy target -> counterpart `Sugar Baby` (target_gender = target owner gender), requiredViewerGender = implied gender (male/female).
- Sugar Baby target -> counterpart `Sugar Daddy` (owner male) / `Sugar Mommy` (owner female), gender-specific, requiredViewerGender = baby's target gender.
- Normal -> counterpart same category, target_gender = target owner gender, requiredViewerGender = target's looking_for_gender.
Eligibility (§3): viewer.profile.gender must equal counterpart.requiredViewerGender else blocked.

## Build phases (each its own commit, single push at end)

- [x] P1  DB migration + schema.sql + types + `lib/lookingFor.ts`
- [x] P2  Gender sub-field in CardForm + display formatting
- [x] P3  Chat eligibility (target_gender) + visible-but-blocked message
- [x] P4  Direct unlock + auto-card creation + special-pair counterpart (`lib/chatFlow.ts`, `ChatUnlockChoiceModal`)
- [x] P5  Edit-lock of looking_for when card has chats
- [x] P6  Subscription page (`/subscriptions`) + header button + prioritization flows
- [x] P7  Admin: prioritization plans + chat-pricing filter + field hide/unhide
- [x] P8  Search: ordering + own cards "You" + badges + S-prioritize injection
- [x] P9  Expiry notifications (lazy, `ExpiryNotifier` + `lib/expiryNotifications.ts`)
- [x] P10 Mobile swipe nav (normal view) + custom options + gender filter in filter search

## OUTSTANDING (must do before features work end-to-end)

- **Apply the migration to the live DB.** The Cultivate Supabase project (`ngijqnojxrxdlsobxrlw`) is currently
  PAUSED (INACTIVE). `supabase/extra-features-migration.sql` must be applied once it is restored, or every new
  column/table no-ops. Restore the project, then run that file in the SQL editor (or via MCP `apply_migration`).
- Admin must create prioritization plans (N and S) under Admin > Platform Configuration before the prioritize
  flow shows any plans.
- Chat unlock pricing for the new Sugar* categories is seeded at 0 (free) until set in Admin > Chat Pricing.

## Risks
- Live Supabase DB lags `schema.sql` - apply migration to live DB via MCP.
- Supabase builders are lazy: always await/.then().
- Next 16.2.6 is modified - mirror existing repo patterns.
- Scoping: special-pair complementary matching applied to contact/unlock/auto-card path; normal search filter kept exact-match for now (flagged).

## Progress log
- All 10 phases implemented, typecheck + `next build` clean. Committed in small units.
- Pending: apply migration to the (currently paused) live Supabase project.

---

# V2 Extra Features Build (in progress)

Source: `Downloads/V-2 Extra Features.docx`. ~30 features + security audit. Reviewed with user; all
clarifying questions answered. Building ALL at once (no phase gating), many small commits, SINGLE push at end.

## Locked decisions (V2)
1. OTP limit: per phone number (primary) + IP (secondary). 5/hour rolling, 20/24h, 60s cooldown.
2. S-Prioritize injection: FILTER searches only, EXACT 3-field match (gender + looking_for + looking_for_gender),
   ignore all other filters. No complementary special-pair matching in filter search (flagged for later).
3. Card closure: card-to-card mapping. "Associated" = cards chatted with through that specific card.
   Reopen only directly-closed cards (not linked/merged).
4. Offers: Welcome countdown starts at signup. Offers REUSABLE until timer ends (not consumed per use).
   Durations expressed in hours/days. Card-Creation offer: fresh 60+ char card starts a new window; a second
   qualifying card RESTARTS the timer; edits never re-arm. Occasional = global wall-clock window.
   Multiple active: highest discount + highest bonus per category, computed independently.
5. Hobbies -> Interests is a pure rename. Added Weakness + Disinterests fields.
6. Card scaling: zoom-style transform, whole card as one scalable unit.
7. Notification Assistance list: recomputed on admin page load/refresh only (no cron). Eligibility window
   7h-4h before offer expiry. Counts deleted permanently when user leaves window.
8. Data wipe: dev DB, no real users. Wipe all user data except admin_users, run as part of V2 migration.
9. Storage: proper Supabase Storage bucket for banner/offer images (`banners` bucket).

## V2 DB artifacts
- `supabase/v2-features-migration.sql` - apply to live DB (currently paused project ngijqnojxrxdlsobxrlw).
- `supabase/v2-wipe-user-data.sql` - run AFTER migration to reset user data.
- `schema.sql` kept in sync (authoritative).
- New tables: banner_sections, banner_images, otp_requests, card_closures, offers,
  offer_category_benefits, user_offers, notification_assist_counts.
- New columns: cards(interests rename, weakness, disinterests, closed_with_card_id, closure_type);
  searches(interests rename, weakness, disinterests); field_options(is_verified);
  notifications(event_at); chat_unlocks(offer_id, offer_type, amount_paid, base/bonus_duration_days);
  card_prioritizations(amount_paid). GeneralAddress gains `state`.

## V2 commit progress
DONE (committed):
- [x] V2 schema migration + schema sync + wipe script
- [x] Extend types for V2 schema
- [x] #18 (fields) Rename hobbies->interests, add Weakness/Disinterests + non-empty display
- [x] #13 State/UT dropdown in General Location + display order Building->PIN->State
- [x] #10 Remove like/save counts (kept personal bookmarking)
- [x] #12 Always show tagged location on search cards
- [x] #22 Display unlock duration in months (multiples of 30)
- [x] #4 Notification timestamp from event_at
- [x] #16 Help-Your-Friends toggle (home + admin config)
- [x] #23 Pricing/plan Save buttons (no immediate apply)
- [x] #21 Hidden cats off pricing page (already satisfied by fetchUnlockCategories filter)
- [x] #3 Note-length (60) search gate + CardForm live hint
- [x] #11 Prioritize Card button on My Cards -> /subscriptions?card=
- [x] #9.3 Gender shown in Looking For labels everywhere
- [x] #9.1/#9.2 Public card chat now uses centralized resolveChatStart (counterpart) - fixes wrong-category unlock prompt
- [x] #7 Hardened S-prioritization injection (fallback embed, require looking_for)

- [x] #2 OTP rate limit (phone primary + IP guard, 60s/5h/20d) + #17 dup-account block on signup
- [x] #15 Card-to-card closure (Card IDs from chat list) + card_closures mapping
- [x] #8 Reopen only directly-closed cards (closure_type)
- [x] #31 Default unlock pricing fallback (lib/pricing.ts) + admin config keys
- [x] #19 Address suggestions via indexed tagged_address_suggestions table

PENDING (heaviest clusters remain):
- [ ] #1 home banners (admin manager + home render above help-friends box)
- [ ] #5 swipe-from-note-area, #6 note editor WYSIWYG height, #18-compaction(single-line collapse)
- [ ] #20 responsive zoom-scaling of card
- [ ] #24 OFFERS SYSTEM (big): admin Offers page (3 tabs, category benefits, banners, scheduling),
  runtime triggers (welcome@signup, card-creation@60char, occasional), multi-offer resolution
  (max discount + max bonus per category), #26 countdowns (header + my cards), #27 pricing UI
  (strikethrough + bonus), #28 two-tab unlock page (Unlock + Active Unlocks), #25 unlock extension.
- [ ] #14 prioritization stats, #29 stats enhancements, #32 stats redesign (admin Statistics page)
- [ ] #30 contact validation on all custom fields + char restriction
- [ ] #33 notif-assist admin page (offer expiry 7h-4h window, export, counts)
- [ ] #34 security audit (final pass)

- [x] #24/#25/#26/#27/#28 Offers system (lib/offers.ts, admin /admin/offers, pricing integration,
  two-tab unlock + Active Unlocks, banner popup + countdown OfferBanner, unlock extension)
- [x] #1 Home banners (admin /admin/banners + HomeBanners carousel + storage upload route)
- [x] #30 Contact validation on all custom fields + special-char restriction
- [x] #33 Notification Assistance admin page (+ /api/admin/notif-assist)
- [x] #14/#29/#32 Stats: prioritization analytics, conversion by offer, address tagging
- [x] #5 swipe-through note area, #6 WYSIWYG note editor, #18-compaction (already single-line), #20 zoom scaling
- [x] #34 Security audit -> SECURITY.md (findings + fixes)

## Build state note
- ALL ~30 features + foundation implemented in this session. Each commit typechecks clean.
- New admin pages registered in lib/admin-access.ts: offers, banners, notif_assist (owner sees all;
  grant to employees via accessible_pages).
- Security: SECURITY.md documents the admin-write RLS + unauthenticated admin-route issues
  (architectural, flagged for deliberate follow-up).

## SQL to run manually on live Supabase (in order)
1. `supabase/v2-features-migration.sql` (or full `supabase/schema.sql` on a fresh DB)
2. `supabase/v2-wipe-user-data.sql` (dev reset - deletes all non-admin user data)
Project must be un-paused first. Admin then creates offers/plans/banners/pricing in the panel.

## V2 notes
- node_modules was NOT installed initially; ran `npm install` (370 pkgs) to enable typecheck/build.
- Typecheck after each cluster via `node ./node_modules/typescript/lib/tsc.js --noEmit`.
- Live Supabase project still needs restoring + migration applied before runtime verification possible.
