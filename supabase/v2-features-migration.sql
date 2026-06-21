-- ============================================================
-- V2 Extra Features migration
-- Home banners, OTP rate limiting, card-to-card closure, new card
-- fields (Weakness/Interests/Disinterests), discount offers, chat-unlock
-- extension + offer tracking, default unlock pricing, notification-assist,
-- and supporting stats columns. Apply to the live DB (it lags schema.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Home Page banner management
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banner_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banner_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES banner_sections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS banner_images_section_idx ON banner_images(section_id);

-- Banner image storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ------------------------------------------------------------
-- 2. OTP request rate limiting (per phone + IP)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otp_requests_phone_idx ON otp_requests(phone, created_at);
CREATE INDEX IF NOT EXISTS otp_requests_ip_idx ON otp_requests(ip, created_at);

-- ------------------------------------------------------------
-- 3. Notifications: event time (display time) distinct from delivery time
-- ------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_at TIMESTAMPTZ;
-- Backfill existing rows so display time falls back to created_at.
UPDATE notifications SET event_at = created_at WHERE event_at IS NULL;

-- ------------------------------------------------------------
-- 4. Card-to-card closure mapping + closure type
-- ------------------------------------------------------------
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS closed_with_card_id UUID REFERENCES cards(id),
  ADD COLUMN IF NOT EXISTS closure_type TEXT
    CHECK (closure_type IS NULL OR closure_type IN ('direct', 'linked'));

CREATE TABLE IF NOT EXISTS card_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  closed_with_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS card_closures_card_idx ON card_closures(card_id);

-- ------------------------------------------------------------
-- 5. New card fields: rename hobbies -> interests, add weakness + disinterests
-- ------------------------------------------------------------
ALTER TABLE cards RENAME COLUMN hobbies TO interests;
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS weakness TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disinterests TEXT[] DEFAULT '{}';

ALTER TABLE searches RENAME COLUMN hobbies TO interests;
ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS weakness TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disinterests TEXT[] DEFAULT '{}';

-- Reclassify existing field_options rows.
UPDATE field_options SET field_name = 'interests' WHERE field_name = 'hobbies';

-- Seed defaults for the two new fields.
INSERT INTO field_options (field_name, value) VALUES
  ('weakness', 'Impatient'),
  ('weakness', 'Stubborn'),
  ('weakness', 'Overthinker'),
  ('weakness', 'Disorganized'),
  ('weakness', 'Procrastinator'),
  ('weakness', 'Shy'),
  ('weakness', 'Forgetful'),
  ('weakness', 'Short-tempered'),
  ('disinterests', 'Smoking'),
  ('disinterests', 'Drinking'),
  ('disinterests', 'Loud Parties'),
  ('disinterests', 'Horror Movies'),
  ('disinterests', 'Gossip'),
  ('disinterests', 'Crowds'),
  ('disinterests', 'Early Mornings'),
  ('disinterests', 'Spicy Food')
ON CONFLICT (field_name, value) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Address suggestions performance: trigram index for fast prefix/contains
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS tagged_suggestions_value_trgm
  ON tagged_address_suggestions USING gin (value gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tagged_suggestions_lookup_idx
  ON tagged_address_suggestions(address_type, field_name);

-- ------------------------------------------------------------
-- 7. Field options verification flag (default unlock pricing for unverified custom categories)
-- ------------------------------------------------------------
ALTER TABLE field_options
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;
-- Seeded/base options are considered verified; custom submissions start unverified
-- (handled at insert time in app code).

-- ------------------------------------------------------------
-- 8. Discount Offers system
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_type TEXT NOT NULL CHECK (offer_type IN ('welcome', 'card_creation', 'occasional')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  -- availability window length after activation (per-user for welcome/card_creation, global for occasional)
  availability_days INTEGER NOT NULL DEFAULT 0,
  availability_hours INTEGER NOT NULL DEFAULT 0,
  banner_url TEXT,
  -- occasional offers schedule a global activation moment
  activation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(offer_type)
);

-- Per-category benefit configuration for each offer.
CREATE TABLE IF NOT EXISTS offer_category_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  looking_for_category TEXT NOT NULL,
  discounted_price INTEGER,
  bonus_duration_days INTEGER NOT NULL DEFAULT 0,
  UNIQUE(offer_id, looking_for_category)
);
CREATE INDEX IF NOT EXISTS offer_benefits_offer_idx ON offer_category_benefits(offer_id);

-- Per-user offer windows (welcome at signup, card_creation on qualifying card).
CREATE TABLE IF NOT EXISTS user_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('welcome', 'card_creation', 'occasional')),
  trigger_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, offer_type)
);
CREATE INDEX IF NOT EXISTS user_offers_user_idx ON user_offers(user_id);
CREATE INDEX IF NOT EXISTS user_offers_expires_idx ON user_offers(expires_at);

