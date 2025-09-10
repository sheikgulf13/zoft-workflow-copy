import type { FlowSummary } from "../types/flow.types";
import FlowCard from "./FlowCard";

type Props = {
  flows: FlowSummary[];
  onOpen: (f: FlowSummary) => void;
  onDelete: (id: string) => void;
};

export default function FlowList({ flows, onOpen, onDelete }: Props) {
  if (flows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
        <p className="text-center text-theme-secondary">No flows created yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {flows.map((flow) => (
        <FlowCard
          key={flow.id}
          flow={flow}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
