'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../utils/supabase/client'

type UserType = 'user' | 'guest' | null

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

interface Requirement {
  id: string
  title: string
  description: string
  type: 'Functional' | 'Non-Functional'
}

type NewRiskInput = Omit<Risk, 'id'>
type NewRequirementInput = Omit<Requirement, 'id'>

export default function NewProjectPage() {
  const router = useRouter()

  const [userType, setUserType] = useState<UserType>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [projectForm, setProjectForm] = useState({
    project_name: '',
    description: '',
    owner_name: ''
  })

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newMember, setNewMember] = useState({ member_name: '', email: '' })
  const [showAddMember, setShowAddMember] = useState(false)

  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [newRequirement, setNewRequirement] = useState<NewRequirementInput>({
    title: '',
    description: '',
    type: 'Functional'
  })
  const [showAddRequirement, setShowAddRequirement] = useState(false)

  const [risks, setRisks] = useState<Risk[]>([])
  const [newRisk, setNewRisk] = useState<NewRiskInput>({
    risk_description: '',
    status: 'Open',
    severity: 'Medium',
    mitigation_plan: ''
  })
  const [showAddRisk, setShowAddRisk] = useState(false)

  const [showWarning, setShowWarning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [errors, setErrors] = useState({
    project_name: false,
    owner_name: false,
    requirement_title: false,
    member_name: false,
    risk_description: false
  })

  useEffect(() => {
    const supabase = createClient()
    const checkAuth = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUserType('user')
        setUserId(session.user.id)
        return
      }

      const isGuest = localStorage.getItem('is_guest')
      if (isGuest === 'true') {
        setUserType('guest')
        return
      }

      router.push('/login')
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const formHasContent = projectForm.project_name.trim() !== '' ||
                          projectForm.description.trim() !== '' ||
                          projectForm.owner_name.trim() !== '' ||
                          teamMembers.length > 0 ||
                          requirements.length > 0 ||
                          risks.length > 0
    setHasUnsavedChanges(formHasContent)
  }, [projectForm, teamMembers, requirements, risks])

  const addTeamMember = () => {
    if (!newMember.member_name) {
      alert('<Member name> is required.')
      return
    }

    const member: TeamMember = {
      id: `temp-member-${Date.now()}`,
      member_name: newMember.member_name,
      email: newMember.email
    }
    setTeamMembers([...teamMembers, member])
    setNewMember({ member_name: '', email: '' })
    setShowAddMember(false)
  }

  const deleteTeamMember = (memberId: string) => {
    setTeamMembers(teamMembers.filter(m => m.id !== memberId))
  }

  const addRequirement = () => {
    if (!newRequirement.title) {
      alert('<Requirement title> is required.')
      return
    }

    const requirement: Requirement = {
      id: `temp-requirement-${Date.now()}`,
      title: newRequirement.title,
      description: newRequirement.description,
      type: newRequirement.type
    }
    setRequirements([...requirements, requirement])
    setNewRequirement({ title: '', description: '', type: 'Functional' })
    setShowAddRequirement(false)
  }

  const deleteRequirement = (requirementId: string) => {
    setRequirements(requirements.filter(r => r.id !== requirementId))
  }

  const addRisk = () => {
    if (!newRisk.risk_description) {
      alert('<Risk description> is required.')
      return
    }

    const risk: Risk = {
      id: `temp-risk-${Date.now()}`,
      risk_description: newRisk.risk_description,
      status: newRisk.status,
      severity: newRisk.severity,
      mitigation_plan: newRisk.mitigation_plan
    }
    setRisks([risk, ...risks])
    setNewRisk({
      risk_description: '',
      status: 'Open',
      severity: 'Medium',
      mitigation_plan: ''
    })
    setShowAddRisk(false)
  }

  const deleteRisk = (riskId: string) => {
    setRisks(risks.filter(r => r.id !== riskId))
  }

  const createProject = async () => {
    if (!projectForm.project_name || !projectForm.owner_name) {
      alert('Please fill in required fields.')
      return
    }

    if (userType === 'guest') {
      const newProject = {
        id: `guest-project-${Date.now()}`,
        project_name: projectForm.project_name,
        description: projectForm.description,
        owner_name: projectForm.owner_name
      }

      const guestProjects = sessionStorage.getItem('guest_projects')
      const parsedProjects = guestProjects ? JSON.parse(guestProjects) : []
      const updatedProjects = [newProject, ...parsedProjects]

      sessionStorage.setItem('guest_projects', JSON.stringify(updatedProjects))
      sessionStorage.setItem(`guest_members_${newProject.id}`, JSON.stringify(teamMembers))
      sessionStorage.setItem(`guest_requirements_${newProject.id}`, JSON.stringify(requirements))
      sessionStorage.setItem(`guest_risks_${newProject.id}`, JSON.stringify(risks))
      sessionStorage.setItem(`guest_effort_logs_${newProject.id}`, JSON.stringify([]))

      setHasUnsavedChanges(false)
      router.push(`/dashboard`)
      return
    }

    if (!userId) {
      alert('User ID not found. Please log in again.')
      return
    }

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session before insert:', session)
    console.log('User ID:', userId)
    console.log('Session user ID:', session?.user?.id)

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert([{ ...projectForm, account_id: userId }])
      .select()
      .single()

    if (projectError) {
      console.error('Project creation error:', projectError)
      alert(`Error creating project: ${projectError.message}`)
      return
    }

    if (!projectData) {
      alert('Error creating project. Please try again.')
      return
    }

    if (teamMembers.length > 0) {
      const membersToInsert = teamMembers.map(m => ({
        project_id: projectData.project_id,
        member_name: m.member_name,
        email: m.email
      }))
      await supabase.from('project_members').insert(membersToInsert)
    }

    if (requirements.length > 0) {
      const requirementsToInsert = requirements.map(r => ({
        project_id: projectData.project_id,
        title: r.title,
        description: r.description,
        type: r.type
      }))
      await supabase.from('project_requirements').insert(requirementsToInsert)
    }

    if (risks.length > 0) {
      const risksToInsert = risks.map(r => ({
        project_id: projectData.project_id,
        risk_description: r.risk_description,
        status: r.status,
        severity: r.severity,
        mitigation_plan: r.mitigation_plan
      }))
      await supabase.from('project_risks').insert(risksToInsert)
    }

    setHasUnsavedChanges(false)
    router.push(`/dashboard/project/${projectData.project_id}`)
  }

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowWarning(true)
    } else {
      router.push('/dashboard')
    }
  }

  const confirmDiscard = () => {
    setHasUnsavedChanges(false)
    setShowWarning(false)
    router.push('/dashboard')
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

  if (!userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackClick}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-slate-800">Create New Project</h1>
                <p className="text-sm text-slate-600 mt-1">Fill in all sections to create your project</p>
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
                  Your project data will not be saved permanently. Create an account to save your data.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* General Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">General Information</h2>

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
            </div>
          </div>

          {/* Requirements Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-800">Project Requirements</h2>
              <button
                onClick={() => setShowAddRequirement(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + Add Requirement
              </button>
            </div>

            {showAddRequirement && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
                <input
                  type="text"
                  value={newRequirement.title}
                  onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Requirement title *"
                />
                <textarea
                  value={newRequirement.description}
                  onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                  placeholder="Requirement description"
                />
                <select
                  value={newRequirement.type}
                  onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value as Requirement['type'] })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Functional">Functional</option>
                  <option value="Non-Functional">Non-Functional</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addRequirement}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRequirement(false)
                      setNewRequirement({ title: '', description: '', type: 'Functional' })
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {requirements.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No requirements added yet</p>
            ) : (
              <div className="space-y-3">
                {requirements.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            req.type === 'Functional'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {req.type}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 mb-1">{req.title}</p>
                        {req.description && (
                          <p className="text-sm text-slate-600">{req.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteRequirement(req.id)}
                        className="ml-4 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Members Section */}
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

          {/* Risks Section */}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Project Button */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Ready to Create?</h3>
                <p className="text-sm text-slate-600">
                  Make sure you've filled in the required fields.
                </p>
              </div>
              <button
                onClick={createProject}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Dialog */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Unsaved Changes</h3>
            <p className="text-slate-600 mb-6">
              You have unsaved changes. Are you sure you want to leave? All changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWarning(false)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Stay on Page
              </button>
              <button
                onClick={confirmDiscard}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
