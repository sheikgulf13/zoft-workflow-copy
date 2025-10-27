import {
  Bell,
  LayoutTemplate,
  AppWindow,
  Send,
  Globe,
  FileText,
  MessageSquare,
  LifeBuoy,
  FileSpreadsheet,
  Calendar,
  UserRound,
  
} from "lucide-react";
import { useAuthStore } from "../../../../app/store/auth";
import { useState } from "react";
import TemplatesModal from "../TemplatesModal";

export default function Hero() {
  const { user } = useAuthStore();
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const firstName = (user?.name || "User").split(" ")[0];
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-start relative py-20">
      {/* Header: date + greeting (left) and notification (right) */}
      <div className="w-full max-w-5xl flex items-start justify-between px-4 sm:px-6 lg:px-0 mt-8">
        <div>
          <div className="text-xs text-theme-secondary">{dateStr}</div>
          <div className="text-xl sm:text-2xl font-bold text-theme-primary mt-1">
            welcome back, {firstName}
          </div>
        </div>
        <button className="rounded-xl p-2 text-theme-secondary hover:bg-theme-input hover:text-theme-primary transition-colors" aria-label="Notifications">
          <Bell size={18} />
        </button>
      </div>

      {/* Input parent wrapper */}
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-0 mt-6">
        <div className="rounded-2xl" style={{ backgroundColor: "#ebebeb" }}>
          {/* Input */}
          <div className="p-3 sm:p-4">
            <textarea
              placeholder="Describe what you want to automate..."
              className="w-full h-32 sm:h-36 px-4 sm:px-6 py-3 bg-white border border-white/20 dark:border-white/10 rounded-2xl resize-none focus:ring-2 focus:ring-theme-primary/20 text-theme-primary placeholder:text-theme-secondary shadow-sm"
            />
          </div>
          {/* Footer row: templates/apps on left, Build/Send on right */}
          <div className="flex items-center justify-between px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="flex items-center gap-3 text-theme-secondary">
              <button type="button" className="flex items-center gap-2 text-xs sm:text-sm" onClick={() => setIsTemplatesOpen(true)}>
                <LayoutTemplate size={16} />
                <span>Templates</span>
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <AppWindow size={16} />
                <span>Apps</span>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-theme-primary px-4 py-2 text-sm font-semibold text-theme-inverse transition-all duration-200 hover:bg-[#a08fff]">
              <Send size={16} /> Build / Send
            </button>
          </div>
        </div>
      </div>

      {/* Pills below input */}
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-0 mt-4 flex flex-wrap items-center gap-2">
        {[
          "Create lead cards in Notion",
          "Notify Slack on new deals",
          "Auto-reply to new leads",
          "Create task from email",
        ].map((label) => (
          <button
            key={label}
            className="px-4 py-1.5 rounded-full text-xs sm:text-sm bg-white text-theme-primary border border-white/40 shadow-sm hover:shadow transition-all duration-200"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two big option cards */}
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-0 mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card: Start with a template */}
        <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white dark:bg-theme-form overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
          <div className="h-40 sm:h-44 bg-gradient-to-br from-[#ededed] to-[#f7f7f7] dark:from-transparent dark:to-transparent flex items-center justify-center">
            <div className="w-11/12 h-24 sm:h-28 rounded-xl bg-[#dbe7d5]" />
          </div>
          <div className="p-4">
            <div className="text-base sm:text-lg font-semibold text-theme-primary">Start with a template</div>
            <div className="text-xs sm:text-sm text-theme-secondary mt-1">Browse through 2500+ templates</div>
          </div>
        </div>

        {/* Card: Start from scratch */}
        <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white dark:bg-theme-form overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
          <div className="h-40 sm:h-44 bg-gradient-to-br from-[#f4f4f4] to-[#fafafa] dark:from-transparent dark:to-transparent flex items-center justify-center">
            <div className="w-11/12 h-24 sm:h-28 rounded-xl bg-[#e8e8e8]" />
          </div>
          <div className="p-4">
            <div className="text-base sm:text-lg font-semibold text-theme-primary">Start from scratch</div>
            <div className="text-xs sm:text-sm text-theme-secondary mt-1">Build your workflow your way</div>
          </div>
        </div>
      </div>

      {/* Recent workflows */}
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-0 mt-20">
        <h3 className="text-sm font-semibold text-theme-secondary mb-2">Recent workflows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1 */}
          <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white dark:bg-theme-form p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <Globe size={14} />
              </div>
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <FileText size={14} />
              </div>
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <MessageSquare size={14} />
              </div>
            </div>
            <div className="text-sm font-semibold text-theme-primary leading-snug mt-5">Website Lead Capture to CRM</div>
            <div className="text-[11px] text-theme-secondary">Sync Flow</div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white dark:bg-theme-form p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <LifeBuoy size={14} />
              </div>
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <FileSpreadsheet size={14} />
              </div>
            </div>
            <div className="text-sm font-semibold text-theme-primary leading-snug mt-5">Channeling Support Tickets into Microsoft Excel</div>
            <div className="text-[11px] text-theme-secondary">Microsoft Excel</div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-white/40 dark:border-white/10 bg-white dark:bg-theme-form p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <UserRound size={14} />
              </div>
              <span className="h-6 px-1.5 rounded-md bg-white border border-black/10 text-[10px] font-semibold flex items-center justify-center shadow-sm">+2</span>
              <div className="h-6 w-6 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm">
                <Calendar size={14} />
              </div>
            </div>
            <div className="text-sm font-semibold text-theme-primary leading-snug mt-5">Candidate Tracking and Interview</div>
            <div className="text-[11px] text-theme-secondary">Scheduling Flow</div>
          </div>
        </div>
      </div>
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />

      </div>
  );
}
