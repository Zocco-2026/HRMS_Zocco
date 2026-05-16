import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return Boolean(url?.trim() && anonKey?.trim())
}

/** Browser-only localStorage (SSR-safe guard). */
function browserLocalStorage() {
  if (typeof globalThis === 'undefined') return undefined
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/**
 * HR dashboard uses email/password only (no OAuth redirect). Explicit auth options keep
 * sessions in localStorage across browser restarts; detectSessionInUrl stays off to avoid
 * hash/query edge cases with React Router.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: browserLocalStorage(),
      },
    })
  : null

