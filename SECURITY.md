# Security Review - V2

Review of the codebase after the V2 feature build, covering the vulnerability
classes requested plus a broader pass over auth, authorization, input handling,
API surface, and session management.

## Summary of vulnerability classes checked

| Class | Status | Notes |
|-------|--------|-------|
| SSTI (template injection) | Not applicable | No server-side template engine; React escapes output by default. |
| ReDoS | Reviewed - OK | Moderation regexes use disjoint character classes (`\d` vs `[\s\-().]`), so no catastrophic backtracking. LIKE query input is wildcard-escaped. |
| Loop-based DoS (LPDoS) | Mitigated | Address suggestions no longer scan all cards per keystroke (now an indexed `tagged_address_suggestions` query). `findUserByEmail` still paginates all auth users - see Findings. |
| Secret key exposure | OK | `AUTH_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are only read in server code (`lib/utils/auth.ts`, `createAdminClient`). Browser client uses only `NEXT_PUBLIC_*` anon key. |
| NoSQL injection | Not applicable | PostgreSQL only. |
| SQL injection | OK | All queries go through the Supabase/PostgREST client (parameterized). PostgREST filter strings interpolate only server-generated UUIDs. LIKE patterns are escaped. |
| Clipboard attacks | OK | `navigator.clipboard.writeText` only writes the card's own share URL. |
| Replay attacks | Reviewed | OTP verified via 2factor session; app sessions via Supabase httpOnly cookies. OTP send is now rate-limited (5/h, 20/24h, 60s cooldown). See Findings re: deterministic synthetic password. |

## Findings (require deliberate follow-up)

These are pre-existing architectural issues (the V2 work followed the existing
patterns). They are flagged here rather than hot-patched, because fixing them
correctly changes the admin architecture and must be verified against a running
DB before shipping.

### 1. Admin-managed tables are world-writable via RLS (High)
Tables such as `platform_config`, `chat_pricing`, `prioritization_plans`,
`field_options`, `offers`, `offer_category_benefits`, `banner_sections`,
`banner_images` use `FOR ALL USING (true)` policies. Because the admin panel
authenticates with a client-side session (not Supabase Auth), these writes must
be open to the anon role - which means **any client can write to them directly**
through the Supabase JS client (e.g. set chat prices to 0, create offers).

**Recommended fix:** move all admin writes behind server routes that use the
service-role client, and change these policies to `SELECT`-only for anon/auth.
This requires a server-verifiable admin session (see #2).

### 2. Admin API routes are unauthenticated (High)
`/api/admin/upload-image` and `/api/admin/notif-assist` run with the service
role but have no server-verifiable admin check (admin identity lives only in
client `sessionStorage`). `notif-assist` GET returns user phone numbers, so this
is a PII-exposure surface; `upload-image` allows anonymous uploads to the public
`banners` bucket.

**Recommended fix:** issue a signed, httpOnly admin session cookie at
`/admin/login` (server-set), and verify it in a shared admin-route guard.

### 3. Deterministic synthetic password (Medium)
`getDerivedPassword` = HMAC(AUTH_SECRET, phone). The verify route returns this
password to the client to call `signInWithPassword`. If `AUTH_SECRET` leaks, all
accounts are derivable. Keep `AUTH_SECRET` strong/rotated; prefer setting the
session server-side instead of returning the password to the client.

### 4. `findUserByEmail` paginates all auth users (Low)
On OTP verify for an existing user, the route scans auth users page by page.
Fine at current scale; replace with a direct lookup as the user base grows.

## Fixes applied during this review
- Address-suggestion LIKE input is wildcard-escaped (`%`, `_`, `\`).
- OTP requests are rate-limited per phone + IP, blocking brute-force / SMS-bombing.
- Duplicate-account creation is blocked at signup.
- Custom-input fields (tagged addresses, custom options) reject special
  characters and run the same contact-detail moderation as the Note.
- `otp_requests` RLS is service-role only (`USING (false)` for clients).
