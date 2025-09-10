import { Plus } from "lucide-react";

type Props = { onNew: () => void };

export default function ConnectionsToolbar({ onNew }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Connections</h1>
        <p className="mt-1 text-sm text-theme-secondary">
          Manage your integrations and connections
        </p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 rounded-2xl bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-4 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
      >
        <Plus size={16} />
        New Connection
      </button>
    </div>
  );
}
