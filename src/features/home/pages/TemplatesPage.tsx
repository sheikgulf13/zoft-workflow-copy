import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  Slack,
  FileText,
  Type,
  FileSpreadsheet,
  LifeBuoy,
  Calendar,
  Database,
  Globe,
  CreditCard,
  Megaphone,
  Figma,
  Bug,
  Bell,
  Sparkles,
  Square,
  MessageSquare,
  Mail,
  BadgeCheck,
  ChevronRight,
  ChevronLeft,
  UserRound,
} from "lucide-react";

export default function TemplatesPage() {
  const [query, setQuery] = useState("");
  const appFilters = useMemo(
    () => [
      { icon: Slack, label: "Slack" },
      { icon: FileText, label: "Notion" },
      { icon: Megaphone, label: "Mailchimp" },
      { icon: Type, label: "Typeform" },
      { icon: FileSpreadsheet, label: "Excel" },
      { icon: LifeBuoy, label: "HelpScout" },
      { icon: Calendar, label: "Cal.com" },
      { icon: Database, label: "Dovetail" },
      { icon: Globe, label: "Flipboard" },
      { icon: Globe, label: "Webflow" },
      { icon: CreditCard, label: "Stripe" },
      { icon: Megaphone, label: "Google Ads" },
      { icon: Figma, label: "Framer" },
      { icon: Bug, label: "Jira" },
      { icon: Bell, label: "Discord" },
    ],
    []
  );

  const leadScrollRef = useRef<HTMLDivElement | null>(null);
  const [leadHasScrolled, setLeadHasScrolled] = useState(false);
  const trendingScrollRef = useRef<HTMLDivElement | null>(null);
  const [trendingHasScrolled, setTrendingHasScrolled] = useState(false);

  useEffect(() => {
    const el = leadScrollRef.current;
    if (!el) return;
    const onScroll = () => setLeadHasScrolled(el.scrollLeft > 8);
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = trendingScrollRef.current;
    if (!el) return;
    const onScroll = () => setTrendingHasScrolled(el.scrollLeft > 8);
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className=" px-4">
      {/* Top bar (fixed, full-width border end-to-end) */}
      <div className="sticky top-0 w-full z-20 bg-theme-background border-b border-[#e5e7eb] bg-[#ebebeb]">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-[#222222]">Templates</h1>
          <div className="flex items-center gap-2">
            <button className="rounded-xl p-2 text-theme-secondary hover:bg-theme-input hover:text-theme-primary transition-colors" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="rounded-full w-8 h-8 flex items-center justify-center bg-white border border-[#e5e7eb] shadow-sm" aria-label="Profile">
              <UserRound size={18} className="text-theme-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Context container below the top bar */}
      <div className="w-full !px-10 sm:px-6 pt-8 pb-8 my-16  rounded-xl" style={{ backgroundColor: "#ebebeb" }}>
        <div className="flex justify-between items-center gap-4">
          {/* Left: title + description + search */}
          <div className="max-w-[50%]">
            <h2 className="text-base sm:text-lg font-bold text-[#222222]">Start with a Workflow Template</h2>
            <p className="mt-2 text-sm text-theme-secondary leading-relaxed">
              Pick a ready-made workflow to get started fast. Connect your favorite apps, customize the steps, and launch in minutes.
            </p>
            <div className="mt-4 relative max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-theme-tertiary">
                <SearchIcon size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps, roles, or use cases..."
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 pl-9 text-sm text-theme-primary placeholder:text-theme-tertiary outline-none focus:ring-2 focus:ring-theme-primary/20"
              />
            </div>
          </div>

          {/* Right: three stacked cards */}
          <div className="space-y-3 w-[25%]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-2 shadow-sm min-w-full max-w-full">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#e5e7eb]" />
                  <div className="flex-1">
                    <div className="h-3 w-2/3 bg-[#e5e7eb] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
      {/* Filter by apps only (no left sidebar) */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-theme-secondary">Filter by apps</h3>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {appFilters.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white text-theme-primary px-3 py-2 text-xs shadow-sm hover:shadow transition-all duration-200"
            >
              <Icon size={14} />
              <span className="truncate">{label}</span>
            </button>
          ))}
          <button className="text-xs font-semibold text-theme-secondary hover:text-theme-primary transition-colors">
            Load more
          </button>
        </div>
      </div>

      {/* Main content */}
      <section className="mt-6">
          {/* Lead management templates */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-theme-secondary">Lead management templates</h4>
              <button className="text-xs font-semibold text-theme-secondary hover:text-theme-primary transition-colors">View all</button>
            </div>
            <div className="relative mt-3">
              <div ref={leadScrollRef} className="overflow-x-auto overflow-y-hidden no-scrollbar">
                <div className="flex gap-5 pr-10 min-w-max">
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Globe size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><FileText size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><MessageSquare size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Website Lead Capture to CRM</div>
                    <div className="text-[12px] text-theme-secondary">Sync Flow</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#d1fae5]" />
                      <span>Ahmad M</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Megaphone size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><FileSpreadsheet size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><MessageSquare size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Automated Lead Scoring and Assignment</div>
                    <div className="text-[12px] text-theme-secondary">—</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#fde68a]" />
                      <span>David K</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><FileText size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Mail size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Qualified Lead Follow-Up Tracker</div>
                    <div className="text-[12px] text-theme-secondary">—</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#bfdbfe]" />
                      <span>Khalid A</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" aria-label="Scroll right" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2" onClick={() => leadScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}>
                <ChevronRight size={18} />
              </button>
              <button type="button" aria-label="Scroll left" className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2 transition-opacity ${leadHasScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => leadScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })}>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>

          {/* Trending AI templates */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-theme-secondary">Trending AI templates</h4>
              <button className="text-xs font-semibold text-theme-secondary hover:text-theme-primary transition-colors">View all</button>
            </div>
            <div className="relative mt-3">
              <div ref={trendingScrollRef} className="overflow-x-auto overflow-y-hidden no-scrollbar">
                <div className="flex gap-5 pr-10 min-w-max">
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Sparkles size={16} /></div>
                      <span className="h-7 px-1.5 rounded-md bg-white border border-black/10 text-[10px] font-semibold flex items-center justify-center shadow-sm">+1</span>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><MessageSquare size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Generating Weekly Marketing Performance Reports</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#fde68a]" />
                      <span>Jakob H</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Sparkles size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><FileSpreadsheet size={16} /></div>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Square size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Summarizing and Tagging Customer Support Tickets</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#bfdbfe]" />
                      <span>Alex W</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white min-w-[360px] sm:min-w-[420px] p-5 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Sparkles size={16} /></div>
                      <span className="h-7 px-1.5 rounded-md bg-white border border-black/10 text-[10px] font-semibold flex items-center justify-center shadow-sm">+2</span>
                      <div className="h-7 w-7 rounded-md bg-white border border-black/10 flex items-center justify-center shadow-sm"><Mail size={16} /></div>
                    </div>
                    <div className="text-base font-semibold text-theme-primary leading-snug">Auto-Categorize Incoming Leads</div>
                    <div className="flex items-center gap-2 mt-3 text-[12px] text-theme-secondary">
                      <div className="h-5 w-5 rounded-full bg-[#fecaca]" />
                      <span>Daniel S</span>
                      <BadgeCheck size={14} className="text-[#3b82f6]" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" aria-label="Scroll right" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2" onClick={() => trendingScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}>
                <ChevronRight size={18} />
              </button>
              <button type="button" aria-label="Scroll left" className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2 transition-opacity ${trendingHasScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => trendingScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })}>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


