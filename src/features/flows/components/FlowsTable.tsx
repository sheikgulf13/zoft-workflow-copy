import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import type { FlowSummary } from "../types/flow.types";

type Props = {
  flows: FlowSummary[];
  onOpen: (f: FlowSummary) => void;
  onDelete: (id: string) => void;
};

type Option = { label: string; value: string | number };
type SortBy = "created_desc" | "created_asc" | "name_asc" | "name_desc";
type DateRange = "all" | "7" | "30" | "90" | "365";

function getStatusClasses(status?: string): string {
  const s = String(status || "").toUpperCase();
  if (["ENABLED", "ACTIVE", "ONLINE", "CONNECTED"].includes(s)) {
    return "bg-[#3BA228]/10 text-[#3BA228] border border-[#3BA228]/30";
  }
  if (["PENDING", "IN_PROGRESS", "PROCESSING"].includes(s)) {
    return "bg-[#f5d49a]/20 text-[#f5d49a] border border-[#f5d49a]/30";
  }
  return "bg-[#C43201]/10 text-[#C43201] border border-[#C43201]/30";
}

function ThemedSelect({
  value,
  onChange,
  options,
  className,
  placeholder,
  widthClass = "w-[12vw]",
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  options: Option[];
  className?: string;
  placeholder?: string;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const label = useMemo(() => {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : placeholder || "Select";
  }, [options, value, placeholder]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(spaceBelow < 220 && spaceAbove > spaceBelow);
      }
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className={`relative ${widthClass} ${className || ""}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full inline-flex items-center justify-between px-[0.9vw] py-[0.6vw] bg-theme-input border border-white/20 dark:border-white/10 rounded-[1vw] text-[0.9vw] text-theme-primary hover:bg-theme-input-focus focus:outline-none focus:ring-[0.15vw] focus:ring-theme-primary/20"
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className="text-theme-secondary ml-[0.5vw] h-[1vw] w-[1vw]" />
      </button>
      {open && (
        <div
          className={`absolute z-50 ${
            openUp ? "bottom-full mb-[0.5vw]" : "top-full mt-[0.5vw]"
          } left-0 right-0 overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1vw] shadow-xl`}
        >
          <div className="py-[0.3vw] max-h-[20vw] overflow-y-auto pr-[0.3vw] [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
            {options.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full px-[0.9vw] py-[0.6vw] text-left text-[0.9vw] transition-colors ${
                  value === o.value
                    ? "bg-[#b3a1ff] text-[#222222]"
                    : "text-theme-primary hover:bg-theme-input-focus"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemedCheckbox({
  checked,
  onChange,
  ariaLabel,
  indeterminate,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  indeterminate?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[1vw] w-[1vw] items-center justify-center rounded-[0.3vw] transition-colors duration-150 focus:outline-none focus:ring-[0.15vw] focus:ring-[#b3a1ff]/40 ${
        checked || indeterminate
          ? "bg-[#b3a1ff] text-[#222222] border border-[#b3a1ff]"
          : "bg-theme-input border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus"
      }`}
    >
      {/* Using box-drawing via CSS is fine; icons could be added if desired */}
    </button>
  );
}

