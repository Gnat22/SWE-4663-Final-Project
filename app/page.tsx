"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './utils/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const isGuest = localStorage.getItem('is_guest')

      if (session || isGuest === 'true') {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
    checkExistingSession()
  }, [router, supabase])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Checking authentication...</p>
    </div>
  )
}
