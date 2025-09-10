export interface QuickStats {
  activeFlows: number;
  executions: number;
  connections: number;
  teamMembers: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}
