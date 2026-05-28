-- Minimal migration for contact-detail warnings and card note enforcement.

CREATE TABLE IF NOT EXISTS contact_detail_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_detail_warning_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_penalty_paid_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION note_contains_contact_details(p_note TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RETURN FALSE;
  END IF;

  normalized := lower(p_note);
  normalized := regexp_replace(normalized, '\s*(\[|\()\s*at\s*(\]|\))\s*', ' at ', 'gi');
  normalized := regexp_replace(normalized, '\s*(\[|\()\s*dot\s*(\]|\))\s*', ' dot ', 'gi');
  normalized := regexp_replace(normalized, '\mzero\M', '0', 'gi');
  normalized := regexp_replace(normalized, '\mone\M', '1', 'gi');
  normalized := regexp_replace(normalized, '\mtwo\M', '2', 'gi');
  normalized := regexp_replace(normalized, '\mthree\M', '3', 'gi');
  normalized := regexp_replace(normalized, '\mfour\M', '4', 'gi');
  normalized := regexp_replace(normalized, '\mfive\M', '5', 'gi');
  normalized := regexp_replace(normalized, '\msix\M', '6', 'gi');
  normalized := regexp_replace(normalized, '\mseven\M', '7', 'gi');
  normalized := regexp_replace(normalized, '\meight\M', '8', 'gi');
  normalized := regexp_replace(normalized, '\mnine\M', '9', 'gi');
  normalized := regexp_replace(normalized, '\m(forward slash|slash)\M', '/', 'gi');
  normalized := regexp_replace(normalized, '\munderscore\M', '_', 'gi');
  normalized := regexp_replace(normalized, '\m(dash|hyphen)\M', '-', 'gi');

  RETURN
    normalized ~* '(\+?[0-9][0-9\s\-().]{5,}[0-9])'
    OR normalized ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}'
    OR normalized ~* '\m[a-z0-9._%+\-]{2,}\s+(at|@)\s+[a-z0-9.\-]{2,}\s+(dot|\.)\s+[a-z]{2,}\M'
    OR normalized ~* '(^|\s)@[a-z0-9_.]{3,}\M'
    OR normalized ~* '(https?://|www\.|(^|\s)[a-z0-9-]+\.(com|in|net|org|io|co|me|app|link|gg|xyz)\M)'
    OR normalized ~* '\m(whatsapp|wa\.me|telegram|t\.me|instagram|insta|snapchat|discord|linktree|bio\.link)\M'
    OR normalized ~* '\m(ig|insta|snap|telegram|discord|handle|username|user\s*id)\s*[:=@-]?\s*[a-z0-9_.]{3,}\M';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_card_note_contact_policy()
RETURNS TRIGGER AS $$
DECLARE
  profile_warning_count INTEGER;
  profile_penalty_paid_at TIMESTAMPTZ;
BEGIN
  SELECT contact_detail_warning_count, contact_penalty_paid_at
  INTO profile_warning_count, profile_penalty_paid_at
  FROM profiles
  WHERE id = NEW.user_id;

  IF COALESCE(profile_warning_count, 0) >= 4 AND profile_penalty_paid_at IS NULL THEN
    RAISE EXCEPTION 'Card creation and editing are blocked until the contact-details penalty is paid.';
  END IF;

  IF note_contains_contact_details(NEW.note) THEN
    RAISE EXCEPTION 'Contact details are not allowed in the Note field.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cards_contact_note_policy ON cards;
CREATE TRIGGER cards_contact_note_policy
BEFORE INSERT OR UPDATE ON cards
FOR EACH ROW
EXECUTE FUNCTION enforce_card_note_contact_policy();

ALTER TABLE contact_detail_warnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_warnings_own" ON contact_detail_warnings;
CREATE POLICY "contact_warnings_own" ON contact_detail_warnings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

INSERT INTO platform_config (key, value)
VALUES ('contact_penalty_amount', '0')
ON CONFLICT (key) DO NOTHING;
