'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

type UserType = 'user' | 'guest' | null

interface Project {
  id: string
  project_name: string
  description: string
  owner_name: string
}

export default function Dashboard() {
  const router = useRouter()
  const [userType, setUserType] = useState<UserType>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const supabase = createClient()
    const checkAuth = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUserType('user')
        setUserId(session.user.id)
        await loadAllProjects(session.user.id, supabase)
        return
      }

      const isGuest = localStorage.getItem('is_guest')
      if (isGuest === 'true') {
        setUserType('guest')
        loadGuestData()
        return
      }

      router.push('/login')
    }

    checkAuth()
  }, [router])

  const loadAllProjects = async (uid: string, supabaseClient = createClient()) => {
    const { data: projectsData } = await supabaseClient
      .from('projects')
      .select('*, id:project_id')
      .eq('account_id', uid)
      .order('created_at', { ascending: false })

    if (projectsData) {
      setProjects(projectsData)
    }
  }

  const loadGuestData = () => {
    const guestProjects = sessionStorage.getItem('guest_projects')

    if (guestProjects) {
      const parsedProjects = JSON.parse(guestProjects)
      setProjects(parsedProjects)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    if (userType === 'guest') {
      const updatedProjects = projects.filter(p => p.id !== projectId)
      setProjects(updatedProjects)
      sessionStorage.setItem('guest_projects', JSON.stringify(updatedProjects))
      sessionStorage.removeItem(`guest_members_${projectId}`)
      sessionStorage.removeItem(`guest_risks_${projectId}`)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', projectId)

    if (!error && userId) {
      await loadAllProjects(userId)
    }
  }

  const handleLogOut = async (): Promise<void> => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('is_guest')
    sessionStorage.clear()
    document.cookie = "is_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    router.push('/login')
  }

  if (!userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Loading session...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-800 mb-2">Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Account Type:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userType === 'user'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {userType === 'user' ? 'Registered User' : 'Guest'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Warning */}
        {userType === 'guest' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Guest Account - Temporary Session</h3>
                <p className="text-amber-700 text-sm">
                  You can use all features, but your data will not be saved permanently. All changes will be lost when you close this tab or log out. Create an account to save your data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-800">My Projects</h2>
            <button
              onClick={() => router.push('/dashboard/project/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create New Project
            </button>
          </div>

          {/* Projects List */}
          {projects.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No projects yet. Create your first project to get started.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-5 border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">{project.project_name}</h3>
                      {project.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Owner:</span>
                          <span>{project.owner_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/dashboard/project/${project.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProject(project.id)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
