import { Plus } from "lucide-react";

type Props = { onNew: () => void };

export default function ConnectionsToolbar({ onNew }: Props) {
  return (
    <div className="flex items-center justify-between px-[1vw]">
      <div>
        <h1 className="text-[2vw] leading-[2.4vw] font-bold text-theme-primary">Connections</h1>
        <p className="mt-[0.25vw] text-[0.9vw] text-theme-secondary">
          Manage your integrations and connections
        </p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-[0.5vw] rounded-[1vw] bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-[1vw] py-[0.625vw] text-[0.9vw] font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-[0.125vw] focus:ring-theme-primary/20"
      >
        <Plus className="h-[1vw] w-[1vw]" />
        New Connection
      </button>
    </div>
  );
}
