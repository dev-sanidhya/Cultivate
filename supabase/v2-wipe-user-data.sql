-- ============================================================
-- V2 reset: delete ALL user data, keep admin-panel accounts + platform config.
-- Dev/test only. Confirmed: no real users on this DB.
-- Run AFTER applying v2-features-migration.sql.
-- ============================================================

-- Child/feature tables first (most have ON DELETE CASCADE from profiles/cards,
-- but we truncate explicitly to be safe and to clear rows with no FK to profiles).
TRUNCATE TABLE
  card_closures,
  user_offers,
  notification_assist_counts,
  otp_requests,
  card_prioritizations,
  chat_unlocks,
  chat_reads,
  messages,
  chats,
  user_blocks,
  card_interactions,
  custom_option_requests,
  contact_detail_warnings,
  notifications,
  searches,
  visit_logs,
  cards
  RESTART IDENTITY CASCADE;

-- Profiles + their auth users.
DELETE FROM profiles;
DELETE FROM auth.users;

-- Preserved intentionally: admin_users, platform_config, chat_pricing,
-- prioritization_plans, offers, offer_category_benefits, field_options,
-- banner_sections, banner_images, contact_groups, tagged_address_suggestions.
