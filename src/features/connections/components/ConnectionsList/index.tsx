import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, Search, ChevronDown, Check, Minus } from "lucide-react";
import type { Connection } from "../../types/connection.types";

type Props = {
  connections: Connection[];
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
};

type ScopeFilter = "all" | "platform" | "project";

function getScope(connection: Connection): "platform" | "project" {
  return Array.isArray(connection.projectIds) && connection.projectIds.length > 0
    ? "project"
    : "platform";
}

function getStatusClasses(status: string): string {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "ONLINE", "ENABLED", "CONNECTED"].includes(s)) {
    return "bg-[#3BA228]/10 text-[#3BA228] border border-[#3BA228]/30";
  }
  if (["PENDING", "IN_PROGRESS", "PROCESSING"].includes(s)) {
    return "bg-[#f5d49a]/20 text-[#f5d49a] border border-[#f5d49a]/30";
  }
  return "bg-[#C43201]/10 text-[#C43201] border border-[#C43201]/30";
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

type Option = { label: string; value: string | number };

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
      {indeterminate ? (
        <Minus className="h-[0.7vw] w-[0.7vw]" strokeWidth={3} />
      ) : checked ? (
        <Check className="h-[0.7vw] w-[0.7vw]" strokeWidth={3} />
      ) : null}
    </button>
  );
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

