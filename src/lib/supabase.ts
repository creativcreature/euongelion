import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables (set in .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Flag to check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Browser client - for client components (only create if configured)
export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Server client factory - for server components and API routes
// Use the service role key for admin operations
export function createServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    // Fall back to anon key if service role not available
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Database types (will be expanded as schema is created)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      progress: {
        Row: {
          id: string
          user_id: string
          series_slug: string
          day: number
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          series_slug: string
          day: number
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          series_slug?: string
          day?: number
          completed_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          series_slug: string
          day: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          series_slug: string
          day: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          series_slug?: string
          day?: number
          created_at?: string
        }
      }
      soul_audit_responses: {
        Row: {
          id: string
          user_id: string
          responses: Record<string, unknown>
          recommended_series: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          responses: Record<string, unknown>
          recommended_series: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          responses?: Record<string, unknown>
          recommended_series?: string[]
          created_at?: string
        }
      }
    }
  }
}

export default supabase
