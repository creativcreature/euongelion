import { create } from 'zustand'

interface AuthState {
  /** Supabase user ID (null = not authenticated) */
  userId: string | null
  /** User email */
  email: string | null
  /** Whether auth state has been checked */
  initialized: boolean
  /** Loading state for auth operations */
  loading: boolean

  setUser: (userId: string | null, email: string | null) => void
  setInitialized: () => void
  setLoading: (loading: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  email: null,
  initialized: false,
  loading: false,

  setUser: (userId, email) => set({ userId, email, initialized: true }),
  setInitialized: () => set({ initialized: true }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ userId: null, email: null }),
}))
