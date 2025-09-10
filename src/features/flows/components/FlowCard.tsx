import { Trash2 } from "lucide-react";
import type { FlowSummary } from "../types/flow.types";

type Props = {
  flow: FlowSummary;
  onOpen: (f: FlowSummary) => void;
  onDelete: (id: string) => void;
};

export default function FlowCard({ flow, onOpen, onDelete }: Props) {
  return (
    <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => onOpen(flow)}>
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
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                flow.status === "ENABLED"
                  ? "bg-[#a4f5a6]/20 text-[#10b981] border border-[#a4f5a6]/30"
                  : "bg-[#ef4a45]/20 text-[#ef4a45] border border-[#ef4a45]/30"
              }`}
            >
              {flow.status}
            </span>
          )}
          <button
            onClick={() => onDelete(flow.id)}
            className="p-2 rounded-xl text-[#ef4a45] hover:bg-[#ef4a45]/10 transition-colors"
            title="Delete flow"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
