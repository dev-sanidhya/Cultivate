-- Require "Looking For" values to be admin-approved before chat unlocks can
-- enable cards. This prevents pending custom values from becoming chat-enabled.

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
