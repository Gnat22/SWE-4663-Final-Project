'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Don't show navbar on login and signup pages
  if (pathname === '/login' || pathname === '/signup') {
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
          {/* Brand/Logo */}
          <div className="flex items-center">
            <span className="text-xl font-semibold text-slate-800">
              AppName
            </span>
          </div>
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            type="button"
            className="px-6 py-2 bg-slate-600 text-white font-medium rounded-full hover:bg-slate-700 transition duration-200 shadow-sm hover:shadow-md"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
