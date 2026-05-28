-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE NOT NULL,
  photo_url TEXT,
  contact_detail_warning_count INTEGER NOT NULL DEFAULT 0,
  contact_penalty_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  personality_types TEXT[] DEFAULT '{}',
  tagged_address JSONB,
  looking_for TEXT NOT NULL,
  qualities TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  note TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_with_profile_id UUID REFERENCES profiles(id),
  chat_enabled BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field options
CREATE TABLE IF NOT EXISTS field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  submitted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_name, value)
);

-- Custom option requests
CREATE TABLE IF NOT EXISTS custom_option_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  modified_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searches
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  search_type TEXT DEFAULT 'filter' CHECK (search_type IN ('filter', 'card_id')),
  card_id_query TEXT,
  age INTEGER,
  gender TEXT,
  personality_types TEXT[] DEFAULT '{}',
  tagged_address JSONB,
  looking_for TEXT,
  qualities TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  new_cards_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card interactions
CREATE TABLE IF NOT EXISTS card_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'save', 'read')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, type)
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  initiator_card_id UUID REFERENCES cards(id),
  recipient_card_id UUID REFERENCES cards(id),
  looking_for_category TEXT NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat unlocks
CREATE TABLE IF NOT EXISTS chat_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  looking_for_category TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact groups
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  contacts_uploaded BOOLEAN DEFAULT FALSE,
  outreach_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tagged address suggestions
CREATE TABLE IF NOT EXISTS tagged_address_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  UNIQUE(address_type, field_name, value)
);

-- Contact detail warnings
CREATE TABLE IF NOT EXISTS contact_detail_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  accessible_pages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform config
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat pricing
CREATE TABLE IF NOT EXISTS chat_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  looking_for_category TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30
);

-- Visit logs
CREATE TABLE IF NOT EXISTS visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upsert function for address suggestions
CREATE OR REPLACE FUNCTION upsert_address_suggestion(
  p_type TEXT,
  p_field TEXT,
  p_value TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO tagged_address_suggestions (address_type, field_name, value, count)
  VALUES (p_type, p_field, p_value, 1)
  ON CONFLICT (address_type, field_name, value)
  DO UPDATE SET count = tagged_address_suggestions.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Contact-detail moderation helpers for server-side card enforcement
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
$$ LANGUAGE plpgsql IMMUTABLE;

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

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_option_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagged_address_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_detail_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, insert/update own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cards: public cards visible to all, own cards fully owned
CREATE POLICY "cards_read_public" ON cards FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "cards_insert_own" ON cards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cards_update_own" ON cards FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "cards_delete_own" ON cards FOR DELETE USING (user_id = auth.uid());

-- Field options: everyone can read approved options
CREATE POLICY "field_options_read" ON field_options FOR SELECT USING (is_approved = true);
CREATE POLICY "field_options_write" ON field_options FOR ALL USING (true); -- admin manages via service role

-- Custom option requests: users manage own
CREATE POLICY "custom_requests_own" ON custom_option_requests FOR ALL USING (user_id = auth.uid());

-- Searches: users manage own
CREATE POLICY "searches_own" ON searches FOR ALL USING (user_id = auth.uid());

-- Card interactions: users manage own, read all for counts
CREATE POLICY "interactions_own" ON card_interactions FOR ALL USING (user_id = auth.uid());

-- Chats: participants can access
CREATE POLICY "chats_participants" ON chats FOR ALL USING (initiator_id = auth.uid() OR recipient_id = auth.uid());

-- Messages: chat participants can read/write
CREATE POLICY "messages_participants" ON messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chats WHERE chats.id = messages.chat_id
    AND (chats.initiator_id = auth.uid() OR chats.recipient_id = auth.uid())
  )
);

-- Chat unlocks: users manage own
CREATE POLICY "chat_unlocks_own" ON chat_unlocks FOR ALL USING (user_id = auth.uid());

-- Notifications: users read own
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Contact groups: everyone can read
CREATE POLICY "contact_groups_read" ON contact_groups FOR SELECT USING (true);
CREATE POLICY "contact_groups_write" ON contact_groups FOR ALL USING (true);

