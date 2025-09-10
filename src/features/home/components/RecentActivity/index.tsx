import type { ActivityItem } from "../../types/home.types";

type Props = { activity: ActivityItem[] };

export default function RecentActivity({ activity }: Props) {
  return (
    <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-red-light backdrop-blur-md p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-theme-primary mb-4">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {activity.length === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-form">
            <div className="w-2 h-2 bg-theme-tertiary rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-theme-secondary">No recent activity</p>
              <p className="text-xs text-theme-tertiary">
                Start building workflows to see activity here
              </p>
            </div>
          </div>
        ) : (
          activity.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-theme-form"
            >
              <div className="w-2 h-2 bg-theme-tertiary rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-theme-secondary">{item.title}</p>
                <p className="text-xs text-theme-tertiary">
                  {item.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
