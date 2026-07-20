"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isGuest = localStorage.getItem('is_guest') === 'true'
      const isProtectedRoute = pathname?.startsWith('/dashboard')
      const isLoginRoute = pathname === '/login' || pathname === '/'

      if (event === 'SIGNED_OUT' && !isGuest && isProtectedRoute) {
        router.push('/login')
      }

      if (event === 'TOKEN_REFRESHED') {
        router.refresh()
      }

      if (event === 'SIGNED_IN' && isLoginRoute) {
        router.push('/dashboard')
      }
    })

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const isGuest = localStorage.getItem('is_guest') === 'true'
      const isProtectedRoute = pathname?.startsWith('/dashboard')

      if (isProtectedRoute && !session && !isGuest) {
        router.push('/login')
      }
    }

    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname])

  return <>{children}</>
}
