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
- [ ] Direct chat unlock flow (auto-create card with same Looking For)
- [ ] Owner account OTP-protected settings change
- [ ] Web push notifications
