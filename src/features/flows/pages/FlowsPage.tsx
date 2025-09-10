import { useEffect, useState } from "react";
import { useContextStore } from "../../../app/store/context";
import FlowsToolbar from "../components/FlowsToolbar";
import FlowList from "../components/FlowList";
import {
  countFlows,
  deleteFlow,
  getFlow,
  listFlows,
} from "../services/flowService";
import type { FlowSummary } from "../types/flow.types";
import { useNavigate } from "react-router-dom";
import CreateFlowModal from "../components/CreateFlowModal";
import { toastError } from "../../../components/ui/Toast";

export default function FlowsPage() {
  const navigate = useNavigate();
  const currentProjectId = useContextStore((s) => s.currentProject?.id);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [flowCount, setFlowCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [items, total] = await Promise.all([listFlows(), countFlows()]);
      setFlows(items);
      setFlowCount(total);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } } | Error;
      const message =
        (typeof e === "object" &&
          "response" in e &&
          (e as { response?: { data?: { message?: string } } }).response?.data
            ?.message) ||
        (e instanceof Error ? e.message : "Failed to load flows");
      toastError("Could not load flows", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFlow = async (flow: FlowSummary) => {
    try {
      const detail = await getFlow(flow.id);
      sessionStorage.setItem("zw_current_flow", JSON.stringify(detail));
      navigate("/flows/create");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } } | Error;
      const message =
        (typeof e === "object" &&
          "response" in e &&
          (e as { response?: { data?: { message?: string } } }).response?.data
            ?.message) ||
        (e instanceof Error ? e.message : "Failed to open flow");
      toastError("Could not open flow", message);
    }
  };

  const confirmAndDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsDeleting(confirmDeleteId);
      await deleteFlow(confirmDeleteId);
      setFlows((prev) => prev.filter((f) => f.id !== confirmDeleteId));
      setFlowCount((c) => (typeof c === "number" ? Math.max(0, c - 1) : c));
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } } | Error;
      const message =
        (typeof e === "object" &&
          "response" in e &&
          (e as { response?: { data?: { message?: string } } }).response?.data
            ?.message) ||
        (e instanceof Error ? e.message : "Failed to delete flow");
      toastError("Could not delete flow", message);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProjectId]);

  return (
    <div className="space-y-6">
      <FlowsToolbar
        onCreate={() => setIsCreateModalOpen(true)}
        total={flowCount}
        onRefresh={loadData}
        loading={isLoading}
      />
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-40 bg-white/20 rounded" />
                  <div className="h-3 w-64 bg-white/10 rounded" />
                  <div className="h-3 w-32 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FlowList
          flows={flows}
          onOpen={handleOpenFlow}
          onDelete={(id) => setConfirmDeleteId(id)}
        />
      )}

      <CreateFlowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-theme-primary">
              Delete flow?
            </h3>
            <p className="text-sm text-theme-secondary mt-1">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-colors hover:bg-theme-input-focus"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                disabled={isDeleting === confirmDeleteId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-60"
              >
                {isDeleting === confirmDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
