import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
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
  MessageSquare,
  Mail,
  BadgeCheck,
  Sparkles,
  Square,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const categories = [
  "All",
  "Lead management",
  "Sales pipeline",
  "Marketing campaigns",
  "Customer support",
  "Reporting & analytics",
  "Project management",
];

export default function TemplatesModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const leadScrollRef = useRef<HTMLDivElement | null>(null);
  const [leadHasScrolled, setLeadHasScrolled] = useState(false);
  const trendingScrollRef = useRef<HTMLDivElement | null>(null);
  const [trendingHasScrolled, setTrendingHasScrolled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const el = leadScrollRef.current;
    if (!el) return;
    const onScroll = () => setLeadHasScrolled(el.scrollLeft > 8);
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  useEffect(() => {
    const el = trendingScrollRef.current;
    if (!el) return;
    const onScroll = () => setTrendingHasScrolled(el.scrollLeft > 8);
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative h-full w-full p-6 sm:p-10 lg:p-16">
        <div
          ref={contentRef}
          className="grid h-full w-full grid-cols-1 md:grid-cols-[280px_1fr] rounded-2xl bg-theme-background border border-[#e5e7eb] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <aside className="h-full overflow-y-auto p-4 sm:p-6 border-r border-[#e5e7eb]">
            <h2 className="text-xl font-bold text-[#222222]">Templates</h2>
            <div className="mt-4 relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-theme-tertiary">
                <SearchIcon size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps or roles..."
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 pl-9 text-sm text-theme-primary placeholder:text-theme-tertiary outline-none focus:ring-2 focus:ring-theme-primary/20"
              />
            </div>
            <nav className="mt-4 space-y-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    active === c
                      ? "bg-[#e5e7eb] text-theme-primary"
                      : "text-theme-primary hover:bg-[#f5f5f5]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <section className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-theme-secondary">Filter by apps</h3>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-theme-secondary hover:bg-theme-input hover:text-theme-primary transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
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
            {/* Placeholder area for template cards (future) */}
            {/* Lead management templates */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-theme-secondary">Lead management templates</h4>
                <button className="text-xs font-semibold text-theme-secondary hover:text-theme-primary transition-colors">View all</button>
              </div>
              <div className="relative mt-3">
                <div ref={leadScrollRef} className="overflow-x-auto overflow-y-hidden no-scrollbar">
                  <div className="flex gap-5 pr-10 min-w-max">
                  {/* Card A */}
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

                  {/* Card B */}
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

                  {/* Card C */}
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
                {/* Floating arrows */}
                <button
                  type="button"
                  aria-label="Scroll right"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2"
                  onClick={() => leadScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Scroll left"
                  className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2 transition-opacity ${leadHasScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  onClick={() => leadScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
                >
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
                    {/* Card 1 */}
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

                    {/* Card 2 */}
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

                    {/* Card 3 */}
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
                <button
                  type="button"
                  aria-label="Scroll right"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2"
                  onClick={() => trendingScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Scroll left"
                  className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white border border-[#e5e7eb] shadow hover:shadow-md p-2 transition-opacity ${trendingHasScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  onClick={() => trendingScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


