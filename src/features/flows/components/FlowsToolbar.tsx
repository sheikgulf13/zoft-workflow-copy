import { Plus } from "lucide-react";

type Props = {
  onCreate: () => void;
  total?: number | null;
  onRefresh: () => void;
  loading: boolean;
};

export default function FlowsToolbar({
  onCreate,
  total,
  onRefresh,
  loading,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Flows</h1>
          <p className="mt-1 text-sm text-theme-secondary">
            Create and manage your automation workflows
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-4 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
        >
          <Plus size={16} />
          Create Flow
        </button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-tertiary">
          {loading ? "Loading..." : `Total flows: ${total ?? 0}`}
        </p>
        <button
          onClick={onRefresh}
          className="text-xs text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Refresh
        </button>
      </div>
    </>
  );
}
