-- Ignore authenticated owners viewing their own cards in public view metrics.
-- Anonymous viewers and non-owner authenticated viewers are still counted.
CREATE OR REPLACE FUNCTION record_card_view(p_card_id UUID)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cards
    WHERE id = p_card_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  UPDATE cards
    SET view_count = GREATEST(COALESCE(view_count, 0) + 1, 0), updated_at = NOW()
    WHERE id = p_card_id;

  UPDATE card_prioritizations
    SET prioritized_view_count = prioritized_view_count + 1
    WHERE card_id = p_card_id AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION record_card_view(UUID) TO anon, authenticated;
