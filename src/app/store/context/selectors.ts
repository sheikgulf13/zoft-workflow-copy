import type { ContextStore } from "./types";

export const selectCurrentPlatform = (s: ContextStore) => s.currentPlatform;
export const selectCurrentProject = (s: ContextStore) => s.currentProject;
export const selectPlatforms = (s: ContextStore) => s.platforms;
export const selectProjectDetailsById = (s: ContextStore) =>
  s.projectDetailsById;
