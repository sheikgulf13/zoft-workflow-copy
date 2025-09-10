import { useCallback, useEffect, useState } from "react";
import ConnectionsToolbar from "../components/Toolbar";
import ConnectionsList from "../components/ConnectionsList";
import { useContextStore } from "../../../app/store/context";
import {
  listConnections,
  deleteConnection,
} from "../services/connectionService";
import type { Connection } from "../types/connection.types";
import ConnectionsModal from "../components/ConnectionsModal";
import ConnectionSetupModal from "../components/ConnectionSetupModal";
import type { ActivePiece } from "../types/connection.types";
import { toastError, toastSuccess } from "../../../components/ui/Toast";

export default function ConnectionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<ActivePiece | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editConnection, setEditConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const currentProject = useContextStore((s) => s.currentProject);

  const fetchConnections = useCallback(async () => {
    if (!currentProject?.id) return;
    setIsLoading(true);
    try {
      const data = await listConnections(currentProject.id);
      setConnections(data);
    } catch {
      toastError(
        "Fetch failed",
        "Failed to fetch connections. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handlePieceSelect = (piece: ActivePiece) => {
    setSelectedPiece(piece);
    setIsModalOpen(false);
    setIsSetupModalOpen(true);
  };
  const handleEditClick = (connection: Connection) => {
    const piece: ActivePiece = {
      id: connection.pieceName,
      name: connection.pieceName,
      displayName:
        connection.metadata?.pieceDisplayName || connection.pieceName,
      logoUrl:
        connection.metadata?.pieceLogoUrl ||
        "https://via.placeholder.com/32x32?text=?",
      description: "",
      categories: [],
      actions: 0,
      triggers: 0,
    };
    setSelectedPiece(piece);
    setEditConnection(connection);
    setIsModalOpen(false);
    setIsSetupModalOpen(true);
  };
  const handleConnectionUpdated = (updated: Connection) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };
  const handleConnectionCreated = (newConnection: Connection) => {
    setConnections((prev) => [newConnection, ...prev]);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConnectionId(id);
    setShowDeleteModal(true);
  };
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteConnectionId(null);
  };
  const handleDeleteConfirm = async () => {
    if (!deleteConnectionId || !currentProject?.id) return;
    setIsDeleting(true);
    try {
      await deleteConnection(currentProject.id, deleteConnectionId);
      toastSuccess(
        "Connection deleted",
        "Connection has been successfully deleted"
      );
      setConnections((prev) => prev.filter((c) => c.id !== deleteConnectionId));
      setShowDeleteModal(false);
      setDeleteConnectionId(null);
    } catch {
      toastError(
        "Delete failed",
        "Failed to delete connection. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConnectionsToolbar onNew={() => setIsModalOpen(true)} />

      {isLoading ? (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
          <p className="text-center text-theme-secondary">
            Loading connections...
          </p>
        </div>
      ) : (
        <ConnectionsList
          connections={connections}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      )}

      <ConnectionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPieceSelect={handlePieceSelect}
      />

      {selectedPiece && (
        <ConnectionSetupModal
          isOpen={isSetupModalOpen}
          onClose={() => {
            setIsSetupModalOpen(false);
            setSelectedPiece(null);
            setEditConnection(null);
          }}
          piece={selectedPiece}
          onConnectionCreated={handleConnectionCreated}
          mode={editConnection ? "edit" : "create"}
          existingConnection={editConnection ?? undefined}
          onConnectionUpdated={handleConnectionUpdated}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">
                Delete Connection
              </h3>
              <p className="mt-1 text-sm text-theme-secondary">
                Are you sure you want to delete this connection? This action
                cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] hover:bg-[#ef4a45]/80 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#ef4a45]/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
