import type { Platform } from "./types";
import { http } from "../../../shared/api";

export async function fetchFullContext(): Promise<{
  currentPlatform?: { id: string; name: string; role?: string } | null;
  currentProject?: { id: string; name: string; description?: string } | null;
  availablePlatforms?: Platform[];
}> {
  const resp = await http.get("/context");
  return resp.data as {
    currentPlatform?: { id: string; name: string; role?: string } | null;
    currentProject?: { id: string; name: string; description?: string } | null;
    availablePlatforms?: Platform[];
  };
}

export async function fetchPlatformDetails(
  platformId: string
): Promise<{ platform: Platform }> {
  const resp = await http.get(`/platforms/${platformId}`);
  return resp.data as { platform: Platform };
}

export async function fetchProjectsForPlatform(
  platformId: string
): Promise<{
  projects: Array<{ id: string; name: string; description?: string }>;
}> {
  const resp = await http.get(`/platforms/${platformId}/projects`);
  return resp.data as {
    projects: Array<{ id: string; name: string; description?: string }>;
  };
}