-- Address suggestions: everyone can read
CREATE POLICY "suggestions_read" ON tagged_address_suggestions FOR SELECT USING (true);
CREATE POLICY "suggestions_write" ON tagged_address_suggestions FOR ALL USING (true);

-- Contact warnings: users manage own
CREATE POLICY "contact_warnings_own" ON contact_detail_warnings FOR ALL USING (user_id = auth.uid());

-- Admin users: open read (auth handled at app level)
CREATE POLICY "admin_users_read" ON admin_users FOR SELECT USING (true);
CREATE POLICY "admin_users_write" ON admin_users FOR ALL USING (true);

-- Platform config: everyone can read
CREATE POLICY "platform_config_read" ON platform_config FOR SELECT USING (true);
CREATE POLICY "platform_config_write" ON platform_config FOR ALL USING (true);

-- Chat pricing: everyone can read
CREATE POLICY "chat_pricing_read" ON chat_pricing FOR SELECT USING (true);
CREATE POLICY "chat_pricing_write" ON chat_pricing FOR ALL USING (true);

-- Visit logs
CREATE POLICY "visit_logs_own" ON visit_logs FOR ALL USING (user_id = auth.uid());

-- Default field options seed data
INSERT INTO field_options (field_name, value) VALUES
  ('looking_for', 'Travel Partner'),
  ('looking_for', 'Gaming Partner'),
  ('looking_for', 'Co-founder'),
  ('looking_for', 'Female Best Friend'),
  ('looking_for', 'Male Best Friend'),
  ('looking_for', 'Study Partner'),
  ('looking_for', 'Gym Partner'),
  ('looking_for', 'Movie Partner'),
  ('looking_for', 'Hiking Partner'),
  ('looking_for', 'Music Collaborator'),
  ('looking_for', 'College Friend'),
  ('looking_for', 'Professional Mentor'),
  ('personality_types', 'Introvert'),
  ('personality_types', 'Extrovert'),
  ('personality_types', 'Ambivert'),
  ('personality_types', 'INTJ'),
  ('personality_types', 'INFP'),
  ('personality_types', 'ENFP'),
  ('personality_types', 'ENTJ'),
  ('personality_types', 'ISFJ'),
  ('personality_types', 'Creative'),
  ('personality_types', 'Analytical'),
  ('personality_types', 'Adventurous'),
  ('personality_types', 'Calm'),
  ('qualities', 'Honest'),
  ('qualities', 'Loyal'),
  ('qualities', 'Funny'),
  ('qualities', 'Ambitious'),
  ('qualities', 'Empathetic'),
  ('qualities', 'Responsible'),
  ('qualities', 'Creative'),
  ('qualities', 'Patient'),
  ('qualities', 'Confident'),
  ('qualities', 'Open-minded'),
  ('hobbies', 'Reading'),
  ('hobbies', 'Travelling'),
  ('hobbies', 'Gaming'),
  ('hobbies', 'Music'),
  ('hobbies', 'Photography'),
  ('hobbies', 'Cooking'),
  ('hobbies', 'Fitness'),
  ('hobbies', 'Writing'),
  ('hobbies', 'Art'),
  ('hobbies', 'Movies'),
  ('hobbies', 'Hiking'),
  ('hobbies', 'Dancing'),
  ('hobbies', 'Coding'),
  ('hobbies', 'Sports')
ON CONFLICT (field_name, value) DO NOTHING;

-- Owner admin account (password: prateekchauhan hashed as sha256)
INSERT INTO admin_users (name, username, password_hash, role, accessible_pages)
VALUES (
  'Prateek Chauhan',
  'prateek',
  'd671facd08851b8112337a12f76311aa43a6f0d419636d2031889d863961293c', -- sha256 of 'prateekchauhan'
  'owner',
  ARRAY['stats', 'users', 'fields', 'contacts', 'config', 'notifications', 'access']
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO platform_config (key, value)
VALUES ('contact_penalty_amount', '0')
ON CONFLICT (key) DO NOTHING;
