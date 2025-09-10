import { useEffect, useState } from "react";
import { fetchQuickStats, fetchRecentActivity } from "../services/homeService";
import type { ActivityItem, QuickStats } from "../types/home.types";

export function useHomeData() {
  const [stats, setStats] = useState<QuickStats>({
    activeFlows: 0,
    executions: 0,
    connections: 0,
    teamMembers: 1,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, a] = await Promise.all([
        fetchQuickStats(),
        fetchRecentActivity(),
      ]);
      if (!cancelled) {
        setStats(s);
        setActivity(a);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, activity };
}
