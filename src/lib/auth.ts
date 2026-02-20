import { createClient } from './supabase/server'
import { getSession, linkSessionToUser } from './session'

function resolveAuthRedirectBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  // Keep auth callbacks canonical when env config is missing.
  return 'https://euangelion.app'
}

/**
 * Get the currently authenticated user (or null)
 */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Send a magic link to the user's email
 */
export async function sendMagicLink(email: string, redirectTo?: string) {
  const supabase = await createClient()
  const authRedirectBaseUrl = resolveAuthRedirectBaseUrl()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${authRedirectBaseUrl}/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * After auth callback: link the anonymous session to the authenticated user
 */
export async function onAuthSuccess(userId: string) {
  const session = await getSession()
  if (session && !session.user_id) {
    await linkSessionToUser(session.id, userId)
  }
}

/**
 * Sign out the current user (keeps anonymous session)
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
