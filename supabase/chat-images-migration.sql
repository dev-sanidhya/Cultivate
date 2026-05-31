-- Minimal migration for image sharing in chat.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE OR REPLACE FUNCTION enforce_chat_message_media_rules()
RETURNS TRIGGER AS $$
DECLARE
  chat_initiator_id UUID;
  chat_recipient_id UUID;
BEGIN
  SELECT initiator_id, recipient_id
  INTO chat_initiator_id, chat_recipient_id
  FROM chats
  WHERE id = NEW.chat_id;

  IF chat_initiator_id IS NULL THEN
    RAISE EXCEPTION 'Chat does not exist.';
  END IF;

  IF NEW.sender_id NOT IN (chat_initiator_id, chat_recipient_id) THEN
    RAISE EXCEPTION 'Sender is not a participant in this chat.';
  END IF;

  IF COALESCE(NEW.message_type, 'text') = 'image' THEN
    IF COALESCE(btrim(NEW.image_url), '') = '' THEN
      RAISE EXCEPTION 'Image messages require an image URL.';
    END IF;

    IF COALESCE(btrim(NEW.content), '') <> '' THEN
      RAISE EXCEPTION 'Image messages cannot include text.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM messages
      WHERE chat_id = NEW.chat_id
        AND sender_id <> NEW.sender_id
    ) THEN
      RAISE EXCEPTION 'Photo sharing unlocks after the other user replies.';
    END IF;
  ELSE
    IF COALESCE(btrim(NEW.content), '') = '' THEN
      RAISE EXCEPTION 'Text messages require content.';
    END IF;

    IF NEW.image_url IS NOT NULL THEN
      RAISE EXCEPTION 'Text messages cannot include an image URL.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_media_rules ON messages;
CREATE TRIGGER messages_media_rules
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION enforce_chat_message_media_rules();

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_images_read" ON storage.objects;
CREATE POLICY "chat_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat_images_insert" ON storage.objects;
CREATE POLICY "chat_images_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "chat_images_delete" ON storage.objects;
CREATE POLICY "chat_images_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);
