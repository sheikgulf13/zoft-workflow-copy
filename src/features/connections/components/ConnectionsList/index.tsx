import { Pencil, Trash2 } from "lucide-react";
import type { Connection } from "../../types/connection.types";

type Props = {
  connections: Connection[];
  onEdit: (c: Connection) => void;
  onDelete: (id: string) => void;
};

export default function ConnectionsList({
  connections,
  onEdit,
  onDelete,
}: Props) {
  if (!Array.isArray(connections) || connections.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
        <p className="text-center text-theme-secondary">
          No connections configured yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <div
          key={connection.id}
          className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {connection.metadata?.pieceLogoUrl && (
                <img
                  src={connection.metadata.pieceLogoUrl}
                  alt=""
                  className="w-8 h-8 rounded-xl ring-2 ring-white shadow-md"
                />
              )}
              <div>
                <h3 className="font-semibold text-theme-primary">
                  {connection.displayName}
                </h3>
                <p className="text-sm text-theme-secondary">
                  {connection.metadata?.pieceDisplayName ||
                    connection.pieceName}
                </p>
                <p className="text-xs text-theme-tertiary">
                  Created: {new Date(connection.created).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  connection.status === "ACTIVE"
                    ? "bg-[#a4f5a6]/20 text-[#a4f5a6] border border-[#a4f5a6]/30"
                    : "bg-[#ef4a45]/20 text-[#ef4a45] border border-[#ef4a45]/30"
                }`}
              >
                {connection.status}
              </span>
              <button
                onClick={() => onEdit(connection)}
                className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-input-focus rounded-2xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                title="Edit connection"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(connection.id)}
                className="p-2 text-theme-tertiary hover:text-[#ef4a45] hover:bg-[#ef4a45]/10 rounded-2xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#ef4a45]/20"
                title="Delete connection"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
