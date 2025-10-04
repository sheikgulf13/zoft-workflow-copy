import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useContextStore } from "../../../app/store/context";
import { fetchPlatformInvitations, revokePlatformInvitation } from "../services/invitationsService";
import { toastError, toastSuccess } from "../../../components/ui/Toast";

type Invitation = {
  id: string;
  email: string;
  status: "PENDING" | "EXPIRED" | "ACCEPTED" | "REJECTED";
  role?: "ADMIN" | "MEMBER";
  projectIds?: string[];
  createdAt?: string;
  expiresAt?: string | null;
};

const FILTERS = [
  { label: "All", value: "ALL" as const },
  { label: "Pending", value: "PENDING" as const },
  { label: "Expired", value: "EXPIRED" as const },
  { label: "Accepted", value: "ACCEPTED" as const },
  { label: "Rejected", value: "REJECTED" as const },
];

export default function InvitationsPage() {
  const currentPlatform = useContextStore((s) => s.currentPlatform);
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "EXPIRED" | "ACCEPTED" | "REJECTED"
  >("PENDING");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Invitation[]>([]);
  const [revokingIds, setRevokingIds] = useState<string[]>([]);

  const platformId = currentPlatform?.id;

  useEffect(() => {
    if (!platformId) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const resp = await fetchPlatformInvitations(
          platformId,
          filter === "ALL" ? undefined : filter
        );
        if (!active) return;
        setData(resp);
      } catch (e) {
        if (!active) return;
        setError(
          e instanceof Error ? e.message : "Failed to load invitations"
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [platformId, filter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-dropdown]")) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const content = useMemo(() => {
    if (isLoading) {
      return <div className="text-sm text-theme-secondary">Loading…</div>;
    }
    if (error) {
      return (
        <div className="text-sm text-red-500">Error: {error}</div>
      );
    }
    if (!data.length) {
      return (
        <div className="text-sm text-theme-secondary">No invitations found</div>
      );
    }
    return (
      <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
        {data.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium text-theme-primary">
                {inv.email}
              </div>
              <div className="mt-1 text-xs text-theme-secondary">
                Role: {inv.role ?? "MEMBER"}
              </div>
              {filter === "ALL" && (
                <span
                  className={`inline-flex mt-2 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    inv.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : inv.status === "EXPIRED"
                      ? "bg-gray-100 text-gray-800"
                      : inv.status === "ACCEPTED"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {inv.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-theme-tertiary">
                {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : ""}
              </div>
              {inv.status === "PENDING" && (
                <button
                  type="button"
                  disabled={revokingIds.includes(inv.id)}
                  onClick={async () => {
                    if (!platformId) return;
                    setRevokingIds((prev) => [...prev, inv.id]);
                    try {
                      await revokePlatformInvitation(platformId, inv.id);
                      toastSuccess("Invitation revoked", inv.email);
                      const resp = await fetchPlatformInvitations(
                        platformId,
                        filter === "ALL" ? undefined : filter
                      );
                      setData(resp);
                    } catch (e) {
                      toastError(
                        "Revoke failed",
                        e instanceof Error ? e.message : "Failed to revoke invitation"
                      );
                    } finally {
                      setRevokingIds((prev) => prev.filter((id) => id !== inv.id));
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-[#ef4a45] px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#e13c38] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {revokingIds.includes(inv.id) ? "Revoking…" : "Revoke"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }, [data, error, isLoading, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-theme-primary">
          Invitations
        </h1>
        <div className="relative w-48" data-dropdown>
          <button
            type="button"
            onClick={() => setIsFilterOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-left text-sm text-theme-primary transition-all duration-200 hover:bg-theme-input-focus focus:outline-none focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
          >
            <span className="truncate">
              {FILTERS.find((f) => f.value === filter)?.label ?? "Filter"}
            </span>
            <ChevronDown
              size={16}
              className={`text-theme-tertiary transition-transform duration-200 ${
                isFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {isFilterOpen && (
            <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md shadow-lg">
              <div className="py-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      setFilter(f.value);
                      setIsFilterOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                      filter === f.value
                        ? "bg-[#b3a1ff]/10 text-theme-primary"
                        : "text-theme-primary hover:bg-theme-input-focus"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {content}
    </div>
  );
}


