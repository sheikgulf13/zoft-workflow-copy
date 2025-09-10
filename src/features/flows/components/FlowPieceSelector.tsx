import { useState, useRef, useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import {
  X,
  Search,
  ArrowLeft,
  Grid,
  Sparkles,
  Puzzle,
  Wrench,
} from "lucide-react";
import { toastError } from "../../../components/ui/Toast";

export interface FlowPiece {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  version?: string;
  description?: string;
  actions?: FlowPieceAction[];
  triggers?: FlowPieceTrigger[];
  category: "explore" | "ai-agents" | "apps" | "utility";
}

export interface FlowPieceAction {
  name: string;
  displayName: string;
  description?: string;
  props?: Record<string, unknown>;
}

export interface FlowPieceTrigger {
  name: string;
  displayName: string;
  description?: string;
  props?: Record<string, unknown>;
}

interface FlowPieceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPiece: (
    piece: FlowPiece,
    actionOrTrigger: FlowPieceAction | FlowPieceTrigger,
    type: "action" | "trigger"
  ) => void;
  type: "action" | "trigger";
  nodePosition?: { x: number; y: number };
}

type Category = "explore" | "ai-agents" | "apps" | "utility";

const categoryConfig: Record<
  Category,
  { label: string; icon: React.ReactNode }
> = {
  explore: { label: "Explore", icon: <Grid size={16} /> },
  "ai-agents": { label: "AI & Agents", icon: <Sparkles size={16} /> },
  apps: { label: "Apps", icon: <Puzzle size={16} /> },
  utility: { label: "Utility", icon: <Wrench size={16} /> },
};

const popularPieces: FlowPiece[] = [
  {
    id: "google-sheets",
    name: "google-sheets",
    displayName: "Google Sheets",
    logoUrl: "https://cdn.activepieces.com/pieces/google-sheets.png",
    category: "apps",
    actions: [
      {
        name: "create_row",
        displayName: "Create Row",
        description: "Add a new row to a spreadsheet",
      },
      {
        name: "update_row",
        displayName: "Update Row",
        description: "Update an existing row",
      },
    ],
    triggers: [
      {
        name: "new_row",
        displayName: "New Row Created",
        description: "Triggers when a new row is added",
      },
    ],
  },
  {
    id: "slack",
    name: "slack",
    displayName: "Slack",
    logoUrl: "https://cdn.activepieces.com/pieces/slack.png",
    category: "apps",
    actions: [
      {
        name: "send_message",
        displayName: "Send Message",
        description: "Send a message to a channel",
      },
    ],
    triggers: [
      {
        name: "new_message",
        displayName: "New Message",
        description: "Triggers when a new message is received",
      },
    ],
  },
  {
    id: "webhook",
    name: "webhook",
    displayName: "Webhook",
    logoUrl: "https://cdn.activepieces.com/pieces/webhook.png",
    category: "utility",
    triggers: [
      {
        name: "webhook_received",
        displayName: "Webhook Received",
        description: "Triggers when a webhook is received",
      },
    ],
  },
  {
    id: "schedule",
    name: "schedule",
    displayName: "Schedule",
    logoUrl: "https://cdn.activepieces.com/pieces/schedule.png",
    category: "utility",
    triggers: [
      {
        name: "scheduled",
        displayName: "Scheduled",
        description: "Triggers on a schedule",
      },
    ],
  },
  {
    id: "notion",
    name: "notion",
    displayName: "Notion",
    logoUrl: "https://cdn.activepieces.com/pieces/notion.png",
    category: "apps",
    actions: [
      {
        name: "create_page",
        displayName: "Create Page",
        description: "Create a new page in Notion",
      },
    ],
    triggers: [
      {
        name: "page_created",
        displayName: "Page Created",
        description: "Triggers when a page is created",
      },
    ],
  },
  {
    id: "gmail",
    name: "gmail",
    displayName: "Gmail",
    logoUrl: "https://cdn.activepieces.com/pieces/gmail.png",
    category: "apps",
    actions: [
      {
        name: "send_email",
        displayName: "Send Email",
        description: "Send an email via Gmail",
      },
    ],
    triggers: [
      {
        name: "email_received",
        displayName: "Email Received",
        description: "Triggers when an email is received",
      },
    ],
  },
];

