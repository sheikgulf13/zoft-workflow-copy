import { useContextStore } from "../../stores/contextStore";
import { BarChart3, Zap, Users, Database, Send } from "lucide-react";
import { SmudgyBackground } from "../../components/ui";

export default function HomePage() {
  const currentPlatform = useContextStore((state) => state.currentPlatform);

  return (
    <div className="space-y-6">
      {/* AI Assistant Section */}
      <div className="h-[90vh] flex flex-col items-center justify-center relative overflow-hidden">
        {/* SmudgyBackground */}
        <SmudgyBackground
          colorHex={"#b3a1ff"}
          baseOpacity={0.15}
          zIndex={0}
        />
        
        {/* Content */}
        <div className="relative z-10 text-center mb-12">
          <h2 className="text-4xl font-bold text-theme-primary mb-4">
            How can I help you?
          </h2>
          <p className="text-lg text-theme-secondary max-w-2xl mx-auto leading-relaxed">
            Describe what you want to automate and I'll help you build it with our powerful workflow engine
          </p>
        </div>
        
        <div className="relative z-10 w-full max-w-4xl">
          <div className="relative">
            <textarea
              placeholder="e.g., I want to automatically save new Gmail emails to a Google Sheets spreadsheet..."
              className="w-full h-36 px-6 py-4 pr-16 bg-theme-background backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl resize-none focus:ring-2 focus:ring-theme-primary/20 focus:bg-theme-input-focus text-theme-primary placeholder:text-theme-inverse shadow-xl transition-all duration-300"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-theme-primary hover:bg-[#a08fff] text-theme-inverse rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 p-8">
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-accent backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#b3a1ff]/20 p-2">
              <Zap className="h-6 w-6 text-[#b3a1ff]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#222222]">Active Flows</p>
              <p className="text-2xl font-bold text-[#222222]">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#a4f5a6]/20 p-2">
              <BarChart3 className="h-6 w-6 text-[#a4f5a6]" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-secondary">Executions</p>
              <p className="text-2xl font-bold text-theme-primary">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-primary backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#8dff8d]/20 p-2">
              <Database className="h-6 w-6 text-[#8dff8d]" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary">Connections</p>
              <p className="text-2xl font-bold text-theme-secondary">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#ef4a45]/20 p-2">
              <Users className="h-6 w-6 text-[#ef4a45]" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-secondary">Team Members</p>
              <p className="text-2xl font-bold text-theme-primary">1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 p-8">
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form backdrop-blur-md p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Get Started</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-white/10 bg-theme-accent hover:bg-theme-input-focus transition-all duration-200 cursor-pointer hover:scale-[1.02]">
              <div className="rounded-xl bg-[#b3a1ff]/20 p-2">
                <Zap className="h-5 w-5 text-[#b3a1ff]" />
              </div>
              <div>
                <p className="font-medium text-[#222]">Create Your First Flow</p>
                <p className="text-sm text-[#222222]">Build an automation workflow from scratch</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/20 dark:border-white/10 bg-theme-primary hover:bg-theme-input-focus transition-all duration-200 cursor-pointer hover:scale-[1.02]">
              <div className="rounded-xl bg-[#a4f5a6]/20 p-2">
                <Database className="h-5 w-5 text-[#a4f5a6]" />
              </div>
              <div>
                <p className="font-medium text-theme-primary">Connect Your Apps</p>
                <p className="text-sm text-theme-secondary">Set up integrations with your favorite tools</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-red-light backdrop-blur-md p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-form">
              <div className="w-2 h-2 bg-theme-tertiary rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-theme-secondary">No recent activity</p>
                <p className="text-xs text-theme-tertiary">Start building workflows to see activity here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      {currentPlatform && (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-primary backdrop-blur-md p-6 m-8 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Platform Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-theme-secondary">Platform Name</p>
              <p className="text-theme-primary">{currentPlatform.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-theme-secondary">Your Role</p>
              <p className="text-theme-primary capitalize">{currentPlatform.role || 'Member'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
