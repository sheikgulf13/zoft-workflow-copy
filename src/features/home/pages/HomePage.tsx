import Hero from "../components/Hero";
import QuickStatsSection from "../components/QuickStats";
import QuickActions from "../components/QuickActions";
import RecentActivity from "../components/RecentActivity";
import PlatformInfo from "../components/PlatformInfo";
import { useHomeData } from "../hooks/useHomeData";

export default function HomePage() {
  const { stats, activity } = useHomeData();
  return (
    <div className="space-y-6">
      <Hero />
      <QuickStatsSection stats={stats} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 p-8">
        <QuickActions />
        <RecentActivity activity={activity} />
      </div>
      <PlatformInfo />
    </div>
  );
}
