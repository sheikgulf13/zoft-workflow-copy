import { useState, useEffect } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { toastError } from "../ui/Toast";

type ActivePiece = {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  description: string;
  categories: string[];
  actions: number;
  triggers: number;
};

type ConnectionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPieceSelect: (piece: ActivePiece) => void;
};

export default function ConnectionsModal({
  isOpen,
  onClose,
  onPieceSelect,
}: ConnectionsModalProps) {
  const [pieces, setPieces] = useState<ActivePiece[]>([]);
  const [filteredPieces, setFilteredPieces] = useState<ActivePiece[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen && pieces.length === 0) {
      fetchPieces();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = pieces.filter((piece) =>
      piece.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPieces(filtered);
  }, [searchQuery, pieces]);

  const fetchPieces = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await fetch(
        "https://cloud.activepieces.com/api/v1/pieces"
      );
      if (!response.ok) throw new Error("Failed to fetch pieces");
      const data = await response.json();
      setPieces(data);
      setFilteredPieces(data);
    } catch (error) {
      console.error("Failed to fetch pieces:", error);
      toastError(
        "Failed to load connections",
        "Unable to fetch available connections"
      );
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePieceSelect = (piece: ActivePiece) => {
    onPieceSelect(piece);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl h-[600px] overflow-hidden rounded-2xl bg-theme-form/95 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">
              New Connection
            </h2>
            <p className="mt-1 text-sm text-theme-secondary">
              Choose a service to connect
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2.5 text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus hover:text-theme-primary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-secondary" />
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-theme-input-border bg-theme-input px-4 py-3 pl-10 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/20"
              />
            </div>
            {hasError && (
              <button
                onClick={fetchPieces}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-theme-input-border bg-theme-input px-3 py-2.5 text-sm font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
                Reload
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-theme-secondary">Loading connections...</div>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 gap-4 lg:grid-cols-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50"
              style={{ maxHeight: "calc(100% - 160px)" }}
            >
              {filteredPieces.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => handlePieceSelect(piece)}
                  className="flex flex-col items-center gap-3 rounded-xl border border-white/20 dark:border-white/10 bg-theme-form/50 backdrop-blur-md p-4 text-center transition-all duration-200 hover:border-[#b3a1ff]/50 hover:bg-[#b3a1ff]/10 hover:shadow-lg"
                >
                  <img
                    src={piece.logoUrl}
                    alt={piece.displayName}
                    className="h-12 w-12 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "https://via.placeholder.com/48x48?text=?";
                    }}
                  />
                  <h3 className="font-semibold text-theme-primary text-sm">
                    {piece.displayName}
                  </h3>
                </button>
              ))}
            </div>
          )}

          {!isLoading && filteredPieces.length === 0 && (
            <div className="text-center py-12 text-theme-secondary">
              No connections found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
