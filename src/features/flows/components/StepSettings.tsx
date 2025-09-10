import { useState, useEffect, useCallback } from "react";
import { X, Plus } from "lucide-react";
import { toastError, toastSuccess } from "../../../components/ui/Toast";
import { useContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";
import {
  changeWorkflowName,
  updateAction,
  createWebhookTrigger,
  saveSampleData,
} from "../services/flowService";
import type { Connection } from "../../../types/connection";

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
      { displayName: string; required: boolean; type: string }
    >;
    type: string;
    displayName: string;
  };
};

export interface StepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  step: {
    id: string;
    name: string;
    type: "action" | "trigger" | "code" | "loop" | "router";
    pieceName?: string;
    actionName?: string;
    triggerName?: string;
    displayName: string;
    logoUrl?: string;
    config?: Record<string, unknown>;
  } | null;
  onUpdateStep: (
    stepId: string,
    updates: Partial<StepSettingsProps["step"]>
  ) => void;
  onConnectionModalOpen: (piece: ActivePiece) => void;
}

const getExistingSourceCode = (
  step: StepSettingsProps["step"]
): string | undefined => {
  if (!step?.config) return undefined;
  const config = step.config as Record<string, unknown>;
  if (
    config.sourceCode &&
    typeof config.sourceCode === "object" &&
    config.sourceCode !== null &&
    typeof (config.sourceCode as Record<string, unknown>).code === "string"
  ) {
    return (config.sourceCode as Record<string, unknown>).code as string;
  }
  return undefined;
};

