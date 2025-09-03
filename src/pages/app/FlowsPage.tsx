import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import CreateFlowModal from "../../components/modals/CreateFlowModal";
import { countFlows, listFlows, type FlowSummary, getFlow, deleteFlow } from "../../lib/flows";
import { toastError } from "../../components/ui/Toast";
import { useNavigate } from "react-router-dom";

type Flow = FlowSummary;

export default function FlowsPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowCount, setFlowCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreateFlow = () => {
    setIsCreateModalOpen(true);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [items, total] = await Promise.all([
        listFlows(),
        countFlows(),
      ]);
      setFlows(items);
      setFlowCount(total);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to load flows";
      toastError("Could not load flows", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFlow = async (flow: Flow) => {
    try {
      const detail = await getFlow(flow.id);
      sessionStorage.setItem('zw_current_flow', JSON.stringify(detail));
      navigate('/flows/create');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to open flow";
      toastError("Could not open flow", message);
    }
  };

  const confirmAndDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsDeleting(confirmDeleteId);
      await deleteFlow(confirmDeleteId);
      setFlows((prev) => prev.filter((f) => f.id !== confirmDeleteId));
      setFlowCount((c) => (typeof c === 'number' ? Math.max(0, c - 1) : c));
      setConfirmDeleteId(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to delete flow";
      toastError("Could not delete flow", message);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Flows</h1>
          <p className="mt-1 text-sm text-theme-secondary">
            Create and manage your automation workflows
          </p>
        </div>
        <button
          onClick={handleCreateFlow}
          className="inline-flex items-center gap-2 rounded-2xl bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-4 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
        >
          <Plus size={16} />
          Create Flow
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-tertiary">
          {isLoading ? 'Loading...' : `Total flows: ${flowCount ?? 0}`}
        </p>
        <button
          onClick={loadData}
          className="text-xs text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
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
      )}

      {!isLoading && flows.length === 0 ? (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
          <p className="text-center text-theme-secondary">
            No flows created yet
          </p>
        </div>
      ) : null}

      {!isLoading && flows.length > 0 && (
        <div className="space-y-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="cursor-pointer" onClick={() => handleOpenFlow(flow)}>
                  <h3 className="font-semibold text-theme-primary">{flow.name}</h3>
                  {flow.description && (
                    <p className="text-sm text-theme-secondary">{flow.description}</p>
                  )}
                  <p className="text-xs text-theme-tertiary">
                    Created: {new Date(flow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {flow.status && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      flow.status === 'active'
                        ? 'bg-[#a4f5a6]/20 text-[#a4f5a6] border border-[#a4f5a6]/30'
                        : 'bg-[#ef4a45]/20 text-[#ef4a45] border border-[#ef4a45]/30'
                    }`}>
                      {flow.status}
                    </span>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(flow.id)}
                    className="p-2 rounded-xl text-[#ef4a45] hover:bg-[#ef4a45]/10 transition-colors"
                    title="Delete flow"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
                 </div>
      )}

       <CreateFlowModal
         isOpen={isCreateModalOpen}
         onClose={() => setIsCreateModalOpen(false)}
       />

       {confirmDeleteId && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
           <div className="w-full max-w-sm rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
             <h3 className="text-lg font-semibold text-theme-primary">Delete flow?</h3>
             <p className="text-sm text-theme-secondary mt-1">This action cannot be undone.</p>
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
                 {isDeleting === confirmDeleteId ? 'Deleting...' : 'Delete'}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