export default function ConnectionsList({ connections, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [pieceFilter, setPieceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pieceOptions = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => {
      const label = c.metadata?.pieceDisplayName || c.pieceName;
      if (label) set.add(label);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [connections]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => c.status && set.add(c.status));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [connections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byQuery = (c: Connection) => {
      if (!q) return true;
      const hay = [
        c.displayName,
        c.pieceName,
        c.externalId,
        c.metadata?.pieceDisplayName,
        c.owner?.userIdentity?.email,
      ]
        .filter(Boolean)
        .join(" \u0000 ")
        .toLowerCase();
      return hay.includes(q);
    };
    const byStatus = (c: Connection) =>
      statusFilter === "all" || String(c.status || "").toLowerCase() === statusFilter.toLowerCase();
    const byScope = (c: Connection) => scopeFilter === "all" || getScope(c) === scopeFilter;
    const byPiece = (c: Connection) =>
      pieceFilter === "all" || (c.metadata?.pieceDisplayName || c.pieceName) === pieceFilter;

    const sorted = [...connections].sort((a, b) => {
      const ad = new Date(a.created).getTime();
      const bd = new Date(b.created).getTime();
      return isNaN(bd - ad) ? 0 : bd - ad; // newest first
    });
    return sorted.filter((c) => byQuery(c) && byStatus(c) && byScope(c) && byPiece(c));
  }, [connections, search, statusFilter, scopeFilter, pieceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = (pageSafe - 1) * pageSize;
  const currentPageItems = filtered.slice(start, start + pageSize);

  const allOnPageSelected =
    currentPageItems.length > 0 && currentPageItems.every((c) => selected[c.id]);
  const someOnPageSelected =
    currentPageItems.some((c) => selected[c.id]) && !allOnPageSelected;

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
    <div className="h-full flex flex-col space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-[1vw] sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex flex-wrap items-center gap-[0.6vw]">
          {/* Status filter - custom */}
          <ThemedSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(String(v));
              setPage(1);
            }}
            options={[{ label: "All Status", value: "all" }, ...statusOptions.map((s) => ({ label: s, value: s }))]}
            widthClass="w-[12vw]"
          />

          {/* Scope filter - custom */}
          <ThemedSelect
            value={scopeFilter}
            onChange={(v) => {
              setScopeFilter(String(v) as ScopeFilter);
              setPage(1);
            }}
            options={[
              { label: "All Scope", value: "all" },
              { label: "Platform", value: "platform" },
              { label: "Project", value: "project" },
            ]}
            widthClass="w-[10vw]"
          />

          {/* Piece filter - custom */}
          <ThemedSelect
            value={pieceFilter}
            onChange={(v) => {
              setPieceFilter(String(v));
              setPage(1);
            }}
            options={[{ label: "All Services", value: "all" }, ...pieceOptions.map((p) => ({ label: p, value: p }))]}
            widthClass="w-[14vw]"
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
              placeholder="Search..."
              className="w-full rounded-[1vw] border border-white/20 dark:border-white/10 bg-theme-input px-[0.9vw] py-[0.6vw] pl-[2.2vw] text-[0.9vw] text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-[0.3vw] focus:ring-[#b3a1ff]/20"
            />
          </div>
          {/*}<button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-[0.5vw] rounded-[1vw] border border-white/20 dark:border-white/10 bg-theme-input px-[0.9vw] py-[0.6vw] text-[0.9vw] font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input-focus"
            title="Export CSV"
            type="button"
          >
            <Download className="h-[1vw] w-[1vw]" />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-[0.5vw] rounded-[1vw] border border-white/20 dark:border-white/10 bg-theme-input px-[0.9vw] py-[0.6vw] text-[0.9vw] font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input-focus"
            title="Export JSON"
            type="button"
          >
            <Download className="h-[1vw] w-[1vw]" />
            JSON
          </button>*/}
              </div>
            </div>

      {/* Table */}
      <div className="flex-1 min-h-0 rounded-2xl bg-[#ebebeb] rouded-[1vw] overflow-hidden backdrop-blur-md flex flex-col">
        <div className="overflow-x-auto flex-1 min-h-0">
          <div className="h-full overflow-y-auto pr-[0.3vw] [&::-webkit-scrollbar]:w-[0.4vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
            <table className="w-full text-[0.9vw] leading-[1.2vw] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#e3e3e5] text-[#222]">
                <tr>
                  <th className="px-[1vw] py-[0.8vw] text-left">
                    <ThemedCheckbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onChange={() => toggleSelectAll()}
                      ariaLabel="Select all on page"
                    />
                  </th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Name</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Service</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Type</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Scope</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Owner</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Created</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Updated</th>
                  <th className="px-[1vw] py-[0.8vw] text-left uppercase tracking-[0.08vw] text-[0.7vw]">Status</th>
                  <th className="px-[1vw] py-[0.8vw] text-right uppercase tracking-[0.08vw] text-[0.7vw]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
              {currentPageItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-[1vw] py-[2vw] text-center text-theme-secondary text-[0.9vw]">
                    No connections match your filters
                  </td>
                </tr>
              ) : (
                currentPageItems.map((c) => (
                  <tr key={c.id} className="hover:bg-theme-input/30">
                    <td className="px-[1vw] py-[0.9vw] align-middle">
                      <ThemedCheckbox
                        checked={Boolean(selected[c.id])}
                        onChange={(v) => setSelected((prev) => ({ ...prev, [c.id]: v }))}
                        ariaLabel={`Select ${c.displayName}`}
                      />
                    </td>
                    <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary font-medium text-[0.9vw]">
                      {c.displayName}
                    </td>
                    <td className="px-[1vw] py-[0.9vw] align-middle">
                      <div className="flex items-center gap-[0.5vw]">
                        {c.metadata?.pieceLogoUrl ? (
                          <img
                            src={c.metadata.pieceLogoUrl}
                            alt={c.metadata?.pieceDisplayName || c.pieceName}
                            className="h-[1.2vw] w-[1.2vw] rounded-[0.4vw] object-cover"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.src = "https://via.placeholder.com/24x24?text=?";
                            }}
                          />
                        ) : null}
                        <span className="text-theme-primary text-[0.9vw]">
                          {c.metadata?.pieceDisplayName || c.pieceName}
                        </span>
                      </div>
                    </td>
                    <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">{c.type || "-"}</td>
                    <td className="px-[1vw] py-[0.9vw] align-middle capitalize text-theme-primary">{getScope(c)}</td>
                    <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">
                      {c.owner?.userIdentity?.email || "-"}
                    </td>
                    <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">{formatDate(c.created)}</td>
                    <td className="px-[1vw] py-[0.9vw] align-middle text-theme-primary">{formatDate(c.updated)}</td>
                    <td className="px-[1vw] py-[0.9vw] align-middle">
                      <span className={`inline-flex items-center rounded-full px-[0.6vw] py-[0.25vw] text-[0.7vw] font-medium ${getStatusClasses(c.status)}`}>
                        {c.status || "-"}
              </span>
                    </td>
                    <td className="px-[1vw] py-[0.9vw] align-middle">
                      <div className="flex items-center justify-end gap-[0.5vw]">
              <button
                          onClick={() => onEdit(c)}
                          className="p-[0.5vw] text-theme-tertiary hover:text-theme-primary hover:bg-theme-input-focus rounded-[0.8vw] transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-theme-primary/20"
                title="Edit connection"
              >
                          <Pencil className="h-[1vw] w-[1vw]" />
              </button>
              <button
                          onClick={() => onDelete(c.id)}
                          className="p-[0.5vw] text-theme-tertiary hover:text-[#C43201] hover:bg-[#C43201]/10 rounded-[0.8vw] transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-[#C43201]/20"
                title="Delete connection"
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

        {/* Footer: pagination (fixed at bottom, outside scroll via fixed-height container) */}
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
                  setPageSize(Number(v));
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
