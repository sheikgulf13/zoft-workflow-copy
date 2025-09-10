import type { ActivityItem, QuickStats } from "../types/home.types";

export async function fetchQuickStats(): Promise<QuickStats> {
  // Placeholder for future API call
  return { activeFlows: 0, executions: 0, connections: 0, teamMembers: 1 };
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  // Placeholder for future API call
  return [];
}
