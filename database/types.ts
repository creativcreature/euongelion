/**
 * EUONGELION Database Types
 * TypeScript interfaces matching the Supabase database schema
 */

// =============================================================================
// Enums
// =============================================================================

export type SubscriptionTier = 'free' | 'premium' | 'lifetime'

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export type QuestionCategory =
  | 'faith_foundation'
  | 'prayer_life'
  | 'scripture_engagement'
  | 'community'
  | 'service'
  | 'spiritual_disciplines'
  | 'heart_condition'
  | 'life_integration'

export type QuestionType =
  | 'scale'
  | 'multiple_choice'
  | 'text'
  | 'yes_no'
  | 'frequency'

// =============================================================================
// Base Types
// =============================================================================

export interface Timestamps {
  created_at: string
  updated_at: string
}

// =============================================================================
// Users
// =============================================================================

export interface User extends Timestamps {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  onboarding_completed: boolean
  preferences: UserPreferences
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  notifications_enabled?: boolean
  daily_reminder_time?: string
  preferred_bible_version?: string
  font_size?: 'small' | 'medium' | 'large'
}

export interface UserInsert {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  subscription_tier?: SubscriptionTier
  onboarding_completed?: boolean
  preferences?: UserPreferences
}

export interface UserUpdate {
  full_name?: string | null
  avatar_url?: string | null
  subscription_tier?: SubscriptionTier
  onboarding_completed?: boolean
  preferences?: UserPreferences
}

// =============================================================================
// Series
// =============================================================================

export interface Series extends Timestamps {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  image_url: string | null
  thumbnail_url: string | null
  devotional_count: number
  duration_days: number | null
  difficulty_level: DifficultyLevel
  tags: string[]
  is_premium: boolean
  is_published: boolean
  is_featured: boolean
  sort_order: number
  author: string | null
}

export interface SeriesInsert {
  name: string
  slug: string
  description?: string | null
  short_description?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  duration_days?: number | null
  difficulty_level?: DifficultyLevel
  tags?: string[]
  is_premium?: boolean
  is_published?: boolean
  is_featured?: boolean
  sort_order?: number
  author?: string | null
}

export interface SeriesUpdate extends Partial<SeriesInsert> {}

// =============================================================================
// Devotionals
// =============================================================================

export interface Devotional extends Timestamps {
  id: string
  series_id: string | null
  title: string
  slug: string
  subtitle: string | null
  content: string
  content_html: string | null
  scripture_ref: string
  scripture_text: string | null
  scripture_version: string
  day_number: number | null
  reading_time_minutes: number
  prayer: string | null
  reflection_questions: string[]
  action_step: string | null
  audio_url: string | null
  image_url: string | null
  tags: string[]
  is_premium: boolean
  is_published: boolean
  is_featured: boolean
  author: string | null
  published_at: string | null
}

export interface DevotionalInsert {
  series_id?: string | null
  title: string
  slug: string
  subtitle?: string | null
  content: string
  content_html?: string | null
  scripture_ref: string
  scripture_text?: string | null
  scripture_version?: string
  day_number?: number | null
  reading_time_minutes?: number
  prayer?: string | null
  reflection_questions?: string[]
  action_step?: string | null
  audio_url?: string | null
  image_url?: string | null
  tags?: string[]
  is_premium?: boolean
  is_published?: boolean
  is_featured?: boolean
  author?: string | null
  published_at?: string | null
}

export interface DevotionalUpdate extends Partial<DevotionalInsert> {}

// =============================================================================
// User Progress
// =============================================================================

export interface UserProgress extends Timestamps {
  id: string
  user_id: string
  devotional_id: string
  series_id: string | null
  completed_at: string
  notes: string | null
  rating: number | null
  time_spent_seconds: number | null
}

export interface UserProgressInsert {
  user_id: string
  devotional_id: string
  series_id?: string | null
  completed_at?: string
  notes?: string | null
  rating?: number | null
  time_spent_seconds?: number | null
}

export interface UserProgressUpdate {
  notes?: string | null
  rating?: number | null
  time_spent_seconds?: number | null
}

// =============================================================================
// Bookmarks
// =============================================================================

export interface Bookmark {
  id: string
  user_id: string
  devotional_id: string
  collection_name: string
  notes: string | null
  created_at: string
}

export interface BookmarkInsert {
  user_id: string
  devotional_id: string
  collection_name?: string
  notes?: string | null
}

export interface BookmarkUpdate {
  collection_name?: string
  notes?: string | null
}

