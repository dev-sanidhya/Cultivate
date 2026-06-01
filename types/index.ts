export type Gender = "male" | "female" | "other"

export type TaggedAddressType = "college" | "school" | "workplace" | "general"

export interface CollegeAddress {
  type: "college"
  college_name: string
  graduation_year: string
  branch: string
  section: string
}

export interface SchoolAddress {
  type: "school"
  school_name: string
  pin_code: string
  completion_year: string
}

export interface WorkplaceAddress {
  type: "workplace"
  company_name: string
  pin_code: string
  department: string
}

export interface GeneralAddress {
  type: "general"
  pin_code: string
  building_name: string
}

export type TaggedAddress = CollegeAddress | SchoolAddress | WorkplaceAddress | GeneralAddress

export interface Profile {
  id: string
  phone: string
  first_name: string
  last_name: string
  gender: Gender
  date_of_birth: string
  photo_url: string | null
  contact_detail_warning_count: number
  contact_penalty_paid_at: string | null
  created_at: string
}

export interface Card {
  id: string
  card_id: string
  user_id: string
  age: number
  gender: Gender
  personality_types: string[]
  tagged_address: TaggedAddress | null
  looking_for: string
  qualities: string[]
  hobbies: string[]
  note: string | null
  is_public: boolean
  is_closed: boolean
  closed_with_profile_id: string | null
  chat_enabled: boolean
  view_count: number
  save_count: number
  like_count: number
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface FieldOption {
  id: string
  field_name: string
  value: string
  is_approved: boolean
  submitted_by: string | null
  created_at: string
}

export interface CustomOptionRequest {
  id: string
  user_id: string
  card_id: string
  field_name: string
  value: string
  status: "pending" | "approved" | "rejected" | "modified"
  modified_value: string | null
  created_at: string
}

export interface Search {
  id: string
  user_id: string
  search_type: "filter" | "card_id"
  card_id_query: string | null
  age: number | null
  gender: Gender | null
  personality_types: string[]
  tagged_address: TaggedAddress | null
  looking_for: string | null
  qualities: string[]
  hobbies: string[]
  new_cards_count: number
  last_searched_at: string
  created_at: string
}

export interface CardInteraction {
  id: string
  user_id: string
  card_id: string
  type: "like" | "save" | "read"
  created_at: string
}

export interface Chat {
  id: string
  initiator_id: string
  recipient_id: string
  initiator_card_id: string
  recipient_card_id: string
  looking_for_category: string
  last_message_at: string | null
  last_activity_at: string
  created_at: string
  other_profile?: Profile
  other_card?: Card
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: "text" | "image"
  image_url: string | null
  created_at: string
}

export interface ChatUnlock {
  id: string
  user_id: string
  card_id: string
  looking_for_category: string
  expires_at: string
  created_at: string
}

export interface UserBlock {
  id: string
  blocker_id: string
  blocked_user_id: string
  blocked_card_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  message: string
  type: "custom_option_rejected" | "custom_option_approved" | "admin_message" | "chat" | "general"
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface ContactGroup {
  id: string
  group_type: "college" | "school" | "workplace"
  details: Record<string, string>
  contacts_uploaded: boolean
  outreach_completed: boolean
  created_at: string
}

export interface AdminUser {
  id: string
  name: string
  username: string
  role: "owner" | "employee"
  accessible_pages: string[]
  created_at: string
}

export interface PlatformConfig {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface ChatPricing {
  id: string
  looking_for_category: string
  price: number
  duration_days: number
}

export type CardField = "looking_for" | "personality_types" | "qualities" | "hobbies"

export const CARD_FIELDS_WITH_OPTIONS: CardField[] = [
  "looking_for",
  "personality_types",
  "qualities",
  "hobbies",
]
