'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [newEmail, setNewEmail] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')

  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentEmail(user.email)
      }
    }
    loadUserEmail()
  }, [supabase])

  const handleEmailChange = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setEmailError(null)
    setEmailSuccess(null)

    if (!newEmail) {
      setEmailError('Please enter a new email address')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (updateError) {
      setEmailError(updateError.message)
    } else {
      setEmailSuccess('Email update initiated! Please check both your old and new email addresses for confirmation links.')
      setNewEmail('')
    }
  }

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setPasswordError(updateError.message)
    } else {
      setPasswordSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleDeleteAccount = async (): Promise<void> => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const { error: deleteError } = await supabase.rpc('delete_own_account')

      if (deleteError) {
        setDeleteError('Failed to delete account: ' + deleteError.message)
        setIsDeleting(false)
        return
      }

      localStorage.clear()
      sessionStorage.clear()

      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      setDeleteError('An unexpected error occurred')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-800 mb-2">Account Settings</h1>
              <p className="text-slate-600">Manage your account preferences and security</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Change Email Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Change Email</h2>
            <p className="text-sm text-slate-600 mb-4">
              Current email: <span className="font-medium text-slate-800">{currentEmail}</span>
            </p>

            <form onSubmit={handleEmailChange} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-slate-700 mb-2">
                  New Email Address
                </label>
                <input
                  id="newEmail"
                  type="email"
                  placeholder="newemail@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {emailError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {emailError}
                </div>
              )}

              {emailSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {emailSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg"
              >
                Update Email
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Change Password</h2>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {passwordSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Delete Account Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-red-200">
            <h2 className="text-2xl font-semibold text-red-800 mb-4">Danger Zone</h2>
            <p className="text-slate-600 mb-6">
              Once you delete your account, there is no going back. This will permanently delete your account and all associated projects, team members, requirements, risks, and effort logs.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-200"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">This action cannot be undone!</p>
                  <p className="text-red-700 text-sm mb-4">
                    Type <span className="font-bold">DELETE</span> to confirm account deletion:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-4 py-2 border border-red-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {deleteError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                    className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete Account'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                      setDeleteError(null)
                    }}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
