import { useContextStore } from "../../../../app/store/context";

export default function PlatformInfo() {
  const currentPlatform = useContextStore((s) => s.currentPlatform);
  if (!currentPlatform) return null;
  return (
    <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-primary backdrop-blur-md p-6 m-8 shadow-sm">
      <h3 className="text-lg font-semibold text-theme-primary mb-4">
        Platform Information
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-theme-secondary">
            Platform Name
          </p>
          <p className="text-theme-primary">{currentPlatform.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-theme-secondary">Your Role</p>
          <p className="text-theme-primary capitalize">
            {currentPlatform.role || "Member"}
          </p>
        </div>
      </div>
    </div>
  );
}
