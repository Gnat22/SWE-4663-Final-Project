'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isGuest, setIsGuest] = useState<boolean | null>(null)

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const guestStatus = localStorage.getItem('is_guest') === 'true'

      setIsGuest(!session && guestStatus)
    }
    checkUserStatus()
  }, [supabase])

  // Only show navbar on specific valid routes
  const validRoutes = [
    '/dashboard',
    '/dashboard/project/new',
    '/settings'
  ]

  // Also allow dynamic project routes like /dashboard/project/[id]
  const isDynamicProjectRoute = pathname?.match(/^\/dashboard\/project\/[^/]+$/)
  const isValidRoute = validRoutes.includes(pathname) || isDynamicProjectRoute

  if (!isValidRoute) {
    return null
  }

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    localStorage.removeItem('is_guest')
    document.cookie = "is_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* App Name */}
          <div className="flex items-center">
            <span className="text-xl font-semibold text-slate-800">
              SWE 4663 Final Project
            </span>
          </div>
          {/* Settings & Sign Out Buttons */}
          <div className="flex items-center gap-3">
            {isGuest === false && (
              <button
                onClick={() => router.push('/settings')}
                type="button"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition duration-200 shadow-sm hover:shadow-md"
              >
                Settings
              </button>
            )}
            <button
              onClick={handleSignOut}
              type="button"
              className="px-6 py-2 bg-slate-600 text-white font-medium rounded-full hover:bg-slate-700 transition duration-200 shadow-sm hover:shadow-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
