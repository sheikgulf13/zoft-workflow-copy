import { Database, Zap } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form backdrop-blur-md p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-theme-primary mb-4">
        Get Started
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-white/10 bg-theme-accent hover:bg-theme-input-focus transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="rounded-xl bg-[#b3a1ff]/20 p-2">
            <Zap className="h-5 w-5 text-[#b3a1ff]" />
          </div>
          <div>
            <p className="font-medium text-[#222]">Create Your First Flow</p>
            <p className="text-sm text-[#222222]">
              Build an automation workflow from scratch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-white/10 bg-theme-primary hover:bg-theme-input-focus transition-all duration-200 cursor-pointer hover:scale-[1.02]">
          <div className="rounded-xl bg-[#a4f5a6]/20 p-2">
            <Database className="h-5 w-5 text-[#a4f5a6]" />
          </div>
          <div>
            <p className="font-medium text-theme-primary">Connect Your Apps</p>
            <p className="text-sm text-theme-secondary">
              Set up integrations with your favorite tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
