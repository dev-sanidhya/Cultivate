-- Minimal migration for user blocking and conversation cleanup.

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_card_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_user_idx ON user_blocks(blocked_user_id);

CREATE OR REPLACE FUNCTION can_contact_user(
  p_other_user_id UUID
) RETURNS TABLE (
  blocked_by_me BOOLEAN,
  blocked_by_other BOOLEAN
) AS $$
DECLARE
  p_current_user_id UUID := auth.uid();
BEGIN
  IF p_current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    EXISTS(
      SELECT 1
      FROM user_blocks
      WHERE blocker_id = p_current_user_id
        AND blocked_user_id = p_other_user_id
    ) AS blocked_by_me,
    EXISTS(
      SELECT 1
      FROM user_blocks
      WHERE blocker_id = p_other_user_id
        AND blocked_user_id = p_current_user_id
    ) AS blocked_by_other;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION can_contact_user(UUID) TO authenticated;

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_own" ON user_blocks;
CREATE POLICY "user_blocks_own" ON user_blocks
FOR ALL
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());