-- ------------------------------------------------------------
-- 9. Chat unlocks: offer tracking + base/bonus duration + amount (stats & conversion)
-- ------------------------------------------------------------
ALTER TABLE chat_unlocks
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_type TEXT
    CHECK (offer_type IS NULL OR offer_type IN ('welcome', 'card_creation', 'occasional')),
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS bonus_duration_days INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 10. Card prioritizations: amount paid (revenue analytics)
-- ------------------------------------------------------------
ALTER TABLE card_prioritizations
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 11. Notification-assistance counters (transient, reset when user leaves window)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_assist_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ------------------------------------------------------------
-- 12. Platform config defaults (toggles + default unlock pricing)
-- ------------------------------------------------------------
INSERT INTO platform_config (key, value) VALUES
  ('help_friends_join_enabled', 'true'),
  ('default_chat_unlock_price', '0'),
  ('default_chat_unlock_duration_days', '30')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- RLS for new tables
-- ------------------------------------------------------------
ALTER TABLE banner_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_category_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_assist_counts ENABLE ROW LEVEL SECURITY;

-- Banners: public read (home page), admin writes via service role.
DROP POLICY IF EXISTS "banner_sections_read" ON banner_sections;
CREATE POLICY "banner_sections_read" ON banner_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "banner_sections_write" ON banner_sections;
CREATE POLICY "banner_sections_write" ON banner_sections FOR ALL USING (true);

DROP POLICY IF EXISTS "banner_images_read" ON banner_images;
CREATE POLICY "banner_images_read" ON banner_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "banner_images_write" ON banner_images;
CREATE POLICY "banner_images_write" ON banner_images FOR ALL USING (true);

-- OTP requests: managed exclusively via service role (no client access).
DROP POLICY IF EXISTS "otp_requests_service" ON otp_requests;
CREATE POLICY "otp_requests_service" ON otp_requests FOR ALL USING (false) WITH CHECK (false);

-- Card closures: read by all (validation/analytics), writes restricted to owners' cards via app.
DROP POLICY IF EXISTS "card_closures_read" ON card_closures;
CREATE POLICY "card_closures_read" ON card_closures FOR SELECT USING (true);
DROP POLICY IF EXISTS "card_closures_write" ON card_closures;
CREATE POLICY "card_closures_write" ON card_closures FOR ALL USING (true);

-- Offers + benefits: public read (needed for pricing/banners), admin writes via service role.
DROP POLICY IF EXISTS "offers_read" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT USING (true);
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_write" ON offers FOR ALL USING (true);

DROP POLICY IF EXISTS "offer_benefits_read" ON offer_category_benefits;
CREATE POLICY "offer_benefits_read" ON offer_category_benefits FOR SELECT USING (true);
DROP POLICY IF EXISTS "offer_benefits_write" ON offer_category_benefits;
CREATE POLICY "offer_benefits_write" ON offer_category_benefits FOR ALL USING (true);

-- User offers: users read own; service role manages creation.
DROP POLICY IF EXISTS "user_offers_read" ON user_offers;
CREATE POLICY "user_offers_read" ON user_offers FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user_offers_write" ON user_offers;
CREATE POLICY "user_offers_write" ON user_offers FOR ALL USING (true);

-- Notification-assist counts: managed via service role (admin tooling).
DROP POLICY IF EXISTS "notification_assist_service" ON notification_assist_counts;
CREATE POLICY "notification_assist_service" ON notification_assist_counts FOR ALL USING (true);

-- Banner image storage policies (public read; writes via service role only).
DROP POLICY IF EXISTS "banners_read" ON storage.objects;
CREATE POLICY "banners_read" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
