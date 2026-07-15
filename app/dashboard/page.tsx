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

interface TeamMember {
  id: string
  member_name: string
  email: string
}

interface Risk {
  id: string
  risk_description: string
  status: 'Open' | 'Mitigated' | 'Closed' | 'Monitoring'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  mitigation_plan: string
}

type NewRiskInput = Omit<Risk, 'id'>

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [userType, setUserType] = useState<UserType>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({
    project_name: '',
    description: '',
    owner_name: ''
  })

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newMember, setNewMember] = useState({ member_name: '', email: '' })
  const [showAddMember, setShowAddMember] = useState(false)

  const [risks, setRisks] = useState<Risk[]>([])
  const [newRisk, setNewRisk] = useState<NewRiskInput>({
    risk_description: '',
    status: 'Open',
    severity: 'Medium',
    mitigation_plan: ''
  })
  const [showAddRisk, setShowAddRisk] = useState(false)

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUserType('user')
        setUserId(session.user.id)
        await loadProjectData(session.user.id)
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
  }, [router, supabase])

  const loadProjectData = async (uid: string) => {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('account_id', uid)
      .single()

    if (projectData) {
      setProject(projectData)
      setProjectForm({
        project_name: projectData.project_name,
        description: projectData.description || '',
        owner_name: projectData.owner_name
      })

      const { data: membersData } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectData.id)
        .order('joined_at', { ascending: true })

      if (membersData) setTeamMembers(membersData)

      const { data: risksData } = await supabase
        .from('project_risks')
        .select('*')
        .eq('project_id', projectData.id)
        .order('updated_at', { ascending: false })

      if (risksData) setRisks(risksData)
    }
  }

  const loadGuestData = () => {
    
    const guestProject = sessionStorage.getItem('guest_project')
    const guestMembers = sessionStorage.getItem('guest_members')
    const guestRisks = sessionStorage.getItem('guest_risks')

    if (guestProject) {
      const parsedProject = JSON.parse(guestProject)
      setProject(parsedProject)
      setProjectForm({
        project_name: parsedProject.project_name,
        description: parsedProject.description || '',
        owner_name: parsedProject.owner_name
      })
    }

    if (guestMembers) {
      setTeamMembers(JSON.parse(guestMembers))
    }

    if (guestRisks) {
      setRisks(JSON.parse(guestRisks))
    }
  }

  const saveGuestData = (projectData: Project | null, membersData: TeamMember[], risksData: Risk[]) => {
    if (projectData) {
      sessionStorage.setItem('guest_project', JSON.stringify(projectData))
    }
    sessionStorage.setItem('guest_members', JSON.stringify(membersData))
    sessionStorage.setItem('guest_risks', JSON.stringify(risksData))
  }

  const saveProject = async () => {
    if (userType === 'guest') {
      const guestProject: Project = {
        id: 'guest-project-id',
        project_name: projectForm.project_name,
        description: projectForm.description,
        owner_name: projectForm.owner_name
      }
      setProject(guestProject)
      saveGuestData(guestProject, teamMembers, risks)
      setIsEditingProject(false)
      return
    }

    if (!userId) return

    if (project && project.id !== 'guest-project-id') {
      const { error } = await supabase
        .from('projects')
        .update(projectForm)
        .eq('id', project.id)

      if (!error) {
        setProject({ ...project, ...projectForm })
        setIsEditingProject(false)
      }
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectForm, account_id: userId }])
        .select()
        .single()

      if (!error && data) {
        setProject(data)
        setIsEditingProject(false)
      }
    }
  }

  const addTeamMember = async () => {
    if (!project || !newMember.member_name) return

    if (userType === 'guest') {
      const guestMember: TeamMember = {
        id: `guest-member-${Date.now()}`,
        member_name: newMember.member_name,
        email: newMember.email
      }
      const updatedMembers = [...teamMembers, guestMember]
      setTeamMembers(updatedMembers)
      saveGuestData(project, updatedMembers, risks)
      setNewMember({ member_name: '', email: '' })
      setShowAddMember(false)
      return
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert([{ ...newMember, project_id: project.id }])
      .select()
      .single()

    if (!error && data) {
      setTeamMembers([...teamMembers, data])
      setNewMember({ member_name: '', email: '' })
      setShowAddMember(false)
    }
  }

  const deleteTeamMember = async (memberId: string) => {
    if (userType === 'guest') {
      const updatedMembers = teamMembers.filter(m => m.id !== memberId)
      setTeamMembers(updatedMembers)
      saveGuestData(project, updatedMembers, risks)
      return
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('member_id', memberId)

    if (!error) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberId))
    }
  }

  const addRisk = async () => {
    if (!project || !newRisk.risk_description) return

    if (userType === 'guest') {
      const guestRisk: Risk = {
        id: `guest-risk-${Date.now()}`,
        risk_description: newRisk.risk_description,
        status: newRisk.status,
        severity: newRisk.severity,
        mitigation_plan: newRisk.mitigation_plan
      }
      const updatedRisks = [guestRisk, ...risks]
      setRisks(updatedRisks)
      saveGuestData(project, teamMembers, updatedRisks)
      setNewRisk({
        risk_description: '',
        status: 'Open',
        severity: 'Medium',
        mitigation_plan: ''
      })
      setShowAddRisk(false)
      return
    }

    const { data, error } = await supabase
      .from('project_risks')
      .insert([{ ...newRisk, project_id: project.id }])
      .select()
      .single()

    if (!error && data) {
      setRisks([data, ...risks])
      setNewRisk({
        risk_description: '',
        status: 'Open',
        severity: 'Medium',
        mitigation_plan: ''
      })
      setShowAddRisk(false)
    }
  }

  const updateRiskStatus = async (riskId: string, status: Risk['status']) => {
    if (userType === 'guest') {
      const updatedRisks = risks.map(r => r.id === riskId ? { ...r, status } : r)
      setRisks(updatedRisks)
      saveGuestData(project, teamMembers, updatedRisks)
      return
    }

    const { error } = await supabase
      .from('project_risks')
      .update({ status })
      .eq('risk_id', riskId)

    if (!error) {
      setRisks(risks.map(r => r.id === riskId ? { ...r, status } : r))
    }
  }

  const deleteRisk = async (riskId: string) => {
    if (userType === 'guest') {
      const updatedRisks = risks.filter(r => r.id !== riskId)
      setRisks(updatedRisks)
      saveGuestData(project, teamMembers, updatedRisks)
      return
    }

    const { error } = await supabase
      .from('project_risks')
      .delete()
      .eq('risk_id', riskId)

    if (!error) {
      setRisks(risks.filter(r => r.id !== riskId))
    }
  }

  const handleLogOut = async (): Promise<void> => {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800'
      case 'Monitoring': return 'bg-blue-100 text-blue-800'
      case 'Mitigated': return 'bg-yellow-100 text-yellow-800'
      case 'Closed': return 'bg-green-100 text-green-800'
      default: return 'bg-slate-100 text-slate-800'
    }
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

        {/* Main Content - General Section */}
        {(userType === 'user' || userType === 'guest') && (
          <div className="space-y-6">
            {/* Project Information */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-slate-800">General Section</h2>
                {!isEditingProject && project && (
                  <button
                    onClick={() => setIsEditingProject(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Project
                  </button>
                )}
              </div>

              {(!project || isEditingProject) ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={projectForm.project_name}
                      onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project Description
                    </label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                      placeholder="High-level description of the software project"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Project Owner *
                    </label>
                    <input
                      type="text"
                      value={projectForm.owner_name}
                      onChange={(e) => setProjectForm({ ...projectForm, owner_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Owner's name"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveProject}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {project ? 'Update Project' : 'Create Project'}
                    </button>
                    {isEditingProject && (
                      <button
                        onClick={() => setIsEditingProject(false)}
                        className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Project Name</h3>
                    <p className="text-lg text-slate-800">{project.project_name}</p>
                  </div>

                  {project.description && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Description</h3>
                      <p className="text-slate-700">{project.description}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Owner</h3>
                    <p className="text-slate-800">{project.owner_name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Team Members Section */}
            {project && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-800">Team Members</h2>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    + Add Member
                  </button>
                </div>

                {showAddMember && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newMember.member_name}
                        onChange={(e) => setNewMember({ ...newMember, member_name: e.target.value })}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Member name *"
                      />
                      <input
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addTeamMember}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMember(false)
                          setNewMember({ member_name: '', email: '' })
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {teamMembers.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No team members added yet</p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{member.member_name}</p>
                          {member.email && (
                            <span className="text-sm text-slate-600">{member.email}</span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTeamMember(member.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Risks Section */}
            {project && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-800">Project Risks</h2>
                  <button
                    onClick={() => setShowAddRisk(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    + Add Risk
                  </button>
                </div>

                {showAddRisk && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
                    <textarea
                      value={newRisk.risk_description}
                      onChange={(e) => setNewRisk({ ...newRisk, risk_description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
                      placeholder="Risk description *"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={newRisk.severity}
                        onChange={(e) => setNewRisk({ ...newRisk, severity: e.target.value as Risk['severity'] })}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Low">Low Severity</option>
                        <option value="Medium">Medium Severity</option>
                        <option value="High">High Severity</option>
                        <option value="Critical">Critical Severity</option>
                      </select>
                      <select
                        value={newRisk.status}
                        onChange={(e) => setNewRisk({ ...newRisk, status: e.target.value as Risk['status'] })}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="Open">Open</option>
                        <option value="Monitoring">Monitoring</option>
                        <option value="Mitigated">Mitigated</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <textarea
                      value={newRisk.mitigation_plan}
                      onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[60px]"
                      placeholder="Mitigation plan (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addRisk}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add Risk
                      </button>
                      <button
                        onClick={() => {
                          setShowAddRisk(false)
                          setNewRisk({
                            risk_description: '',
                            status: 'Open',
                            severity: 'Medium',
                            mitigation_plan: ''
                          })
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {risks.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No risks identified yet</p>
                ) : (
                  <div className="space-y-4">
                    {risks.map((risk) => (
                      <div key={risk.id} className={`p-4 border-2 rounded-lg ${getSeverityColor(risk.severity)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(risk.status)}`}>
                                {risk.status}
                              </span>
                              <span className="text-xs font-medium">
                                {risk.severity} Severity
                              </span>
                            </div>
                            <p className="text-slate-800 font-medium mb-2">{risk.risk_description}</p>
                            {risk.mitigation_plan && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-slate-700">Mitigation Plan:</p>
                                <p className="text-sm text-slate-600">{risk.mitigation_plan}</p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteRisk(risk.id)}
                            className="ml-4 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => updateRiskStatus(risk.id, 'Open')}
                            disabled={risk.status === 'Open'}
                            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => updateRiskStatus(risk.id, 'Monitoring')}
                            disabled={risk.status === 'Monitoring'}
                            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Monitoring
                          </button>
                          <button
                            onClick={() => updateRiskStatus(risk.id, 'Mitigated')}
                            disabled={risk.status === 'Mitigated'}
                            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Mitigated
                          </button>
                          <button
                            onClick={() => updateRiskStatus(risk.id, 'Closed')}
                            disabled={risk.status === 'Closed'}
                            className="px-3 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Closed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
