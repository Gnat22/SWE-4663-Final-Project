"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return <>{children}</>
}
