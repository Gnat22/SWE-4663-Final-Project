"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './utils/supabase/client'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const isGuest = localStorage.getItem('is_guest')

        if (session || isGuest === 'true') {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        router.replace('/login')
      } finally {
        setIsChecking(false)
      }
    }
    checkExistingSession()
  }, [router])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isChecking) {
        console.warn('Session check timeout, redirecting to login')
        router.replace('/login')
      }
    }, 3000)

    return () => clearTimeout(timeout)
  }, [isChecking, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Checking authentication...</p>
      </div>
    </div>
  )
}
