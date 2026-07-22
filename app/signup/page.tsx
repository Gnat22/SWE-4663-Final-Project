'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function SignUpPage() {
  const router = useRouter()

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [needsConfirmation, setNeedsConfirmation] = useState<boolean>(false)

  const handleSignUp = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setSuccess(true)

      if (!data.session) {
        setNeedsConfirmation(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-slate-800 mb-2">Create Account</h2>
            <p className="text-slate-600">Sign up to get started</p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-full text-center">
              {needsConfirmation
                ? 'Account created! Please check your email to confirm your account, then sign in.'
                : 'Account created successfully! Redirecting to dashboard...'}
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-full text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-full text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-full hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg"
              >
                Create Account
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <a
                href="/login"
                className="text-blue-600 font-medium hover:text-blue-700 transition"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
