import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

export const createClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(url, anonKey, {
    cookies: {
      getAll() {
        return document.cookie.split('; ').map(cookie => {
          const [name, ...value] = cookie.split('=')
          return { name, value: value.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = `${name}=${value}; path=${options?.path ?? '/'}; max-age=${options?.maxAge ?? 31536000}; ${options?.sameSite ? `SameSite=${options.sameSite}` : 'SameSite=Lax'}`
        })
      },
    },
  })
}