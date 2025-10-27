import { useEffect, useState } from "react";
import { useContextStore } from "../../../app/store/context";
import FlowsToolbar from "../components/FlowsToolbar";
import FlowsTable from "../components/FlowsTable";
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
    <div className="h-full flex flex-col overflow-hidden gap-[1.2vw] px-[1vw]">
      <FlowsToolbar
        onCreate={() => setIsCreateModalOpen(true)}
        total={flowCount}
        onRefresh={loadData}
        loading={isLoading}
      />
      <div className="flex-1 min-h-0 overflow-hidden px-[1vw]">
      {isLoading ? (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-[1vw] text-theme-secondary">Loading...</div>
        </div>
      ) : (
        <FlowsTable
          flows={flows}
          onOpen={handleOpenFlow}
          onDelete={(id) => setConfirmDeleteId(id)}
        />
      )}
      </div>

      <CreateFlowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[1vw] bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-[1.2vw] shadow-2xl">
            <h3 className="text-[1.1vw] font-semibold text-theme-primary">
              Delete flow?
            </h3>
            <p className="text-[0.9vw] text-theme-secondary mt-[0.25vw]">
              This action cannot be undone.
            </p>
            <div className="mt-[1vw] flex items-center justify-end gap-[0.6vw]">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-[0.8vw] px-[1vw] py-[0.6vw] text-[0.9vw] font-semibold text-theme-secondary transition-colors hover:bg-theme-input-focus"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                disabled={isDeleting === confirmDeleteId}
                className="inline-flex items-center justify-center gap-[0.5vw] rounded-[0.8vw] bg-[#C43201] px-[1.2vw] py-[0.6vw] text-[0.9vw] font-semibold text-white transition-colors hover:bg-[#C43201]/90 disabled:opacity-60"
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
