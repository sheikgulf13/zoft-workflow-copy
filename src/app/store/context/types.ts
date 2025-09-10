export type Project = { id: string; name: string; description?: string };

export type ProjectDetails = Project & {
  createdAt: string;
  users: Array<{ id: string; email: string; role: string }>;
};

export type Platform = {
  id: string;
  name: string;
  role?: string;
  projects?: Project[];
};

export type LoginUser = {
  currentPlatform?: { id: string; name: string; role?: string };
  currentProject?: { id: string; name: string; description?: string };
  platforms?: Platform[];
};

export type ContextState = {
  currentPlatform?: { id: string; name: string; role?: string } | null;
  currentProject?: { id: string; name: string; description?: string } | null;
  platforms: Platform[];
  projectDetailsById: Record<string, ProjectDetails | undefined>;
};

export type ContextActions = {
  initializeFromLogin: (user: LoginUser | null | undefined) => void;
  setCurrentProject: (platformId: string, project: Project) => void;
  addProjectToPlatform: (platformId: string, project: Project) => void;
  setPlatformProjects: (platformId: string, projects: Project[]) => void;
  setProjectDetails: (details: ProjectDetails) => void;
  loadFullContext: () => Promise<void>;
  loadPlatformDetails: (platformId: string) => Promise<void>;
  loadProjectsForCurrentPlatform: () => Promise<void>;
  restore: () => void;
  clear: () => void;
};

export type ContextStore = ContextState & ContextActions;
