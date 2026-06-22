-- Keep card.chat_enabled in sync with active category + target-gender chat unlocks.
-- This makes an active unlock apply to cards created or edited after purchase.

CREATE OR REPLACE FUNCTION apply_active_chat_unlock_to_card()
RETURNS TRIGGER AS $$
BEGIN
  NEW.chat_enabled := EXISTS (
    SELECT 1
    FROM chat_unlocks cu
    WHERE cu.user_id = NEW.user_id
      AND cu.looking_for_category = NEW.looking_for
      AND (
        (cu.target_gender IS NULL AND NEW.looking_for_gender IS NULL)
        OR cu.target_gender = NEW.looking_for_gender
      )
      AND cu.expires_at > NOW()
      AND EXISTS (
        SELECT 1
        FROM field_options fo
        WHERE fo.field_name = 'looking_for'
          AND fo.value = NEW.looking_for
          AND fo.is_approved = TRUE
      )
  ) AND COALESCE(NEW.is_closed, FALSE) = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS apply_active_chat_unlock_to_card_trigger ON cards;
CREATE TRIGGER apply_active_chat_unlock_to_card_trigger
  BEFORE INSERT OR UPDATE OF user_id, looking_for, looking_for_gender, is_closed
  ON cards
  FOR EACH ROW
  EXECUTE FUNCTION apply_active_chat_unlock_to_card();

UPDATE cards c
SET chat_enabled = TRUE
WHERE c.is_closed = FALSE
  AND EXISTS (
    SELECT 1
    FROM chat_unlocks cu
    WHERE cu.user_id = c.user_id
      AND cu.looking_for_category = c.looking_for
      AND (
        (cu.target_gender IS NULL AND c.looking_for_gender IS NULL)
        OR cu.target_gender = c.looking_for_gender
      )
      AND cu.expires_at > NOW()
      AND EXISTS (
        SELECT 1
        FROM field_options fo
        WHERE fo.field_name = 'looking_for'
          AND fo.value = c.looking_for
          AND fo.is_approved = TRUE
      )
  );

UPDATE cards c
SET chat_enabled = FALSE
WHERE c.chat_enabled = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM field_options fo
    WHERE fo.field_name = 'looking_for'
      AND fo.value = c.looking_for
      AND fo.is_approved = TRUE
  );