export default function FlowsTable({ flows, onOpen, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const statusOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    flows.forEach((f) => f.status && set.add(f.status));
    return [{ label: "All Status", value: "all" }, ...Array.from(set).sort().map((s) => ({ label: s, value: s }))];
  }, [flows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const msRange = dateRange === "all" ? null : Number(dateRange) * 24 * 60 * 60 * 1000;
    let items = flows.filter((f) => {
      const hay = [f.name, f.description, f.status].filter(Boolean).join(" \u0000 ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (statusFilter !== "all" && String(f.status || "") !== statusFilter) return false;
      if (msRange) {
        const created = new Date(f.createdAt).getTime();
        if (isNaN(created) || now - created > msRange) return false;
      }
      return true;
    });
    items = items.sort((a, b) => {
      switch (sortBy) {
        case "created_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "created_desc":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return items;
  }, [flows, search, statusFilter, dateRange, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = (pageSafe - 1) * pageSize;
  const currentPageItems = filtered.slice(start, start + pageSize);

  const allOnPageSelected = currentPageItems.length > 0 && currentPageItems.every((f) => selected[f.id]);
  const someOnPageSelected = currentPageItems.some((f) => selected[f.id]) && !allOnPageSelected;

  const toggleSelectAll = () => {
    const updated: Record<string, boolean> = { ...selected };
    if (allOnPageSelected) {
      currentPageItems.forEach((c) => delete updated[c.id]);
    } else {
      currentPageItems.forEach((c) => (updated[c.id] = true));
    }
    setSelected(updated);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col space-y-[1vw]">
      {/* Controls */}
      <div className="flex flex-col gap-[1vw] sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex flex-wrap items-center gap-[0.6vw]">
          <ThemedSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(String(v));
              setPage(1);
            }}
            options={statusOptions}
            widthClass="w-[12vw]"
          />
          <ThemedSelect
            value={dateRange}
            onChange={(v) => {
              setDateRange(String(v) as DateRange);
              setPage(1);
            }}
            options={[
              { label: "All time", value: "all" },
              { label: "Last 7 days", value: "7" },
              { label: "Last 30 days", value: "30" },
              { label: "Last 90 days", value: "90" },
              { label: "Last year", value: "365" },
            ]}
            widthClass="w-[12vw]"
          />
          <ThemedSelect
            value={sortBy}
            onChange={(v) => setSortBy(String(v) as SortBy)}
            options={[
              { label: "Newest first", value: "created_desc" },
              { label: "Oldest first", value: "created_asc" },
              { label: "Name A→Z", value: "name_asc" },
              { label: "Name Z→A", value: "name_desc" },
            ]}
            widthClass="w-[12vw]"
          />
        </div>
        <div className="flex items-center gap-[0.6vw]">
          <div className="relative w-[18vw]">
            <Search className="absolute left-[0.7vw] top-1/2 h-[0.9vw] w-[0.9vw] -translate-y-1/2 text-theme-secondary" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search flows..."
              className="w-full rounded-[1vw] border border-white/20 dark:border-white/10 bg-theme-input px-[0.9vw] py-[0.6vw] pl-[2.2vw] text-[0.9vw] text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-[0.3vw] focus:ring-[#b3a1ff]/20"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 rounded-[1vw] bg-[#ebebeb] overflow-hidden backdrop-blur-md flex flex-col">
        <div className="overflow-x-auto flex-1 min-h-0">
          <div className="h-full overflow-y-auto pr-[0.3vw] [&::-webkit-scrollbar]:w-[0.4vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
            <table className="w-full text-[0.9vw] leading-[1.2vw] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#e3e3e5] text-[#222]">
                <tr>
                  <th className="px-[1vw] py-[0.8vw] text-left">
                    <ThemedCheckbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={toggleSelectAll}
                      ariaLabel="Select all on page"
                    />
                  </th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Name</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Description</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Created</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Status</th>
                  <th className="px-[1vw] py-[0.8vw] text-right uppercase tracking-[0.08vw] text-[0.7vw]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-[1vw] py-[2vw] text-center text-theme-secondary text-[0.9vw]">
                      No flows found
                    </td>
                  </tr>
                ) : (
                  currentPageItems.map((f) => (
                    <tr key={f.id} className="hover:bg-theme-input/30">
                      <td className="px-[1vw] py-[0.9vw] align-middle">
                        <ThemedCheckbox
                          checked={Boolean(selected[f.id])}
                          onChange={(v) => setSelected((prev) => ({ ...prev, [f.id]: v }))}
                          ariaLabel={`Select ${f.name}`}
                        />
                      </td>
                      <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary font-medium text-[0.9vw] cursor-pointer" onClick={() => onOpen(f)}>
                        {f.name}
                      </td>
                      <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">
                        {f.description || "-"}
                      </td>
                      <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-[1vw] py-[0.9vw] align-middle">
                        {f.status ? (
                          <span className={`inline-flex items-center rounded-full px-[0.6vw] py-[0.25vw] text-[0.7vw] font-medium ${getStatusClasses(f.status)}`}>
                            {f.status}
                          </span>
                        ) : (
                          <span className="text-theme-tertiary">-</span>
                        )}
                      </td>
                      <td className="px-[1vw] py-[0.9vw] align-middle">
                        <div className="flex items-center justify-end gap-[0.5vw]">
                          <button
                            onClick={() => onOpen(f)}
                            className="p-[0.5vw] text-theme-tertiary hover:text-theme-primary hover:bg-theme-input-focus rounded-[0.8vw] transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-theme-primary/20"
                            title="Open flow"
                          >
                            <Pencil className="h-[1vw] w-[1vw]" />
                          </button>
                          <button
                            onClick={() => onDelete(f.id)}
                            className="p-[0.5vw] text-theme-tertiary hover:text-[#C43201] hover:bg-[#C43201]/10 rounded-[0.8vw] transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-[#C43201]/20"
                            title="Delete flow"
                          >
                            <Trash2 className="h-[1vw] w-[1vw]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: pagination */}
        <div className="px-[1vw] py-[0.6vw] border-t-[0.15vw] border-black dark:border-white/10 bg-theme-form/95 backdrop-blur-md">
          <div className="flex flex-col gap-[0.8vw] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[0.85vw] text-theme-secondary">
              {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
              Showing {start + 1}-{Math.min(start + pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-[0.6vw]">
              <ThemedSelect
                value={pageSize}
                onChange={(v) => {
                  const n = Number(v);
                  setPageSize(n);
                  setPage(1);
                }}
                options={[10, 20, 50].map((n) => ({ label: `${n} / page`, value: n }))}
                widthClass="w-[8vw]"
              />
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[0.8vw] px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-primary border border-white/20 dark:border-white/10 hover:bg-theme-input-focus disabled:opacity-50"
                disabled={pageSafe === 1}
              >
                Previous
              </button>
              <div className="hidden md:flex items-center gap-[0.3vw]">
                {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                  const i = idx + 1;
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`h-[2vw] w-[2vw] rounded-[0.6vw] text-[0.9vw] ${
                        i === pageSafe
                          ? "bg-theme-primary text-theme-inverse"
                          : "border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
                {totalPages > 7 ? (
                  <span className="px-[0.3vw] text-theme-secondary">…</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-[0.8vw] px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-primary border border-white/20 dark:border-white/10 hover:bg-theme-input-focus disabled:opacity-50"
                disabled={pageSafe === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