export default function StepSettings({
  isOpen,
  onClose,
  step,
  onUpdateStep,
  onConnectionModalOpen,
}: StepSettingsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [topSectionHeight, setTopSectionHeight] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceCode, setSourceCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>(
    step?.displayName || ""
  );
  const [token, setToken] = useState<string>("");
  // Placeholder: info fetch disabled for now
  // Metadata panel removed; using sample data instead
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleResponse, setSampleResponse] = useState<unknown>(null);
  const currentProject = useContextStore((s) => s.currentProject);

  const loadConnections = useCallback(async () => {
    if (!step?.pieceName || !currentProject?.id) return;
    try {
      setIsLoadingConnections(true);
      const url = `/projects/${currentProject.id}/app-connections`;
      const response = await http.get<{ connections: Connection[] }>(url);
      const allConnections = response.data.connections || [];
      const filteredConnections = allConnections.filter(
        (c) => c.pieceName === step.pieceName
      );
      setConnections(filteredConnections);
    } catch (error) {
      console.error("Failed to load connections:", error);
      toastError(
        "Failed to load connections",
        "Unable to fetch connections for this piece"
      );
    } finally {
      setIsLoadingConnections(false);
    }
  }, [step?.pieceName, currentProject?.id]);

  useEffect(() => {
    if (isOpen && step?.pieceName) {
      loadConnections();
    }
  }, [isOpen, step?.pieceName, loadConnections, step]);
  useEffect(() => {
    setDisplayName(step?.displayName || "");
  }, [step]);
  useEffect(() => {
    if (step?.type === "code") {
      // Initialize source code from config or use default
      const defaultCode =
        "export const code = async (inputs) => {\n  return { success: true };\n};";
      const existingCode = getExistingSourceCode(step) || defaultCode;
      setSourceCode(existingCode);
    }
  }, [step]);

  // Removed metadata fetch

  // Load sample data for bottom panel via SAVE_SAMPLE_DATA
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !step) return;
      let flowId: string | undefined;
      try {
        const stored = sessionStorage.getItem("zw_current_flow");
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string };
          if (parsed?.id) flowId = parsed.id;
        }
      } catch {
        /* noop */
      }
      if (!flowId) {
        const lastId = sessionStorage.getItem("zw_last_created_flow_id");
        if (lastId) flowId = lastId;
      }
      if (!flowId) return;
      const stepName = step.name || "trigger";
      const payload = {
        headers: { "content-type": "application/json" },
        body: { test: "data", items: [1, 2, 3] },
      } as Record<string, unknown>;
      try {
        setIsLoadingSample(true);
        const resp = await saveSampleData(flowId, stepName, payload);
        setSampleResponse(resp);
      } catch (error) {
        console.error("Failed to save sample data", error);
        setSampleResponse({ error: "Could not save sample data" });
      } finally {
        setIsLoadingSample(false);
      }
    };
    run();
  }, [isOpen, step]);

  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnection(connectionId);
    if (step)
      onUpdateStep(step.id, { config: { ...step.config, connectionId } });
  };

  const fetchPieceDetails = async (pieceName: string) => {
    try {
      const pieceIdentifier = pieceName.replace("@activepieces/piece-", "");
      const response = await fetch(
        "https://cloud.activepieces.com/api/v1/pieces"
      );
      const pieces = await response.json();
      const piece = pieces.find(
        (p: ActivePiece) =>
          p.name === pieceIdentifier ||
          p.name === pieceName ||
          `@activepieces/piece-${p.name}` === pieceName
      );
      return piece;
    } catch (error) {
      console.error("Failed to fetch piece details:", error);
      toastError(
        "Failed to load piece details",
        "Unable to fetch piece configuration"
      );
      return null;
    }
  };

  const handleCreateConnection = async () => {
    if (!step?.pieceName) return;
    const pieceDetails = await fetchPieceDetails(step.pieceName);
    const piece = pieceDetails || {
      id: step?.id || "",
      name: step?.pieceName || "",
      displayName: step?.displayName || "",
      logoUrl: step?.logoUrl || "",
      description: "",
      categories: [],
      actions: 0,
      triggers: 0,
    };
    onConnectionModalOpen(piece);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = document.getElementById("step-settings-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedHeight = Math.max(20, Math.min(90, newHeight));
      setTopSectionHeight(clampedHeight);
    },
    [isDragging]
  );
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen || !step) return null;

  return (
    <>
      <div className="h-full w-full bg-theme-form/95 backdrop-blur-md flex flex-col">
        <div
          id="step-settings-container"
          className={`flex-1 flex flex-col min-h-0 ${
            isDragging ? "cursor-row-resize" : ""
          }`}
        >
          <div
            className="flex flex-col min-h-0 border-b border-white/20 dark:border-white/10"
            style={{ height: `${topSectionHeight}%` }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center gap-3">
                {step.logoUrl && (
                  <img
                    src={step.logoUrl}
                    alt={step.displayName}
                    className="w-8 h-8 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/32x32?text=?";
                    }}
                  />
                )}
                <h2 className="text-lg font-semibold text-theme-primary truncate">
                  {step.displayName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-theme-input-focus rounded-xl transition-all duration-200"
              >
                <X size={20} className="text-theme-primary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              <div className="p-4 space-y-6">
                {step.type !== "trigger" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-theme-primary">
                        Connection
                      </h3>
                      <button
                        onClick={handleCreateConnection}
                        className="flex items-center gap-1 text-sm text-[#b3a1ff] hover:text-[#a08fff] transition-all duration-200"
                      >
                        <Plus size={14} />
                        Create
                      </button>
                    </div>
                    {isLoadingConnections ? (
                      <div className="text-sm text-theme-secondary">
                        Loading connections...
                      </div>
                    ) : connections.length === 0 ? (
                      <div className="text-center py-4">
                        <div className="text-sm text-theme-secondary mb-3">
                          No connections available for this piece
                        </div>
                        <button
                          onClick={handleCreateConnection}
                          className="px-3 py-1 text-sm bg-[#b3a1ff] text-white rounded-xl hover:bg-[#a08fff] transition-all duration-200"
                        >
                          Create Connection
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {connections.map((connection) => (
                          <button
                            key={connection.id}
                            onClick={() =>
                              handleConnectionSelect(connection.id)
                            }
                            className={`w-full p-3 text-left border rounded-xl transition-all duration-200 ${
                              selectedConnection === connection.id
                                ? "border-[#b3a1ff] bg-[#b3a1ff]/10"
                                : "border-white/20 dark:border-white/10 hover:bg-theme-input-focus"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {connection.metadata?.pieceLogoUrl && (
                                <img
                                  src={connection.metadata.pieceLogoUrl}
                                  alt={connection.displayName}
                                  className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://via.placeholder.com/32x32?text=?";
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-theme-primary truncate">
                                  {connection.displayName}
                                </div>
                                <div className="text-sm text-theme-secondary">
                                  Created:{" "}
                                  {new Date(
                                    connection.created
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-theme-primary mb-3">
                    Configuration
                  </h3>
                  <div className="space-y-3">
                    {step.type === "trigger" ? (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Token
                        </label>
                        <input
                          type="text"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="secret-webhook-token"
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    )}
                    {step.type === "code" && (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Source Code
                        </label>
                        <textarea
                          value={sourceCode}
                          onChange={(e) => setSourceCode(e.target.value)}
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200 font-mono text-xs"
                          rows={8}
                          placeholder="export const code = async (inputs) => {&#10;  return { success: true };&#10;};"
                        />
                      </div>
                    )}
                    <div className="pt-2">
                      <button
                        disabled={
                          !step ||
                          (step.type === "trigger"
                            ? token.trim().length === 0
                            : step.type === "code"
                            ? displayName.trim() ===
                                (step.displayName || "").trim() &&
                              sourceCode.trim() ===
                                (
                                  getExistingSourceCode(step) ||
                                  "export const code = async (inputs) => {\n  return { success: true };\n};"
                                ).trim()
                            : displayName.trim() ===
                              (step.displayName || "").trim())
                        }
                        onClick={async () => {
                          if (!step) return;
                          try {
                            const stored =
                              sessionStorage.getItem("zw_current_flow");
                            const parsed = stored
                              ? (JSON.parse(stored) as { id?: string })
                              : undefined;
                            if (!parsed?.id) {
                              toastError(
                                "No flow selected",
                                "Open a flow before saving"
                              );
                              return;
                            }

                            if (step.type === "trigger") {
                              await createWebhookTrigger(
                                parsed.id,
                                token.trim()
                              );
                              setToken("");
                              toastSuccess(
                                "Webhook configured",
                                "Token saved and webhook trigger created"
                              );
                            } else if (step.type === "code") {
                              // For code nodes, use UPDATE_ACTION API
                              const requestBody: Record<string, unknown> = {
                                type: "CODE",
                                name: step.name || "code_step_1",
                                valid: true,
                                settings: {
                                  input: {},
                                },
                              };

                              // Only include changed fields
                              if (
                                displayName.trim() !==
                                (step.displayName || "").trim()
                              ) {
                                requestBody.displayName = displayName;
                              } else {
                                requestBody.displayName =
                                  "Updated Process Data";
                              }

                              const existingCode =
                                getExistingSourceCode(step) ||
                                "export const code = async (inputs) => {\n  return { success: true };\n};";
                              if (sourceCode.trim() !== existingCode.trim()) {
                                (
                                  requestBody.settings as Record<
                                    string,
                                    unknown
                                  >
                                ).sourceCode = { code: sourceCode };
                              }

                              await updateAction(
                                parsed.id,
                                requestBody as Parameters<
                                  typeof updateAction
                                >[1]
                              );
                              onUpdateStep(step.id, {
                                displayName: displayName,
                                config: {
                                  ...step.config,
                                  sourceCode: { code: sourceCode },
                                },
                              });
                              toastSuccess(
                                "Code updated",
                                "Code has been updated successfully"
                              );
                            } else {
                              // For other nodes, use changeWorkflowName API
                              await changeWorkflowName(parsed.id, {
                                displayName,
                              });
                              onUpdateStep(step.id, { displayName });
                              toastSuccess(
                                "Name updated",
                                "Display name has been updated successfully"
                              );
                            }
                          } catch (e) {
                            console.error("Failed to save", e);
                            toastError(
                              "Update failed",
                              "Could not save changes"
                            );
                          }
                        }}
                        className="px-3 py-2 bg-theme-primary text-theme-inverse text-xs font-medium rounded-xl hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                    {step.config && Object.keys(step.config).length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Configuration
                        </label>
                        <div className="bg-theme-input/50 p-3 rounded-xl border border-white/20 dark:border-white/10">
                          <pre className="text-xs text-theme-secondary overflow-auto">
                            {JSON.stringify(step.config, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="h-1 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-row-resize flex items-center justify-center relative transition-all duration-200"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-8 bg-theme-primary/50 rounded-full hover:bg-theme-primary transition-all duration-200"></div>
            </div>
          </div>
          <div
            className="flex flex-col min-h-0"
            style={{ height: `${100 - topSectionHeight}%` }}
          >
            <div className="flex-shrink-0 p-4 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-theme-primary">
                  Sample Data
                </h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              <div className="p-4 space-y-4">
                {isLoadingSample ? (
                  <div className="text-sm text-theme-secondary">
                    Loading sample data...
                  </div>
                ) : (
                  <div className="bg-theme-input/50 p-3 rounded-xl border border-white/20 dark:border-white/10">
                    <pre className="text-xs text-theme-secondary overflow-auto">
                      {JSON.stringify(sampleResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
