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

      if (event === 'SIGNED_OUT' && !isGuest) {
        router.push('/login')
      }

      if (event === 'TOKEN_REFRESHED') {
        router.refresh()
      }

      if (event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
    })

    const checkRootRedirect = async () => {
      if (pathname === '/') {
        const { data: { session } } = await supabase.auth.getSession()
        const isGuest = localStorage.getItem('is_guest') === 'true'

        if (!session && !isGuest) {
          router.push('/login')
        }
      }
    }

    checkRootRedirect()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname])

  return <>{children}</>
}
