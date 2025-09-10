import type { ContextState, Platform, ProjectDetails } from "./types";

const CTX_KEY = "zw_ctx";

export function loadContext(): Pick<
  ContextState,
  "currentPlatform" | "currentProject" | "platforms" | "projectDetailsById"
> {
  try {
    const raw = sessionStorage.getItem(CTX_KEY);
    if (!raw)
      return {
        currentPlatform: null,
        currentProject: null,
        platforms: [],
        projectDetailsById: {},
      };
    const parsed = JSON.parse(raw) as {
      currentPlatform?: { id: string; name: string; role?: string } | null;
      currentProject?: {
        id: string;
        name: string;
        description?: string;
      } | null;
      platforms?: Platform[];
      projectDetailsById?: Record<string, ProjectDetails | undefined>;
    };
    return {
      currentPlatform: parsed.currentPlatform ?? null,
      currentProject: parsed.currentProject ?? null,
      platforms: parsed.platforms ?? [],
      projectDetailsById: parsed.projectDetailsById ?? {},
    };
  } catch {
    return {
      currentPlatform: null,
      currentProject: null,
      platforms: [],
      projectDetailsById: {},
    };
  }
}

export function saveContext(
  value: Pick<
    ContextState,
    "currentPlatform" | "currentProject" | "platforms" | "projectDetailsById"
  >
) {
  try {
    sessionStorage.setItem(CTX_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}
