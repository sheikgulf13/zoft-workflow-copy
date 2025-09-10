import { BarChart3, Zap, Users, Database } from "lucide-react";
import type { QuickStats } from "../../types/home.types";

type Props = { stats: QuickStats };

export default function QuickStatsSection({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 p-8">
      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-accent backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#b3a1ff]/20 p-2">
            <Zap className="h-6 w-6 text-[#b3a1ff]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#222222]">Active Flows</p>
            <p className="text-2xl font-bold text-[#222222]">
              {stats.activeFlows}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#a4f5a6]/20 p-2">
            <BarChart3 className="h-6 w-6 text-[#a4f5a6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-secondary">
              Executions
            </p>
            <p className="text-2xl font-bold text-theme-primary">
              {stats.executions}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-primary backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#8dff8d]/20 p-2">
            <Database className="h-6 w-6 text-[#8dff8d]" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-primary">
              Connections
            </p>
            <p className="text-2xl font-bold text-theme-secondary">
              {stats.connections}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#ef4a45]/20 p-2">
            <Users className="h-6 w-6 text-[#ef4a45]" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-secondary">
              Team Members
            </p>
            <p className="text-2xl font-bold text-theme-primary">
              {stats.teamMembers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
