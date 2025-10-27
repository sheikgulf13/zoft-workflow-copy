import { useState, useEffect } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { toastError } from "../../../components/ui/Toast";
import type { ActivePiece } from "../types/connection.types";
import { http } from "../../../shared/api";

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
  }, [isOpen, pieces.length]);
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredPieces(
      pieces.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, pieces]);

  const fetchPieces = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await http.get(
        "/pods",
        { params: { release: "", includeHidden: false } }
      );
      const raw = response.data as unknown;
      let list: Array<Record<string, unknown>> = [];
      if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>;
        const dataObj = (obj["data"] as Record<string, unknown> | undefined) || {};
        const pods = dataObj["pods"] as unknown;
        if (Array.isArray(pods)) list = pods as Array<Record<string, unknown>>;
      }
      if (list.length === 0) {
        if (Array.isArray(raw)) list = raw as Array<Record<string, unknown>>;
        else if (raw && typeof raw === "object") {
          const obj = raw as Record<string, unknown>;
          const items = obj["items"];
          const data = obj["data"];
          if (Array.isArray(items)) list = items as Array<Record<string, unknown>>;
          else if (Array.isArray(data)) list = data as Array<Record<string, unknown>>;
        }
      }
      const allPieces: ActivePiece[] = list.map((p: Record<string, unknown>) => ({
        id: String((p["id"] ?? p["name"] ?? "") as string),
        name: String((p["name"] ?? p["id"] ?? "") as string),
        displayName: String((p["displayName"] ?? p["name"] ?? "") as string),
        logoUrl: String((p["logoUrl"] ?? "") as string),
        description: String((p["description"] ?? "") as string),
        categories: Array.isArray(p["categories"]) ? (p["categories"] as string[]) : [],
        actions: Number((p["actionsCount"] as number | undefined) ?? 0),
        triggers: Number((p["triggersCount"] as number | undefined) ?? 0),
      }));
      setPieces(allPieces);
      setFilteredPieces(allPieces);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-[1vw]">
      <div className="w-full max-w-[55vw] h-[36vw] overflow-hidden rounded-[1vw] bg-white/75 backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-[1.2vw]">
          <div>
            <h2 className="text-[1.2vw] leading-[1.4vw] font-semibold text-theme-primary">
              New Connection
            </h2>
            <p className="mt-[0.25vw] text-[0.9vw] text-theme-secondary">
              Choose a service to connect
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[0.8vw] p-[0.6vw] text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus hover:text-theme-primary"
          >
            <X className="h-[1vw] w-[1vw]" />
          </button>
        </div>
        <div className="p-[1.2vw] h-full flex flex-col">
          <div className="flex items-center gap-[0.8vw] mb-[1.2vw]">
            <div className="relative flex-1">
              <Search className="absolute left-[0.7vw] top-1/2 h-[0.9vw] w-[0.9vw] -translate-y-1/2 text-theme-secondary" />
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[1vw] bg-theme-input px-[0.9vw] py-[0.6vw] pl-[2.2vw] text-[0.9vw] text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-[0.3vw] focus:ring-[#b3a1ff]/20"
              />
            </div>
            {hasError && (
              <button
                onClick={fetchPieces}
                disabled={isLoading}
                className="inline-flex items-center gap-[0.5vw] rounded-[1vw] bg-theme-input px-[0.9vw] py-[0.6vw] text-[0.9vw] font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`${isLoading ? "animate-spin" : ""} h-[1vw] w-[1vw]`} />
                Reload
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-[3vw]">
              <div className="text-theme-secondary">Loading connections...</div>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 gap-[1vw] lg:grid-cols-4 overflow-y-auto pr-[0.4vw] [&::-webkit-scrollbar]:w-[0.4vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50"
              style={{ maxHeight: "calc(100% - 10vw)" }}
            >
              {filteredPieces.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => handlePieceSelect(piece)}
                  className="flex flex-col items-center gap-[0.6vw] rounded-[1vw] border border-white/20 dark:border-white/10 bg-[#ebebeb] p-[1vw] text-center transition-all duration-200 hover:border-[#b3a1ff]/50 hover:bg-[#b3a1ff]/10 hover:shadow-lg"
                >
                  <img
                    src={piece.logoUrl}
                    alt={piece.displayName}
                    className="h-[2.4vw] w-[2.4vw] rounded-[0.6vw] object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/48x48?text=?";
                    }}
                  />
                  <h3 className="font-semibold text-theme-primary text-[0.9vw]">
                    {piece.displayName}
                  </h3>
                </button>
              ))}
            </div>
          )}
          {!isLoading && filteredPieces.length === 0 && (
            <div className="text-center py-[3vw] text-theme-secondary text-[0.9vw]">
              No connections found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