export default function FlowPieceSelector({
  isOpen,
  onClose,
  onSelectPiece,
  type,
  nodePosition,
}: FlowPieceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [selectedPiece, setSelectedPiece] = useState<FlowPiece | null>(null);
  const [pieces, setPieces] = useState<FlowPiece[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("explore");
  const [isLoadingPieceDetails, setIsLoadingPieceDetails] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchPieces = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const response = await fetch(
        "https://cloud.activepieces.com/api/v1/pieces"
      );
      if (!response.ok) throw new Error("Failed to fetch pieces");
      const data = await response.json();
      const transformedPieces: FlowPiece[] = data.map(
        (piece: Record<string, unknown>) => ({
          id: piece.id as string,
          name: piece.name as string,
          displayName: piece.displayName as string,
          logoUrl: piece.logoUrl as string,
          description: piece.description as string,
          category: "apps",
          actions: [],
          triggers: [],
        })
      );
      const allPieces = [...popularPieces, ...transformedPieces];
      setPieces(allPieces);
    } catch (error) {
      console.error("Failed to fetch pieces:", error);
      setHasError(true);
      setPieces(popularPieces);
      toastError("Failed to load pieces", "Using popular pieces only");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPieceDetails = async (pieceName: string) => {
    try {
      setIsLoadingPieceDetails(true);
      const apiUrl = `https://cloud.activepieces.com/api/v1/pieces/@activepieces/piece-${pieceName}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch piece details");
      const pieceData = await response.json();
      const actions = pieceData.actions
        ? Object.entries(pieceData.actions).map(([key, action]) => {
            const actionData = action as Record<string, unknown>;
            return {
              name: key,
              displayName: (actionData.displayName as string) || key,
              description: (actionData.description as string) || "",
              props: (actionData.props as Record<string, unknown>) || {},
            };
          })
        : [];
      const triggers = pieceData.triggers
        ? Object.entries(pieceData.triggers).map(([key, trigger]) => {
            const triggerData = trigger as Record<string, unknown>;
            return {
              name: key,
              displayName: (triggerData.displayName as string) || key,
              description: (triggerData.description as string) || "",
              props: (triggerData.props as Record<string, unknown>) || {},
            };
          })
        : [];
      const version =
        (pieceData.version as string) ||
        (pieceData.latestVersion as string) ||
        undefined;
      return { actions, triggers, version };
    } catch (error) {
      console.error("Failed to fetch piece details:", error);
      toastError("Failed to load piece details", "Please try again");
      return { actions: [], triggers: [], version: undefined };
    } finally {
      setIsLoadingPieceDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPieces();
    }
  }, [isOpen, fetchPieces]);
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const filteredPieces = pieces.filter((piece) => {
    const matchesSearch =
      !debouncedQuery ||
      piece.displayName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      piece.description?.toLowerCase().includes(debouncedQuery.toLowerCase());
    const matchesCategory = piece.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePieceSelect = async (piece: FlowPiece) => {
    try {
      const { actions, triggers, version } = await fetchPieceDetails(
        piece.name
      );
      const updatedPiece = { ...piece, actions, triggers, version };
      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? updatedPiece : p))
      );
      setSelectedPiece(updatedPiece);
    } catch (error) {
      console.error("Failed to select piece:", error);
      toastError("Failed to load piece", "Please try again");
    }
  };

  const handleActionSelect = (action: FlowPieceAction) => {
    if (selectedPiece) {
      onSelectPiece(selectedPiece, action, "action");
      handleClose();
    }
  };
  const handleTriggerSelect = (trigger: FlowPieceTrigger) => {
    if (selectedPiece) {
      onSelectPiece(selectedPiece, trigger, "trigger");
      handleClose();
    }
  };
  const handleClose = () => {
    setSelectedPiece(null);
    setSearchQuery("");
    setSelectedCategory("explore");
    onClose();
  };
  const handleBack = () => {
    setSelectedPiece(null);
  };
  if (!isOpen) return null;

  const getModalPosition = () => {
    if (!nodePosition)
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalWidth = Math.min(800, viewportWidth * 0.8);
    const modalHeight = Math.min(600, viewportHeight * 0.6);
    let left = nodePosition.x + 120;
    let top = nodePosition.y;
    if (left + modalWidth > viewportWidth)
      left = nodePosition.x - modalWidth - 20;
    if (left < 20) left = 20;
    if (top + modalHeight > viewportHeight)
      top = viewportHeight - modalHeight - 20;
    if (top < 20) top = 20;
    return { left: `${left}px`, top: `${top}px`, transform: "none" };
  };

  return (
    <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50 pointer-events-none items-center justify-center">
      <div
        className="bg-theme-form/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 w-[600px] max-w-[600px] h-[500px] flex flex-col pointer-events-auto"
        style={getModalPosition()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center gap-3">
            {selectedPiece && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-theme-input-focus rounded-xl transition-all duration-200"
              >
                <ArrowLeft size={20} className="text-theme-primary" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-theme-primary">
              {selectedPiece
                ? `${selectedPiece.displayName} ${
                    type === "action" ? "Actions" : "Triggers"
                  }`
                : `Select ${type}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-theme-input-focus rounded-xl transition-all duration-200"
          >
            <X size={20} className="text-theme-primary" />
          </button>
        </div>
        <div className="p-4 border-b border-white/20 dark:border-white/10">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-secondary"
              size={16}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
            />
          </div>
        </div>
        <div className="px-4 border-b border-white/20 dark:border-white/10">
          <div className="flex space-x-6">
            {Object.entries(categoryConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedCategory(key as Category);
                  setSelectedPiece(null);
                }}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all duration-200 ${
                  selectedCategory === key
                    ? "border-[#b3a1ff] text-[#b3a1ff]"
                    : "border-transparent text-theme-secondary hover:text-theme-primary"
                }`}
              >
                {config.icon}
                <span className="text-sm font-medium">{config.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-theme-secondary">Loading pieces...</div>
            </div>
          ) : hasError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-[#ef4a45] mb-2">Failed to load pieces</div>
                <button
                  onClick={fetchPieces}
                  className="px-4 py-2 bg-[#b3a1ff] text-white rounded-xl hover:bg-[#a08fff] transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0">
              <div className="w-1/2 border-r border-white/20 dark:border-white/10 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                  <div className="space-y-2">
                    {filteredPieces.length === 0 ? (
                      <div className="text-center text-theme-secondary py-8">
                        No pieces found in this category
                      </div>
                    ) : (
                      filteredPieces.map((piece) => {
                        const isActive = selectedPiece?.id === piece.id;
                        return (
                          <button
                            key={piece.id}
                            onClick={() => handlePieceSelect(piece)}
                            className={`flex items-center gap-2 p-2 text-left w-full border rounded-xl transition-all duration-200 ${
                              isActive
                                ? "border-[#b3a1ff] bg-[#b3a1ff]/10 shadow-sm"
                                : "border-white/20 dark:border-white/10 hover:bg-theme-input-focus"
                            }`}
                          >
                            <img
                              src={piece.logoUrl}
                              alt={piece.displayName}
                              className="w-6 h-6 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/24x24?text=?";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-medium truncate ${
                                  isActive
                                    ? "text-[#b3a1ff]"
                                    : "text-theme-primary"
                                }`}
                              >
                                {piece.displayName}
                              </div>
                              {piece.description && (
                                <div
                                  className={`text-xs mt-0.5 line-clamp-1 ${
                                    isActive
                                      ? "text-[#b3a1ff]/80"
                                      : "text-theme-secondary"
                                  }`}
                                >
                                  {piece.description}
                                </div>
                              )}
                            </div>
                            {isActive && (
                              <div className="w-1.5 h-1.5 bg-[#b3a1ff] rounded-full flex-shrink-0"></div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="w-1/2 flex flex-col min-h-0">
                {selectedPiece ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {isLoadingPieceDetails ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-theme-secondary">
                          Loading piece details...
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 border-b border-white/20 dark:border-white/10 flex-shrink-0">
                          <h3 className="text-base font-semibold text-theme-primary mb-1">
                            {selectedPiece.displayName}{" "}
                            {type === "action" ? "Actions" : "Triggers"}
                          </h3>
                          <div className="text-xs text-theme-secondary">
                            Select an {type} to add to your workflow
                          </div>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                          <div className="space-y-2">
                            {type === "action" &&
                              selectedPiece.actions?.map((action) => (
                                <button
                                  key={action.name}
                                  onClick={() => handleActionSelect(action)}
                                  className="flex items-start gap-2 p-2 text-left w-full border border-white/20 dark:border-white/10 rounded-xl hover:bg-theme-input-focus transition-all duration-200"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-theme-primary">
                                      {action.displayName}
                                    </div>
                                    {action.description && (
                                      <div className="text-xs text-theme-secondary mt-0.5">
                                        {action.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            {type === "trigger" &&
                              selectedPiece.triggers?.map((trigger) => (
                                <button
                                  key={trigger.name}
                                  onClick={() => handleTriggerSelect(trigger)}
                                  className="flex items-start gap-2 p-2 text-left w-full border border-white/20 dark;border-white/10 rounded-xl hover:bg-theme-input-focus transition-all duration-200"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-theme-primary">
                                      {trigger.displayName}
                                    </div>
                                    {trigger.description && (
                                      <div className="text-xs text-theme-secondary mt-0.5">
                                        {trigger.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            {((type === "action" &&
                              (!selectedPiece.actions ||
                                selectedPiece.actions.length === 0)) ||
                              (type === "trigger" &&
                                (!selectedPiece.triggers ||
                                  selectedPiece.triggers.length === 0))) && (
                              <div className="text-center text-theme-secondary py-8">
                                No {type}s available for this piece
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-4">
                    <div className="text-center">
                      <div className="text-4xl mb-4 text-theme-secondary">
                        ←
                      </div>
                      <div className="text-theme-primary font-medium">
                        Please select a piece first
                      </div>
                      <div className="text-sm text-theme-secondary mt-2">
                        Choose from the list on the left to see available {type}
                        s
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
