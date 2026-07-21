'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../utils/supabase/client'

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

interface Requirement {
  id: string
  title: string
  description: string
  type: 'Functional' | 'Non-Functional'
}

interface EffortLog {
  id: string
  requirement_id: string
  log_date: string
  phase: 'Requirements Analysis' | 'Designing' | 'Coding' | 'Testing' | 'Project Management'
  hours_expended: number
}

interface EffortSummary {
  requirement_id: string
  requirement_title: string
  requirement_type: string
  total_requirements_analysis_hours: number
  total_designing_hours: number
  total_coding_hours: number
  total_testing_hours: number
  total_project_management_hours: number
  total_overall_hours: number
}

type NewRiskInput = Omit<Risk, 'id'>
type NewRequirementInput = Omit<Requirement, 'id'>
type NewEffortLogInput = Omit<EffortLog, 'id'>

export default function ProjectEditPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

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

  const [effortLogs, setEffortLogs] = useState<EffortLog[]>([])
  const [effortSummaries, setEffortSummaries] = useState<EffortSummary[]>([])
  const [selectedRequirementForEffort, setSelectedRequirementForEffort] = useState<string | null>(null)
  const [newEffortLog, setNewEffortLog] = useState<NewEffortLogInput>({
    requirement_id: '',
    log_date: new Date().toISOString().split('T')[0],
    phase: 'Requirements Analysis',
    hours_expended: 0
  })
  const [showAddEffort, setShowAddEffort] = useState(false)
  const [showEffortSummary, setShowEffortSummary] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const checkAuth = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUserType('user')
        setUserId(session.user.id)
        await loadProjectData(session.user.id, projectId, supabase)
        return
      }

      const isGuest = localStorage.getItem('is_guest')
      if (isGuest === 'true') {
        setUserType('guest')
        loadGuestData(projectId)
        return
      }

      router.push('/login')
    }

    checkAuth()
  }, [router, projectId])

  const loadProjectData = async (uid: string, pid: string, supabaseClient = createClient()) => {
    const { data: projectData } = await supabaseClient
      .from('projects')
      .select('*, id:project_id')
      .eq('project_id', pid)
      .eq('account_id', uid)
      .single()

    if (projectData) {
      setProject(projectData)
      setProjectForm({
        project_name: projectData.project_name,
        description: projectData.description || '',
        owner_name: projectData.owner_name
      })

      const { data: membersData } = await supabaseClient
        .from('project_members')
        .select('*, id:member_id')
        .eq('project_id', projectData.id)
        .order('joined_at', { ascending: true })

      if (membersData) setTeamMembers(membersData)

      const { data: requirementsData } = await supabaseClient
        .from('project_requirements')
        .select('*, id:requirement_id')
        .eq('project_id', projectData.id)
        .order('requirement_id', { ascending: true })

      if (requirementsData) setRequirements(requirementsData)

      const { data: risksData } = await supabaseClient
        .from('project_risks')
        .select('*, id:risk_id')
        .eq('project_id', projectData.id)
        .order('updated_at', { ascending: false })

      if (risksData) setRisks(risksData)

      const { data: effortLogsData } = await supabaseClient
        .from('effort_logs')
        .select('*, id:log_id')
        .in('requirement_id', requirementsData?.map((r: Requirement) => r.id) || [])
        .order('log_date', { ascending: false })

      if (effortLogsData) setEffortLogs(effortLogsData)

      const { data: effortSummaryData } = await supabaseClient
        .from('v_project_effort_summary')
        .select('*')
        .eq('account_id', uid)
        .in('requirement_id', requirementsData?.map((r: Requirement) => r.id) || [])

      if (effortSummaryData) setEffortSummaries(effortSummaryData)
    } else {
      router.push('/dashboard')
    }
  }

  const loadGuestData = (pid: string) => {
    const guestProjects = sessionStorage.getItem('guest_projects')

    if (guestProjects) {
      const parsedProjects = JSON.parse(guestProjects)
      const foundProject = parsedProjects.find((p: Project) => p.id === pid)

      if (foundProject) {
        setProject(foundProject)
        setProjectForm({
          project_name: foundProject.project_name,
          description: foundProject.description || '',
          owner_name: foundProject.owner_name
        })

        const guestMembers = sessionStorage.getItem(`guest_members_${pid}`)
        const guestRequirements = sessionStorage.getItem(`guest_requirements_${pid}`)
        const guestRisks = sessionStorage.getItem(`guest_risks_${pid}`)
        const guestEffortLogs = sessionStorage.getItem(`guest_effort_logs_${pid}`)

        if (guestMembers) setTeamMembers(JSON.parse(guestMembers))
        if (guestRequirements) setRequirements(JSON.parse(guestRequirements))
        if (guestRisks) setRisks(JSON.parse(guestRisks))
        if (guestEffortLogs) {
          const logs = JSON.parse(guestEffortLogs)
          setEffortLogs(logs)
          calculateGuestEffortSummaries(logs, JSON.parse(guestRequirements || '[]'))
        }
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  const saveGuestData = (projectData: Project, membersData: TeamMember[], requirementsData: Requirement[], risksData: Risk[]) => {
    const guestProjects = sessionStorage.getItem('guest_projects')
    if (guestProjects) {
      const parsedProjects = JSON.parse(guestProjects)
      const updatedProjects = parsedProjects.map((p: Project) =>
        p.id === projectData.id ? projectData : p
      )
      sessionStorage.setItem('guest_projects', JSON.stringify(updatedProjects))
    }
    sessionStorage.setItem(`guest_members_${projectData.id}`, JSON.stringify(membersData))
    sessionStorage.setItem(`guest_requirements_${projectData.id}`, JSON.stringify(requirementsData))
    sessionStorage.setItem(`guest_risks_${projectData.id}`, JSON.stringify(risksData))
    sessionStorage.setItem(`guest_effort_logs_${projectData.id}`, JSON.stringify(effortLogs))
  }

  const calculateGuestEffortSummaries = (logs: EffortLog[], reqs: Requirement[]) => {
    const summaries: EffortSummary[] = reqs.map(req => {
      const reqLogs = logs.filter(log => log.requirement_id === req.id)
      return {
        requirement_id: req.id,
        requirement_title: req.title,
        requirement_type: req.type,
        total_requirements_analysis_hours: reqLogs.filter(l => l.phase === 'Requirements Analysis').reduce((sum, l) => sum + l.hours_expended, 0),
        total_designing_hours: reqLogs.filter(l => l.phase === 'Designing').reduce((sum, l) => sum + l.hours_expended, 0),
        total_coding_hours: reqLogs.filter(l => l.phase === 'Coding').reduce((sum, l) => sum + l.hours_expended, 0),
        total_testing_hours: reqLogs.filter(l => l.phase === 'Testing').reduce((sum, l) => sum + l.hours_expended, 0),
        total_project_management_hours: reqLogs.filter(l => l.phase === 'Project Management').reduce((sum, l) => sum + l.hours_expended, 0),
        total_overall_hours: reqLogs.reduce((sum, l) => sum + l.hours_expended, 0)
      }
    })
    setEffortSummaries(summaries)
  }

  const saveProject = async () => {
    if (userType === 'guest') {
      if (project) {
        const updatedProject: Project = {
          ...project,
          ...projectForm
        }
        setProject(updatedProject)
        saveGuestData(updatedProject, teamMembers, requirements, risks)
        setIsEditingProject(false)
      }
      return
    }

    if (!userId || !project) return

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update(projectForm)
      .eq('project_id', project.id)

    if (!error) {
      setProject({ ...project, ...projectForm })
      setIsEditingProject(false)
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
      saveGuestData(project, updatedMembers, requirements, risks)
      setNewMember({ member_name: '', email: '' })
      setShowAddMember(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_members')
      .insert([{ ...newMember, project_id: project.id }])
      .select('*, id:member_id')
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
      if (project) {
        saveGuestData(project, updatedMembers, requirements, risks)
      }
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('member_id', memberId)

    if (!error) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberId))
    }
  }

  const addRequirement = async () => {
    if (!project || !newRequirement.title) return

    if (userType === 'guest') {
      const guestRequirement: Requirement = {
        id: `guest-requirement-${Date.now()}`,
        title: newRequirement.title,
        description: newRequirement.description,
        type: newRequirement.type
      }
      const updatedRequirements = [...requirements, guestRequirement]
      setRequirements(updatedRequirements)
      saveGuestData(project, teamMembers, updatedRequirements, risks)
      setNewRequirement({ title: '', description: '', type: 'Functional' })
      setShowAddRequirement(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_requirements')
      .insert([{ ...newRequirement, project_id: project.id }])
      .select('*, id:requirement_id')
      .single()

    if (!error && data) {
      setRequirements([...requirements, data])
      setNewRequirement({ title: '', description: '', type: 'Functional' })
      setShowAddRequirement(false)
    }
  }

  const deleteRequirement = async (requirementId: string) => {
    if (userType === 'guest') {
      const updatedRequirements = requirements.filter(r => r.id !== requirementId)
      setRequirements(updatedRequirements)
      if (project) {
        saveGuestData(project, teamMembers, updatedRequirements, risks)
      }
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('project_requirements')
      .delete()
      .eq('requirement_id', requirementId)

    if (!error) {
      setRequirements(requirements.filter(r => r.id !== requirementId))
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
      saveGuestData(project, teamMembers, requirements, updatedRisks)
      setNewRisk({
        risk_description: '',
        status: 'Open',
        severity: 'Medium',
        mitigation_plan: ''
      })
      setShowAddRisk(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_risks')
      .insert([{ ...newRisk, project_id: project.id }])
      .select('*, id:risk_id')
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
      if (project) {
        saveGuestData(project, teamMembers, requirements, updatedRisks)
      }
      return
    }

    const supabase = createClient()
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
      if (project) {
        saveGuestData(project, teamMembers, requirements, updatedRisks)
      }
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('project_risks')
      .delete()
      .eq('risk_id', riskId)

    if (!error) {
      setRisks(risks.filter(r => r.id !== riskId))
    }
  }

  const addEffortLog = async () => {
    if (!project || !newEffortLog.requirement_id || newEffortLog.hours_expended <= 0) {
      alert('Please select a requirement and enter valid hours')
      return
    }

    if (userType === 'guest') {
      const guestLog: EffortLog = {
        id: `guest-effort-${Date.now()}`,
        requirement_id: newEffortLog.requirement_id,
        log_date: newEffortLog.log_date,
        phase: newEffortLog.phase,
        hours_expended: newEffortLog.hours_expended
      }
      const updatedLogs = [guestLog, ...effortLogs]
      setEffortLogs(updatedLogs)
      calculateGuestEffortSummaries(updatedLogs, requirements)
      saveGuestData(project, teamMembers, requirements, risks)
      setNewEffortLog({
        requirement_id: '',
        log_date: new Date().toISOString().split('T')[0],
        phase: 'Requirements Analysis',
        hours_expended: 0
      })
      setShowAddEffort(false)
      setSelectedRequirementForEffort(null)
      return
    }

    if (!userId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('effort_logs')
      .insert([{ ...newEffortLog, account_id: userId }])
      .select('*, id:log_id')
      .single()

    if (!error && data) {
      setEffortLogs([data, ...effortLogs])

      const supabase = createClient()
      const { data: effortSummaryData } = await supabase
        .from('v_project_effort_summary')
        .select('*')
        .eq('account_id', userId!)
        .in('requirement_id', requirements.map(r => r.id))

      if (effortSummaryData) setEffortSummaries(effortSummaryData)

      setNewEffortLog({
        requirement_id: '',
        log_date: new Date().toISOString().split('T')[0],
        phase: 'Requirements Analysis',
        hours_expended: 0
      })
      setShowAddEffort(false)
      setSelectedRequirementForEffort(null)
    }
  }

  const deleteEffortLog = async (logId: string) => {
    if (userType === 'guest') {
      const updatedLogs = effortLogs.filter(l => l.id !== logId)
      setEffortLogs(updatedLogs)
      calculateGuestEffortSummaries(updatedLogs, requirements)
      if (project) {
        saveGuestData(project, teamMembers, requirements, risks)
      }
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('effort_logs')
      .delete()
      .eq('log_id', logId)

    if (!error) {
      const updatedLogs = effortLogs.filter(l => l.id !== logId)
      setEffortLogs(updatedLogs)

      const supabase = createClient()
      const { data: effortSummaryData } = await supabase
        .from('v_project_effort_summary')
        .select('*')
        .eq('account_id', userId!)
        .in('requirement_id', requirements.map(r => r.id))

      if (effortSummaryData) setEffortSummaries(effortSummaryData)
    }
  }

  if (!userType || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Loading project...</div>
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-semibold text-slate-800">{project.project_name}</h1>
                <p className="text-sm text-slate-600 mt-1">Edit Project Details</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* General Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-800">General Information</h2>
              {!isEditingProject && (
                <button
                  onClick={() => setIsEditingProject(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingProject ? (
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
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProject(false)
                      setProjectForm({
                        project_name: project.project_name,
                        description: project.description || '',
                        owner_name: project.owner_name
                      })
                    }}
                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
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

          {/* Effort Tracking Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-800">Effort Tracking</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEffortSummary(!showEffortSummary)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {showEffortSummary ? 'Hide Summary' : 'View Summary'}
                </button>
                <button
                  onClick={() => setShowAddEffort(true)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  disabled={requirements.length === 0}
                >
                  + Log Effort
                </button>
              </div>
            </div>

            {requirements.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  You need to add at least one requirement before you can log effort.
                </p>
              </div>
            )}

            {showAddEffort && (
              <div className="mb-6 p-6 bg-slate-50 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Log Effort Hours</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Requirement *
                    </label>
                    <select
                      value={newEffortLog.requirement_id}
                      onChange={(e) => {
                        setNewEffortLog({ ...newEffortLog, requirement_id: e.target.value })
                        setSelectedRequirementForEffort(e.target.value)
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Select a requirement</option>
                      {requirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newEffortLog.log_date}
                      onChange={(e) => setNewEffortLog({ ...newEffortLog, log_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phase *
                    </label>
                    <select
                      value={newEffortLog.phase}
                      onChange={(e) => setNewEffortLog({ ...newEffortLog, phase: e.target.value as EffortLog['phase'] })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="Requirements Analysis">Requirements Analysis</option>
                      <option value="Designing">Designing</option>
                      <option value="Coding">Coding</option>
                      <option value="Testing">Testing</option>
                      <option value="Project Management">Project Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hours Expended *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newEffortLog.hours_expended}
                      onChange={(e) => setNewEffortLog({ ...newEffortLog, hours_expended: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-500 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="e.g., 8.5"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={addEffortLog}
                    className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Log Effort
                  </button>
                  <button
                    onClick={() => {
                      setShowAddEffort(false)
                      setSelectedRequirementForEffort(null)
                      setNewEffortLog({
                        requirement_id: '',
                        log_date: new Date().toISOString().split('T')[0],
                        phase: 'Requirements Analysis',
                        hours_expended: 0
                      })
                    }}
                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Effort Summary View */}
            {showEffortSummary && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Effort Summary by Requirement</h3>
                {effortSummaries.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No effort logged yet</p>
                ) : (
                  <div className="space-y-4">
                    {effortSummaries.map((summary) => (
                      <div key={summary.requirement_id} className="p-5 bg-slate-50 rounded-lg border-2 border-slate-200">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-slate-800">{summary.requirement_title}</h4>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                            summary.requirement_type === 'Functional'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {summary.requirement_type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-1">Requirements Analysis</p>
                            <p className="text-2xl font-bold text-slate-800">{summary.total_requirements_analysis_hours.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-1">Designing</p>
                            <p className="text-2xl font-bold text-slate-800">{summary.total_designing_hours.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-1">Coding</p>
                            <p className="text-2xl font-bold text-slate-800">{summary.total_coding_hours.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-1">Testing</p>
                            <p className="text-2xl font-bold text-slate-800">{summary.total_testing_hours.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-1">Project Management</p>
                            <p className="text-2xl font-bold text-slate-800">{summary.total_project_management_hours.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">hours</p>
                          </div>

                          <div className="bg-cyan-100 p-3 rounded-lg border-2 border-cyan-300">
                            <p className="text-xs font-medium text-cyan-900 mb-1">Total Hours</p>
                            <p className="text-2xl font-bold text-cyan-900">{summary.total_overall_hours.toFixed(1)}</p>
                            <p className="text-xs text-cyan-700">hours</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Effort Logs */}
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Recent Effort Logs</h3>
              {effortLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No effort logs recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {effortLogs.slice(0, 10).map((log) => {
                    const requirement = requirements.find(r => r.id === log.requirement_id)
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-slate-800">{requirement?.title || 'Unknown Requirement'}</span>
                            <span className="px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded-full">
                              {log.phase}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>Date: {new Date(log.log_date).toLocaleDateString()}</span>
                            <span className="font-semibold text-slate-800">{log.hours_expended} hours</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEffortLog(log.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
