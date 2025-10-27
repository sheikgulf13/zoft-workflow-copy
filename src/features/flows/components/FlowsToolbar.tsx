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
      <div className="flex items-center justify-between px-[1vw]">
        <div>
          <h1 className="text-[2vw] leading-[2.4vw] font-bold text-theme-primary">Flows</h1>
          <p className="mt-[0.25vw] text-[0.9vw] text-theme-secondary">
            Create and manage your automation workflows
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-[0.5vw] rounded-[1vw] bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-[1vw] py-[0.625vw] text-[0.9vw] font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-[0.125vw] focus:ring-theme-primary/20"
        >
          <Plus className="h-[1vw] w-[1vw]" />
          Create Flow
        </button>
      </div>
      <div className="flex items-center justify-between px-[1vw]">
        <p className="text-[0.9vw] text-theme-tertiary">
          {loading ? "Loading..." : `Total flows: ${total ?? 0}`}
        </p>
        <button
          onClick={onRefresh}
          className="text-[0.8vw] text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Refresh
        </button>
      </div>
    </>
  );
}
