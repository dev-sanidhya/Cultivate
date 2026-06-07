-- ============================================================
-- Extra Features migration
-- Gender sub-field, category+gender chat unlocking, card prioritization,
-- field hide/unhide. Apply to the live DB (it lags schema.sql).
-- ============================================================

-- 1. Cards: target gender for the "Looking For" field (distinct from cards.gender = owner gender)
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS looking_for_gender TEXT
    CHECK (looking_for_gender IS NULL OR looking_for_gender IN ('male', 'female', 'other'));

-- 2. Chat unlocks: gender dimension. Unlock key = (user_id, looking_for_category, target_gender).
--    card_id becomes optional: unlocks are now category-based, not card-based.
ALTER TABLE chat_unlocks
  ADD COLUMN IF NOT EXISTS target_gender TEXT
    CHECK (target_gender IS NULL OR target_gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS expiry_notified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_unlocks ALTER COLUMN card_id DROP NOT NULL;

-- 3. Chats: record the target gender of the gendered category
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS target_gender TEXT
    CHECK (target_gender IS NULL OR target_gender IN ('male', 'female', 'other'));

-- 4. Field options: hide/unhide toggle
ALTER TABLE field_options
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Prioritization plans (admin-managed, separate sets for N and S)
CREATE TABLE IF NOT EXISTS prioritization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('N', 'S')),
  duration_days INTEGER NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Card prioritizations (purchased prioritization windows)
CREATE TABLE IF NOT EXISTS card_prioritizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('N', 'S')),
  plan_id UUID REFERENCES prioritization_plans(id),
  prioritized_view_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  expiry_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS card_prioritizations_card_idx ON card_prioritizations(card_id);
CREATE INDEX IF NOT EXISTS card_prioritizations_expires_idx ON card_prioritizations(expires_at);

-- 7. View tracking: increment card view + any active prioritization counter in one shot.
--    SECURITY DEFINER so a non-owner viewer can bump the owner's prioritization counter.
CREATE OR REPLACE FUNCTION record_card_view(p_card_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE cards
    SET view_count = GREATEST(COALESCE(view_count, 0) + 1, 0), updated_at = NOW()
    WHERE id = p_card_id;

  UPDATE card_prioritizations
    SET prioritized_view_count = prioritized_view_count + 1
    WHERE card_id = p_card_id AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION record_card_view(UUID) TO anon, authenticated;

-- RLS
ALTER TABLE prioritization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_prioritizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prioritization_plans_read" ON prioritization_plans;
CREATE POLICY "prioritization_plans_read" ON prioritization_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "prioritization_plans_write" ON prioritization_plans;
CREATE POLICY "prioritization_plans_write" ON prioritization_plans FOR ALL USING (true);

-- Read all (needed for search ordering + badges); writes restricted to own rows.
DROP POLICY IF EXISTS "card_prioritizations_read" ON card_prioritizations;
CREATE POLICY "card_prioritizations_read" ON card_prioritizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "card_prioritizations_own" ON card_prioritizations;
CREATE POLICY "card_prioritizations_own" ON card_prioritizations FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. Remove pre-gendered "Looking For" seed options (gender now comes from the sub-field).
DELETE FROM field_options
  WHERE field_name = 'looking_for' AND value IN ('Male Best Friend', 'Female Best Friend');

-- 9. Seed the new base + sugar options.
INSERT INTO field_options (field_name, value) VALUES
  ('looking_for', 'Best Friend'),
  ('looking_for', 'Sugar Daddy'),
  ('looking_for', 'Sugar Mommy'),
  ('looking_for', 'Sugar Baby')
ON CONFLICT (field_name, value) DO NOTHING;
