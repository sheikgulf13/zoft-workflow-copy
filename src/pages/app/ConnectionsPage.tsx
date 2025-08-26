import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import ConnectionsModal from "../../components/modals/ConnectionsModal";
import ConnectionSetupModal from "../../components/modals/ConnectionSetupModal";
import { useContextStore } from "../../stores/contextStore";
import { http } from "../../lib/http";
import { toastError, toastSuccess } from "../../components/ui/Toast";
import type { Connection } from "../../types/connection";

type ActivePiece = {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  description: string;
  categories: string[];
  actions: number;
  triggers: number;
  auth?: {
    required: boolean;
    description: string;
    props: Record<
      string,
      {
        displayName: string;
        required: boolean;
        type: string;
      }
    >;
    type: string;
    displayName: string;
  };
};

export default function ConnectionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<ActivePiece | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const currentProject = useContextStore((state) => state.currentProject);

  const fetchConnections = async () => {
    if (!currentProject?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.BACKEND_API_URL || "";
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/projects/${currentProject.id}/app-connections`;
      
      const response = await http.get(url);
      console.log("Connections API response:", response.data);
      // Handle the new response structure
      const connectionsData = response.data?.connections || [];
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
    } catch (error: unknown) {
      console.error("Failed to fetch connections:", error);
      let errorMessage = "Failed to fetch connections. Please try again.";
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      
      toastError("Fetch failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch connections on component mount and when project changes
  useEffect(() => {
    fetchConnections();
  }, [currentProject?.id]);

  const handlePieceSelect = (piece: ActivePiece) => {
    setSelectedPiece(piece);
    setIsModalOpen(false);
    setIsSetupModalOpen(true);
  };

  const handleConnectionCreated = (newConnection: Connection) => {
    // Add the new connection to the existing list
    setConnections(prev => [newConnection, ...prev]);
  };

  const handleDeleteClick = (connectionId: string) => {
    setDeleteConnectionId(connectionId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConnectionId || !currentProject?.id) return;

    setIsDeleting(true);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.BACKEND_API_URL || "";
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/projects/${currentProject.id}/app-connections/${deleteConnectionId}`;
      
      await http.delete(url);
      
      toastSuccess("Connection deleted", "Connection has been successfully deleted");
      // Remove the connection from the local list
      setConnections(prev => prev.filter(conn => conn.id !== deleteConnectionId));
      setShowDeleteModal(false);
      setDeleteConnectionId(null);
    } catch (error: unknown) {
      console.error("Failed to delete connection:", error);
      let errorMessage = "Failed to delete connection. Please try again.";
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      
      toastError("Delete failed", errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteConnectionId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Connections</h1>
          <p className="mt-1 text-sm text-theme-secondary">
            Manage your integrations and connections
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-theme-primary hover:bg-[#a08fff] text-theme-inverse px-4 py-2.5 text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
        >
          <Plus size={16} />
          New Connection
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
          <p className="text-center text-theme-secondary">
            Loading connections...
          </p>
        </div>
      ) : !Array.isArray(connections) || connections.length === 0 ? (
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md p-6 shadow-sm">
          <p className="text-center text-theme-secondary">
            No connections configured yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.isArray(connections) && connections.map((connection) => (
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
                    <h3 className="font-semibold text-theme-primary">{connection.displayName}</h3>
                    <p className="text-sm text-theme-secondary">
                      {connection.metadata?.pieceDisplayName || connection.pieceName}
                    </p>
                    <p className="text-xs text-theme-tertiary">
                      Created: {new Date(connection.created).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    connection.status === 'ACTIVE' 
                      ? 'bg-[#a4f5a6]/20 text-[#a4f5a6] border border-[#a4f5a6]/30' 
                      : 'bg-[#ef4a45]/20 text-[#ef4a45] border border-[#ef4a45]/30'
                  }`}>
                    {connection.status}
                  </span>
                  <button
                    onClick={() => handleDeleteClick(connection.id)}
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
          }}
          piece={selectedPiece}
          onConnectionCreated={handleConnectionCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Delete Connection</h3>
              <p className="mt-1 text-sm text-theme-secondary">
                Are you sure you want to delete this connection? This action cannot be undone.
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
