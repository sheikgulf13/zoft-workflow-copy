import { create } from 'zustand'

export type Project = { id: string; name: string; description?: string }
export type ProjectDetails = Project & { 
  createdAt: string; 
  users: Array<{ id: string; email: string; role: string }> 
}
export type Platform = { id: string; name: string; role?: string; projects?: Project[] }

type LoginUser = {
  currentPlatform?: { id: string; name: string; role?: string }
  currentProject?: { id: string; name: string; description?: string }
  platforms?: Platform[]
}

type ContextState = {
  currentPlatform?: { id: string; name: string; role?: string } | null
  currentProject?: { id: string; name: string; description?: string } | null
  platforms: Platform[]
  projectDetailsById: Record<string, ProjectDetails | undefined>
  initializeFromLogin: (user: LoginUser | null | undefined) => void
  setCurrentProject: (platformId: string, project: Project) => void
  addProjectToPlatform: (platformId: string, project: Project) => void
  setPlatformProjects: (platformId: string, projects: Project[]) => void
  setProjectDetails: (details: ProjectDetails) => void
  loadFullContext: () => Promise<void>
  loadPlatformDetails: (platformId: string) => Promise<void>
  restore: () => void
  clear: () => void
}

const CTX_KEY = 'zw_ctx'

function loadContext(): Pick<ContextState, 'currentPlatform' | 'currentProject' | 'platforms' | 'projectDetailsById'> {
  try {
    const raw = sessionStorage.getItem(CTX_KEY)
    if (!raw) return { currentPlatform: null, currentProject: null, platforms: [], projectDetailsById: {} }
    const parsed = JSON.parse(raw) as {
      currentPlatform?: { id: string; name: string; role?: string } | null
      currentProject?: { id: string; name: string; description?: string } | null
      platforms?: Platform[]
      projectDetailsById?: Record<string, ProjectDetails | undefined>
    }
    return {
      currentPlatform: parsed.currentPlatform ?? null,
      currentProject: parsed.currentProject ?? null,
      platforms: parsed.platforms ?? [],
      projectDetailsById: parsed.projectDetailsById ?? {},
    }
  } catch {
    return { currentPlatform: null, currentProject: null, platforms: [], projectDetailsById: {} }
  }
}

function saveContext(value: Pick<ContextState, 'currentPlatform' | 'currentProject' | 'platforms' | 'projectDetailsById'>) {
  try {
    sessionStorage.setItem(CTX_KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export const useContextStore = create<ContextState>((set, get) => ({
  ...loadContext(),
  initializeFromLogin: (user) => {
    const next = {
      currentPlatform: user?.currentPlatform ?? null,
      currentProject: user?.currentProject ?? null,
      platforms: user?.platforms ?? [],
      projectDetailsById: get().projectDetailsById ?? {},
    }
    saveContext(next)
    set(next)
  },
  setCurrentProject: (platformId, project) => {
    const state = get()
    const currentPlatform =
      state.currentPlatform && state.currentPlatform.id === platformId
        ? state.currentPlatform
        : state.platforms.find((p) => p.id === platformId)
          ? { id: platformId, name: state.platforms.find((p) => p.id === platformId)!.name }
          : state.currentPlatform ?? null
    const next = {
      currentPlatform,
      currentProject: project,
      platforms: state.platforms,
      projectDetailsById: state.projectDetailsById,
    }
    saveContext(next)
    set(next)
  },
  addProjectToPlatform: (platformId, project) => {
    const state = get()
    const platforms = state.platforms.map((pl) => {
      if (pl.id !== platformId) return pl
      const existing = pl.projects ?? []
      // Prepend newly created project
      return { ...pl, projects: [project, ...existing] }
    })
    const platformExists = platforms.some((p) => p.id === platformId)
    const nextPlatforms = platformExists
      ? platforms
      : [...platforms, { id: platformId, name: '', projects: [project] }]
    const next = {
      currentPlatform: state.currentPlatform?.id === platformId
        ? state.currentPlatform
        : state.currentPlatform ?? null,
      currentProject: project,
      platforms: nextPlatforms,
      projectDetailsById: state.projectDetailsById,
    }
    saveContext(next)
    set(next)
  },
  setPlatformProjects: (platformId, projects) => {
    const state = get()
    const platforms = state.platforms.map((pl) => (pl.id === platformId ? { ...pl, projects } : pl))
    const next = {
      currentPlatform: state.currentPlatform,
      currentProject: state.currentProject,
      platforms,
      projectDetailsById: state.projectDetailsById,
    }
    saveContext(next)
    set(next)
  },
  setProjectDetails: (details) => {
    const state = get()
    const projectDetailsById = { ...state.projectDetailsById, [details.id]: details }
    const next = {
      currentPlatform: state.currentPlatform,
      currentProject: state.currentProject,
      platforms: state.platforms,
      projectDetailsById,
    }
    saveContext(next)
    set(next)
  },
  loadFullContext: async () => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL ?? ''
      const url = `${baseUrl ? baseUrl.replace(/\/$/, '') : ''}/api/context`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('zw_access=')[1]?.split(';')[0] || ''}`
        }
      })
      if (!response.ok) throw new Error('Failed to load context')
      
      const data = await response.json()
      const next = {
        currentPlatform: data.currentPlatform ?? null,
        currentProject: data.currentProject ?? null,
        platforms: data.availablePlatforms ?? [],
        projectDetailsById: get().projectDetailsById ?? {},
      }
      saveContext(next)
      set(next)
    } catch (error) {
      console.error('Failed to load full context:', error)
    }
  },
  loadPlatformDetails: async (platformId: string) => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL ?? ''
      const url = `${baseUrl ? baseUrl.replace(/\/$/, '') : ''}/api/platforms/${platformId}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('zw_access=')[1]?.split(';')[0] || ''}`
        }
      })
      if (!response.ok) throw new Error('Failed to load platform details')
      
      const data = await response.json()
      const state = get()
      const platforms = state.platforms.map((pl) => 
        pl.id === platformId ? { ...pl, projects: data.platform.projects } : pl
      )
      const next = {
        currentPlatform: state.currentPlatform,
        currentProject: state.currentProject,
        platforms,
        projectDetailsById: state.projectDetailsById,
      }
      saveContext(next)
      set(next)
    } catch (error) {
      console.error('Failed to load platform details:', error)
    }
  },
  restore: () => {
    const loaded = loadContext()
    set(loaded)
  },
  clear: () => {
    saveContext({ currentPlatform: null, currentProject: null, platforms: [], projectDetailsById: {} })
    set({ currentPlatform: null, currentProject: null, platforms: [], projectDetailsById: {} })
  },
}))


