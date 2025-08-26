import { useState } from "react";
import { Plus } from "lucide-react";
import CreateFlowModal from "../../components/modals/CreateFlowModal";

type Flow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: string;
};

export default function FlowsPage() {
  const [flows] = useState<Flow[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateFlow = () => {
    setIsCreateModalOpen(true);
  };

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

      {flows.length === 0 ? (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
          <p className="text-center text-theme-secondary">
            No flows created yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-theme-primary">{flow.name}</h3>
                  <p className="text-sm text-theme-secondary">{flow.description}</p>
                  <p className="text-xs text-theme-tertiary">
                    Created: {new Date(flow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    flow.status === 'active'
                      ? 'bg-[#a4f5a6]/20 text-[#a4f5a6] border border-[#a4f5a6]/30'
                      : 'bg-[#ef4a45]/20 text-[#ef4a45] border border-[#ef4a45]/30'
                  }`}>
                    {flow.status}
                  </span>
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
     </div>
   );
 }
