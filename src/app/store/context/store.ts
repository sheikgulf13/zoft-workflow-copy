import { create } from "zustand";
import type {
  ContextActions,
  ContextState,
  ContextStore,
  Platform,
  Project,
  ProjectDetails,
} from "./types";
import { loadContext, saveContext } from "./persistence";
import {
  fetchFullContext,
  fetchPlatformDetails,
  fetchProjectsForPlatform,
} from "./services";

const initialState: ContextState = {
  ...loadContext(),
};

//

type SetState<T> = {
  (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: false
  ): void;
  (state: T | ((state: T) => T), replace: true): void;
};

const createActions = (
  set: SetState<ContextStore>,
  get: () => ContextStore
): ContextActions => ({
  initializeFromLogin: (user) => {
    const next = {
      currentPlatform: user?.currentPlatform ?? null,
      currentProject: user?.currentProject ?? null,
      platforms: user?.platforms ?? [],
      projectDetailsById: get().projectDetailsById ?? {},
    };
    saveContext(next);
    set(next);
  },
  setCurrentProject: (platformId: string, project: Project) => {
    const state = get();
    const currentPlatform =
      state.currentPlatform && state.currentPlatform.id === platformId
        ? state.currentPlatform
        : state.platforms.find((p) => p.id === platformId)
        ? {
            id: platformId,
            name: state.platforms.find((p) => p.id === platformId)!.name,
          }
        : state.currentPlatform ?? null;
    const next = {
      currentPlatform,
      currentProject: project,
      platforms: state.platforms,
      projectDetailsById: state.projectDetailsById,
    };
    saveContext(next);
    set(next);
  },
  addProjectToPlatform: (platformId: string, project: Project) => {
    const state = get();
    const platforms = state.platforms.map((pl) => {
      if (pl.id !== platformId) return pl;
      const existing = pl.projects ?? [];
      return { ...pl, projects: [project, ...existing] };
    });
    const platformExists = platforms.some((p) => p.id === platformId);
    const nextPlatforms = platformExists
      ? platforms
      : [
          ...platforms,
          { id: platformId, name: "", projects: [project] } as Platform,
        ];
    const next = {
      currentPlatform:
        state.currentPlatform?.id === platformId
          ? state.currentPlatform
          : state.currentPlatform ?? null,
      currentProject: project,
      platforms: nextPlatforms,
      projectDetailsById: state.projectDetailsById,
    };
    saveContext(next);
    set(next);
  },
  setPlatformProjects: (platformId: string, projects: Project[]) => {
    const state = get();
    const platforms = state.platforms.map((pl) =>
      pl.id === platformId ? { ...pl, projects } : pl
    );
    const next = {
      currentPlatform: state.currentPlatform,
      currentProject: state.currentProject,
      platforms,
      projectDetailsById: state.projectDetailsById,
    };
    saveContext(next);
    set(next);
  },
  setProjectDetails: (details: ProjectDetails) => {
    const state = get();
    const projectDetailsById = {
      ...state.projectDetailsById,
      [details.id]: details,
    };
    const next = {
      currentPlatform: state.currentPlatform,
      currentProject: state.currentProject,
      platforms: state.platforms,
      projectDetailsById,
    };
    saveContext(next);
    set(next);
  },
  loadFullContext: async () => {
    try {
      const existing = get();
      const data = await fetchFullContext();
      const next = {
        currentPlatform:
          existing.currentPlatform ?? data.currentPlatform ?? null,
        currentProject: existing.currentProject ?? data.currentProject ?? null,
        platforms:
          existing.platforms && existing.platforms.length > 0
            ? existing.platforms
            : data.availablePlatforms ?? [],
        projectDetailsById: existing.projectDetailsById ?? {},
      };
      saveContext(next);
      set(next);
    } catch (error) {
      console.error("Failed to load full context:", error);
    }
  },
  loadPlatformDetails: async (platformId: string) => {
    try {
      const data = await fetchPlatformDetails(platformId);
      const state = get();
      const platforms = state.platforms.map((pl) =>
        pl.id === platformId ? { ...pl, projects: data.platform.projects } : pl
      );
      const next = {
        currentPlatform: state.currentPlatform,
        currentProject: state.currentProject,
        platforms,
        projectDetailsById: state.projectDetailsById,
      };
      saveContext(next);
      set(next);
    } catch (error) {
      console.error("Failed to load platform details:", error);
    }
  },
  // Load all projects for current platform (for sidebar dropdown)
  loadProjectsForCurrentPlatform: async () => {
    try {
      const state = get();
      const platformId = state.currentPlatform?.id;
      if (!platformId) return;
      // Persisted projects available? avoid refetch
      const existing = state.platforms.find(
        (p) => p.id === platformId
      )?.projects;
      const projects =
        Array.isArray(existing) && existing.length > 0
          ? existing
          : (await fetchProjectsForPlatform(platformId)).projects;
      const platforms = state.platforms.map((pl) =>
        pl.id === platformId ? { ...pl, projects } : pl
      );
      const next = {
        currentPlatform: state.currentPlatform,
        currentProject: state.currentProject,
        platforms,
        projectDetailsById: state.projectDetailsById,
      };
      saveContext(next);
      set(next);
    } catch (error) {
      console.error("Failed to load projects list:", error);
    }
  },
  restore: () => {
    const loaded = loadContext();
    // Prefer last selected ids if available
    try {
      const lastPlatform =
        sessionStorage.getItem("zw_last_selected_platform") || undefined;
      const lastProject =
        sessionStorage.getItem("zw_last_selected_project") || undefined;
      let currentPlatform = loaded.currentPlatform;
      let currentProject = loaded.currentProject;
      if (lastPlatform) {
        const p = loaded.platforms.find((pl) => pl.id === lastPlatform);
        if (p) currentPlatform = { id: p.id, name: p.name, role: p.role };
      }
      if (lastProject) {
        const all = loaded.platforms.flatMap((pl) => pl.projects ?? []);
        const proj = all.find((pr) => pr.id === lastProject);
        if (proj)
          currentProject = {
            id: proj.id,
            name: proj.name,
            description: proj.description,
          };
      }
      set({ ...loaded, currentPlatform, currentProject });
    } catch {
      set(loaded);
    }
  },
  clear: () => {
    const cleared = {
      currentPlatform: null,
      currentProject: null,
      platforms: [],
      projectDetailsById: {} as Record<string, ProjectDetails | undefined>,
    };
    saveContext(cleared);
    set(cleared);
  },
});

export const useContextStore = create<ContextStore>((set, get) => ({
  ...initialState,
  ...createActions(set, get as () => ContextStore),
}));