export interface BookmarkWithDevotional extends Bookmark {
  title: string
  subtitle: string | null
  scripture_ref: string
  image_url: string | null
  reading_time_minutes: number
  series_name: string | null
  series_slug: string | null
  bookmarked_at: string
  bookmark_notes: string | null
}

// =============================================================================
// Soul Audit Questions
// =============================================================================

export interface SoulAuditQuestion extends Timestamps {
  id: string
  question_text: string
  question_description: string | null
  category: QuestionCategory
  question_type: QuestionType
  options: QuestionOption[] | null
  min_value: number
  max_value: number
  min_label: string
  max_label: string
  weight: number
  sort_order: number
  is_required: boolean
  is_active: boolean
  help_text: string | null
  scripture_reference: string | null
}

export interface QuestionOption {
  value: string | number
  label: string
  description?: string
}

export interface SoulAuditQuestionInsert {
  question_text: string
  question_description?: string | null
  category: QuestionCategory
  question_type?: QuestionType
  options?: QuestionOption[] | null
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  weight?: number
  sort_order: number
  is_required?: boolean
  is_active?: boolean
  help_text?: string | null
  scripture_reference?: string | null
}

// =============================================================================
// Soul Audit Responses
// =============================================================================

export interface SoulAuditResponse extends Timestamps {
  id: string
  user_id: string
  question_id: string
  session_id: string
  response_value: number | null
  response_text: string | null
  response_json: Record<string, unknown> | null
}

export interface SoulAuditResponseInsert {
  user_id: string
  question_id: string
  session_id: string
  response_value?: number | null
  response_text?: string | null
  response_json?: Record<string, unknown> | null
}

// =============================================================================
// Soul Audit Sessions
// =============================================================================

export interface SoulAuditSession {
  id: string
  user_id: string
  started_at: string
  completed_at: string | null
  total_score: number | null
  category_scores: CategoryScores | null
  recommendations: Recommendation[] | null
  created_at: string
}

export interface CategoryScores {
  faith_foundation?: number
  prayer_life?: number
  scripture_engagement?: number
  community?: number
  service?: number
  spiritual_disciplines?: number
  heart_condition?: number
  life_integration?: number
}

export interface Recommendation {
  category: QuestionCategory
  title: string
  description: string
  suggested_series_id?: string
  priority: number
}

export interface SoulAuditSessionInsert {
  user_id: string
  started_at?: string
  completed_at?: string | null
  total_score?: number | null
  category_scores?: CategoryScores | null
  recommendations?: Recommendation[] | null
}

// =============================================================================
// User Streaks (View)
// =============================================================================

export interface UserStreak {
  user_id: string
  streak_start: string
  streak_end: string
  streak_length: number
}

// =============================================================================
// Soul Audit Results (View)
// =============================================================================

export interface SoulAuditResult {
  session_id: string
  user_id: string
  completed_at: string | null
  total_score: number | null
  category_scores: CategoryScores | null
  recommendations: Recommendation[] | null
  total_responses: number
  responses: SoulAuditResponseDetail[]
}

export interface SoulAuditResponseDetail {
  question_id: string
  question_text: string
  category: QuestionCategory
  response_value: number | null
  response_text: string | null
}

// =============================================================================
// Database Schema (for Supabase client typing)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      series: {
        Row: Series
        Insert: SeriesInsert
        Update: SeriesUpdate
      }
      devotionals: {
        Row: Devotional
        Insert: DevotionalInsert
        Update: DevotionalUpdate
      }
      user_progress: {
        Row: UserProgress
        Insert: UserProgressInsert
        Update: UserProgressUpdate
      }
      bookmarks: {
        Row: Bookmark
        Insert: BookmarkInsert
        Update: BookmarkUpdate
      }
      soul_audit_questions: {
        Row: SoulAuditQuestion
        Insert: SoulAuditQuestionInsert
        Update: Partial<SoulAuditQuestionInsert>
      }
      soul_audit_responses: {
        Row: SoulAuditResponse
        Insert: SoulAuditResponseInsert
        Update: Partial<SoulAuditResponseInsert>
      }
      soul_audit_sessions: {
        Row: SoulAuditSession
        Insert: SoulAuditSessionInsert
        Update: Partial<SoulAuditSessionInsert>
      }
    }
    Views: {
      user_streaks: {
        Row: UserStreak
      }
      bookmarks_with_devotionals: {
        Row: BookmarkWithDevotional
      }
      soul_audit_results: {
        Row: SoulAuditResult
      }
    }
    Enums: {
      subscription_tier: SubscriptionTier
      difficulty_level: DifficultyLevel
      question_category: QuestionCategory
      question_type: QuestionType
    }
  }
}
