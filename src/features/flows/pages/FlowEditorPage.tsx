import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import "../../../styles/flow-editor.css";

import { useWorkflow } from "../hooks/useWorkflow";
import type {
  FlowPiece,
  FlowPieceAction,
  FlowPieceTrigger,
} from "../components/FlowPieceSelector";
const FlowPieceSelector = React.lazy(
  () => import("../components/FlowPieceSelector")
);
const StepSettingsLazy = React.lazy(
  () => import("../components/StepSettings")
);
import DataSelectorModal from "../components/DataSelectorModal";
const ConnectionSetupModalLazy = React.lazy(
  () => import("../../connections/components/ConnectionSetupModal")
);
import { nodeTypes } from "../components/nodeTypes";
import { edgeTypes } from "../components/edgeTypes";
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  ChevronDown,
  Rocket,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { ThemeToggle } from "../../../components/ui";
import { toastSuccess } from "../../../components/ui/Toast";
import {
  validateWorkflow,
  listFlowVersions,
  lockAndPublish,
  changeStatus,
  updateWebhookTrigger,
} from "../services/flowService";
// import type { Connection } from '../../../types/connection'

export default function FlowEditorPage() {
  const navigate = useNavigate();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEmptyNode,
    addNodeBetween,
    addPieceNode,
    updateNodeData,
    deleteNode,
    duplicateNode,
    swapNodeAbove,
    swapNodeBelow,
    saveWorkflow,
    runWorkflow,
    isRunning,
    isDirty,
    setReactFlowInstance,
    reactFlowInstance,
    addRouterNode,
    removeEdge,
    getRightMoveCandidates,
    getLeftMoveCandidates,
    addLoopNode,
    addCodeNode,
    loadWorkflow,
  } = useWorkflow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPieceSelectorOpen, setIsPieceSelectorOpen] = useState(false);
  const [isStepSettingsOpen, setIsStepSettingsOpen] = useState(false);
  const [pieceSelectorPosition, setPieceSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [showMoveAfterSubmenu, setShowMoveAfterSubmenu] = useState(false);
  const [showMoveBeforeSubmenu, setShowMoveBeforeSubmenu] = useState(false);
  const [moveAfterTimeout, setMoveAfterTimeout] = useState<number | null>(null);
  const [moveBeforeTimeout, setMoveBeforeTimeout] = useState<number | null>(
    null
  );
  const [splitWidth, setSplitWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isDataSelectorOpen, setIsDataSelectorOpen] = useState(false);
  type ConnectionPiece = {
    name: string;
    displayName: string;
    logoUrl?: string;
  };
  const [connectionPiece, setConnectionPiece] =
    useState<ConnectionPiece | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isFlowEnabled, setIsFlowEnabled] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string | null>(
    null
  );
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const memoEdgeTypes = useMemo(() => edgeTypes, []);

  useEffect(() => {
    // Initialize toggle from stored flow status (existing or newly created)
    try {
      const stored = sessionStorage.getItem("zw_current_flow");
      if (stored) {
        const parsed = JSON.parse(stored) as { status?: string };
        if (typeof parsed?.status === "string")
          setIsFlowEnabled(parsed.status === "ENABLED");
        else setIsFlowEnabled(false);
      } else {
        const lastId = sessionStorage.getItem("zw_last_created_flow_id");
        if (lastId) setIsFlowEnabled(false);
      }
    } catch {
      /* noop */
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    const handlePopState = () => {
      if (isDirty) {
        window.history.pushState(null, "", window.location.pathname);
        setShowUnsavedWarning(true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  // Close Data Selector when Step Settings closes
  useEffect(() => {
    if (!isStepSettingsOpen) setIsDataSelectorOpen(false);
  }, [isStepSettingsOpen]);

  // Validate workflow on mount; only then proceed to other operations
  useEffect(() => {
    let didRun = false;
    const run = async () => {
      if (didRun) return;
      didRun = true;
      try {
        // If opened via existing flow, fetch versions
        const storedExisting = sessionStorage.getItem("zw_current_flow");
        if (storedExisting) {
          const parsed = JSON.parse(storedExisting) as { id?: string };
          if (parsed?.id) {
            try {
              await listFlowVersions(parsed.id, 10);
            } catch {
              /* noop */
            }
          }
        }
        const validation = await validateWorkflow({
          flowData: {
            trigger: {
              type: "WEBHOOK",
              name: "webhook_trigger",
              displayName: "Webhook Trigger",
              valid: true,
              settings: { method: "POST", responseMode: "SYNC" },
            },
            nextAction: null,
          },
        });
        // Proceed regardless of validation result; log errors if any
        if (!validation.valid) {
          console.warn("Workflow validation failed", validation.errors);
        }
        // Set trigger using UPDATE_TRIGGER
        // Resolve flowId from current flow or last created id
        let flowIdForUpdate: string | undefined;
        try {
          const stored = sessionStorage.getItem("zw_current_flow");
          if (stored) flowIdForUpdate = (JSON.parse(stored) as { id?: string })?.id;
        } catch {
          /* noop */
        }
        if (!flowIdForUpdate) {
          const lastId = sessionStorage.getItem("zw_last_created_flow_id");
          if (lastId) flowIdForUpdate = lastId;
        }
        // Do not auto-update trigger on first load of create page; user will configure trigger manually
        // Build canvas from backend graph
        try {
          await loadWorkflow();
        } catch {
          /* noop */
        }
      } catch (e) {
        console.warn("Validation/initialization error", e);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed webhook-trigger GET on create page per request

  const handleBackToFlows = () => {
    if (isDirty) setShowUnsavedWarning(true);
    else navigate("/flows");
  };

  const handleNodeClick = useCallback(
    (
      event: React.MouseEvent,
      node: {
        id: string;
        data: { isEmpty?: boolean; label?: string; type?: string };
      }
    ) => {
      if (node.data.isEmpty) {
        // Don't open piece selector for loop, router, or code nodes
        const nodeType = node.data.type;
        if (
          nodeType === "loop" ||
          nodeType === "router" ||
          nodeType === "code"
        ) {
          setSelectedNodeId(node.id);
          setIsStepSettingsOpen(true);
          return;
        }
        setSelectedNodeId(node.id);
        const rect = (
          event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        setPieceSelectorPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10,
        });
        setIsPieceSelectorOpen(true);
      } else {
        setSelectedNodeId(node.id);
        setIsStepSettingsOpen(true);
      }
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { source: string; target: string }) => {
      addNodeBetween(edge.source, edge.target);
    },
    [addNodeBetween]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      event.preventDefault();
      const { clientX, clientY } = event;
      const menu = document.createElement("div");
      menu.className =
        "fixed z-50 bg-theme-form/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 py-1 min-w-[140px] animate-fade-in";
      menu.style.left = `${clientX}px`;
      menu.style.top = `${clientY}px`;
      const btn = document.createElement("button");
      btn.className =
        "w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors";
      btn.textContent = "Unconnect";
      btn.onclick = () => {
        removeEdge(edge.id);
        document.body.removeChild(menu);
      };
      menu.appendChild(btn);
      const cleanup = () => {
        if (document.body.contains(menu)) document.body.removeChild(menu);
        window.removeEventListener("click", cleanup);
      };
      window.addEventListener("click", cleanup);
      document.body.appendChild(menu);
    },
    [removeEdge]
  );

  const calculateMenuPosition = useCallback(
    (
      clientX: number,
      clientY: number,
      menuWidth: number = 160,
      menuHeight: number = 200
    ) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let x = clientX;
      let y = clientY;
      if (x + menuWidth > viewportWidth) x = clientX - menuWidth;
      if (y + menuHeight > viewportHeight) y = clientY - menuHeight;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      return { x, y };
    },
    []
  );

  const calculateSubmenuPosition = useCallback(() => {
    if (!contextMenu)
      return {
        left: "left-full" as const,
        top: "top-0" as const,
        ml: "ml-1" as const,
      };
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const submenuWidth = 200;
    const submenuHeight = 150;
    let left: "left-full" | "right-full" = "left-full";
    let top: "top-0" | "bottom-0" = "top-0";
    let ml: "ml-1" | "mr-1" = "ml-1";
    if (contextMenu.x + 160 + submenuWidth > viewportWidth) {
      left = "right-full";
      ml = "mr-1";
    }
    if (contextMenu.y + submenuHeight > viewportHeight) {
      top = "bottom-0";
    }
    return { left, top, ml };
  }, [contextMenu]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      const position = calculateMenuPosition(event.clientX, event.clientY);
      setContextMenu({
        visible: true,
        x: position.x,
        y: position.y,
        nodeId: node.id,
      });
    },
    [calculateMenuPosition]
  );

  const handleContextMenuAction = useCallback(
    (action: "duplicate" | "swapLeft" | "swapRight" | "delete") => {
      if (!contextMenu) return;
      const { nodeId } = contextMenu;
      switch (action) {
        case "duplicate":
          duplicateNode(nodeId);
          break;
        case "swapLeft":
          swapNodeAbove(nodeId);
          break;
        case "swapRight":
          swapNodeBelow(nodeId);
          break;
        case "delete":
          setConfirmDeleteNodeId(nodeId);
          break;
      }
      setContextMenu(null);
    },
    [contextMenu, duplicateNode, swapNodeAbove, swapNodeBelow]
  );

  const handleCanvasClick = useCallback(() => {
    setContextMenu(null);
    setShowMoveAfterSubmenu(false);
    setShowMoveBeforeSubmenu(false);
    setShowAddMenu(false);
    if (moveAfterTimeout) {
      clearTimeout(moveAfterTimeout);
      setMoveAfterTimeout(null);
    }
    if (moveBeforeTimeout) {
      clearTimeout(moveBeforeTimeout);
      setMoveBeforeTimeout(null);
    }
  }, [moveAfterTimeout, moveBeforeTimeout]);

  const handlePieceSelect = useCallback(
    (piece: FlowPiece, actionOrTrigger: FlowPieceAction | FlowPieceTrigger, selectType?: "action" | "trigger") => {
      if (selectedNodeId) {
        const selectedNode = nodes.find((n) => n.id === selectedNodeId);
        const hasIncoming = edges.some((e) => e.target === selectedNodeId);
        // Treat the first node (no incoming edges) as trigger regardless of current node.type
        const isTriggerNode = (selectedNode?.type === "trigger") || !hasIncoming;
        const isUtilityWebhook = piece.name === "webhook" && (actionOrTrigger as FlowPieceTrigger)?.name?.includes("webhook");
        const isAppPieceTrigger = selectType === "trigger" && piece.category === "apps";
        if (isTriggerNode && isUtilityWebhook) {
          try {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored ? (JSON.parse(stored) as { id?: string }) : undefined;
            const flowId = parsed?.id || sessionStorage.getItem("zw_last_created_flow_id") || "";
            if (flowId) {
              updateWebhookTrigger(String(flowId)).catch(() => {});
            }
          } catch {
            /* noop */
          }
        }
        if (isTriggerNode && isAppPieceTrigger) {
          try {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored ? (JSON.parse(stored) as { id?: string }) : undefined;
            const flowId = parsed?.id || sessionStorage.getItem("zw_last_created_flow_id") || "";
            if (flowId) {
              const fullPieceName = piece.name.startsWith("@activepieces/piece-") ? piece.name : `@activepieces/piece-${piece.name}`;
              import("../services/flowService").then(({ updatePieceTrigger }) => {
                updatePieceTrigger(String(flowId), {
                  name: "trigger",
                  displayName: "Piece Trigger",
                  pieceName: fullPieceName,
                  pieceVersion: piece.version || "latest",
                  triggerName: (actionOrTrigger as FlowPieceTrigger).name,
                }).catch(() => {});
              });
            }
          } catch {
            /* noop */
          }
        }
        // Only add as an action when not configuring the trigger node
        if (!isTriggerNode) {
          // Close Step Settings immediately when starting to add an action
          setIsStepSettingsOpen(false);
          addPieceNode(piece, actionOrTrigger, selectedNodeId);
        } else {
          // Update trigger node UI label and state
          updateNodeData(selectedNodeId, {
            label: selectType === "trigger" ? (actionOrTrigger as FlowPieceTrigger).displayName : selectedNode?.data?.label,
            isEmpty: false,
            type: "trigger",
            pieceName: piece.name,
            triggerName: (selectType === "trigger" ? (actionOrTrigger as FlowPieceTrigger).name : undefined) as unknown as string,
          } as unknown as { [key: string]: unknown });
        }
        setIsPieceSelectorOpen(false);
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId, addPieceNode, nodes, updateNodeData, edges]
  );

  const handleStepSettingsClose = useCallback(() => {
    setIsStepSettingsOpen(false);
    setSelectedNodeId(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = document.getElementById("flow-editor-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedWidth = Math.max(30, Math.min(80, newWidth));
      setSplitWidth(clampedWidth);
      const reactFlowElement = container.querySelector(".react-flow");
      if (reactFlowElement) window.dispatchEvent(new Event("resize"));
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
  useEffect(() => {
    if (reactFlowInstance) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 1.5 });
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [splitWidth, reactFlowInstance]);
  const handleStepUpdate = useCallback(
    (
      stepId: string,
      updates: Partial<{
        id: string;
        name: string;
        type: "trigger" | "action" | "code" | "loop" | "router";
        pieceName?: string;
        actionName?: string;
        triggerName?: string;
        displayName: string;
        logoUrl?: string;
        config?: Record<string, unknown>;
      } | null>
    ) => {
      updateNodeData(stepId, updates as Record<string, unknown>);
    },
    [updateNodeData]
  );
  const handleConnectionModalOpen = useCallback((piece: ConnectionPiece) => {
    setConnectionPiece(piece);
    setShowConnectionModal(true);
  }, []);
  const handleConnectionModalClose = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionPiece(null);
  }, []);
  const handleConnectionCreated = useCallback(() => {
    handleConnectionModalClose();
  }, [handleConnectionModalClose]);
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="h-screen w-full flex flex-col bg-theme-background relative overflow-hidden">
      <div className="sticky top-0 z-10 h-[7vh] max-h-[10vh] flex items-center w-full border-b border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-4 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToFlows}
              className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft size={16} className="m-0 p-0" />
              <span className="font-medium text-sm">Back to Flows</span>
            </button>
            <div className="h-6 w-px bg-white/20 dark:bg-white/10" />
            <h1 className="text-md font-semibold text-theme-primary">
              Flow Editor
            </h1>
            {isDirty && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fbbf24]/20 text-[#d97706] border border-[#fbbf24]/30">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="button" />
            <button
              onClick={async () => {
                if (isToggleLoading) return;
                setIsToggleLoading(true);
                try {
                  const stored = sessionStorage.getItem("zw_current_flow");
                  const parsed = stored
                    ? (JSON.parse(stored) as { id?: string })
                    : undefined;
                  const flowId = parsed?.id;
                  if (!flowId) {
                    // toastError("Status change failed", "Missing flow id");
                    return;
                  }
                  const newStatus = isFlowEnabled ? "DISABLED" : "ENABLED";
                  await changeStatus(flowId, { status: newStatus });
                  setIsFlowEnabled(!isFlowEnabled);
                  try {
                    toastSuccess(
                      `Flow ${newStatus.toLowerCase()}`,
                      `Flow has been ${newStatus.toLowerCase()} successfully`
                    );
                  } catch {
                    /* noop */
                  }
                } catch {
                  // const errorMessage =
                  //   error instanceof Error
                  //     ? error.message
                  //     : "Could not change flow status";
                  // toastError("Status change failed", errorMessage);
                } finally {
                  setIsToggleLoading(false);
                }
              }}
              disabled={isToggleLoading}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFlowEnabled
                  ? "bg-[#10b981] text-white hover:bg-[#059669] focus:ring-[#10b981]/20"
                  : "bg-[#6b7280] text-white hover:bg-[#4b5563] focus:ring-[#6b7280]/20"
              }`}
            >
              {isToggleLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isFlowEnabled ? (
                <ToggleRight size={15} />
              ) : (
                <ToggleLeft size={15} />
              )}
              {isToggleLoading
                ? "Loading..."
                : isFlowEnabled
                ? "Enabled"
                : "Disabled"}
            </button>
            <button
              onClick={() => saveWorkflow()}
              className="px-3 py-2 bg-theme-primary text-theme-inverse text-xs font-medium rounded-xl hover:bg-[#a08fff] transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
            >
              <Save size={15} className="inline mr-1" />
              Save
            </button>
            {/* <button
              onClick={async () => {
                try {
                  const stored = sessionStorage.getItem("zw_current_flow");
                  const parsed = stored
                    ? (JSON.parse(stored) as { id?: string })
                    : undefined;
                  const flowId = parsed?.id;
                  if (!flowId) {
                  // toastError("Test failed", "Missing flow id");
                    return;
                  }
                  const baseUrl = (import.meta.env.VITE_BACKEND_API_URL || import.meta.env.BACKEND_API_URL || "").replace(/\/$/, "") || window.location.origin;
                  const nowIso = new Date().toISOString();
                  const body = {
                    test: true,
                    event: "test_trigger",
                    message: "Testing webhook functionality",
                    timestamp: nowIso,
                    data: {
                      userId: "test-user-123",
                      action: "webhook_test",
                      environment: baseUrl,
                      flowId,
                    },
                  };
                  const resp = await testFlowWebhook(flowId, body);
                  toastSuccess("Flow test sent", "Webhook test executed");
                  try {
                    console.debug("[Test flow] response", resp);
                  } catch {
                    /* noop *
                  }
                } catch {
                  // toastError("Test failed", "Could not execute flow test");
                }
              }}
              className="px-3 py-2 bg-[#c7d2fe] text-[#111827] text-xs font-medium rounded-xl hover:bg-[#a5b4fc] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c7d2fe]/20"
            >
              <Play size={15} className="inline mr-1" />
              Test flow
            </button>*/}
            <button
              onClick={async () => {
                try {
                  const stored = sessionStorage.getItem("zw_current_flow");
                  const parsed = stored
                    ? (JSON.parse(stored) as { id?: string })
                    : undefined;
                  const flowId = parsed?.id;
                  if (!flowId) {
                    // toastError("Publish failed", "Missing flow id");
                    return;
                  }
                  await lockAndPublish(flowId, { status: "ENABLED" });
                  try {
                    toastSuccess(
                      "Published",
                      "Flow has been locked and published"
                    );
                  } catch {
                    /* noop */
                  }
                } catch {
                  // toastError("Publish failed", "Could not publish flow");
                }
              }}
              className="px-3 py-2 bg-[#22d3ee] text-[#0b132b] text-xs font-medium rounded-xl hover:bg-[#06b6d4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#22d3ee]/20"
            >
              <Rocket size={15} className="inline mr-1" />
              Publish
            </button>
            <button
              onClick={() => runWorkflow()}
              disabled={isRunning}
              className="px-3 py-2 bg-[#a4f5a6] text-[#222222] text-xs font-medium rounded-xl hover:bg-[#8dff8d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#a4f5a6]/20"
            >
              <Play size={15} className="inline mr-1" />
              {isRunning ? "Running..." : "Run"}
            </button>
          </div>
        </div>
      </div>

      <div
        id="flow-editor-container"
        className={`flex-1 relative min-h-0 ${isDragging ? "cursor-col-resize" : ""}`}
      >
        <div className="flex h-full">
          <div
            className="relative"
            style={{ width: isStepSettingsOpen ? `${splitWidth}%` : "100%" }}
          >
            <div className="absolute top-4 left-4 z-10">
              <div className="relative inline-block text-left">
                <button
                  onClick={() => setShowAddMenu((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl shadow-sm hover:bg-theme-input-focus transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                >
                  <Plus size={16} className="text-theme-primary" />
                  <span className="text-sm font-medium text-theme-primary">
                    Add Node
                  </span>
                  <ChevronDown size={14} className="text-theme-secondary" />
                </button>
                {showAddMenu && (
                  <div className="absolute mt-2 w-40 rounded-xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg py-1">
                    <button
                      onClick={() => {
                        addEmptyNode();
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-input-focus"
                    >
                      Empty Node
                    </button>
                    <button
                      onClick={() => {
                        addRouterNode();
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-input-focus"
                    >
                      Router
                    </button>
                    <button
                      onClick={() => {
                        addLoopNode();
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-input-focus"
                    >
                      Loop
                    </button>
                    <button
                      onClick={() => {
                        addCodeNode();
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-input-focus"
                    >
                      Code
                    </button>
                  </div>
                )}
              </div>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onEdgeContextMenu={handleEdgeContextMenu}
              onNodeContextMenu={handleContextMenu}
              onPaneClick={handleCanvasClick}
              onInit={setReactFlowInstance}
              nodeTypes={memoNodeTypes}
              edgeTypes={memoEdgeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              translateExtent={[
                [-5000, -5000],
                [5000, 5000],
              ]}
              nodeExtent={[
                [-4500, -4500],
                [4500, 4500],
              ]}
              style={{ width: "100%", height: "100%" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {isStepSettingsOpen && (
            <div
              className="w-1 min-w-[4px] bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-col-resize flex items-center justify-center relative transition-colors duration-200"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-8 bg-theme-primary/50 rounded-full hover:bg-theme-primary transition-colors duration-200"></div>
              </div>
            </div>
          )}

          {isStepSettingsOpen && selectedNode && (
            <div
              className="bg-theme-form/95 backdrop-blur-md border-l border-white/20 dark:border-white/10 h-full min-h-0 overflow-hidden"
              style={{ width: `${100 - splitWidth}%` }}
            >
              <React.Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center text-theme-secondary">
                    Loading settings...
                  </div>
                }
              >
                <StepSettingsLazy
                  isOpen={isStepSettingsOpen}
                  step={{
                    id: selectedNode.id,
                    name: selectedNode.data.name || selectedNode.data.label,
                    type:
                      selectedNode.data.type === "trigger"
                        ? "trigger"
                        : selectedNode.data.type === "code"
                        ? "code"
                        : selectedNode.data.type === "loop"
                        ? "loop"
                        : selectedNode.data.type === "router"
                        ? "router"
                        : "action",
                    pieceName: selectedNode.data.pieceName,
                    actionName: selectedNode.data.actionName,
                    triggerName: selectedNode.data.triggerName,
                    displayName: selectedNode.data.label,
                    logoUrl: selectedNode.data.logoUrl,
                    config: selectedNode.data.config,
                  }}
                  onClose={handleStepSettingsClose}
                  onUpdateStep={handleStepUpdate}
                  onConnectionModalOpen={handleConnectionModalOpen}
                onOpenDataSelector={() => setIsDataSelectorOpen(true)}
                />
              </React.Suspense>
            </div>
          )}
        </div>

        {contextMenu && (
          <div
            className="fixed z-50 bg-theme-form/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleContextMenuAction("duplicate")}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              Duplicate
            </button>
            <button
              onClick={() => handleContextMenuAction("swapLeft")}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              Swap Left
            </button>
            <button
              onClick={() => handleContextMenuAction("swapRight")}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              Swap Right
            </button>
            <div className="relative">
              <button
                onMouseEnter={() => {
                  if (moveAfterTimeout) {
                    clearTimeout(moveAfterTimeout);
                    setMoveAfterTimeout(null);
                  }
                  setShowMoveAfterSubmenu(true);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setShowMoveAfterSubmenu(false);
                  }, 300);
                  setMoveAfterTimeout(timeout);
                }}
                className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2 justify-between"
              >
                Move Right
              </button>
              {showMoveAfterSubmenu && contextMenu && (
                <div
                  className={`absolute ${calculateSubmenuPosition().left} ${
                    calculateSubmenuPosition().top
                  } ${
                    calculateSubmenuPosition().ml
                  } bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg shadow-lg min-w-[240px] z-50`}
                  onMouseEnter={() => {
                    if (moveAfterTimeout) {
                      clearTimeout(moveAfterTimeout);
                      setMoveAfterTimeout(null);
                    }
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setShowMoveAfterSubmenu(false);
                    }, 300);
                    setMoveAfterTimeout(timeout);
                  }}
                >
                  {(() => {
                    const candidates = getRightMoveCandidates(
                      contextMenu.nodeId
                    );
                    if (candidates.length === 0)
                      return (
                        <div className="px-4 py-2 text-sm text-theme-secondary">
                          No nodes available
                        </div>
                      );
                    return candidates.slice(0, 4).map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      return (
                        <button
                          key={nodeId}
                          onClick={() => {
                            /* Implemented separately */ setContextMenu(null);
                            setShowMoveAfterSubmenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors"
                        >
                          {node?.data.label ||
                            node?.data.name ||
                            `Node ${nodeId.slice(-4)}`}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onMouseEnter={() => {
                  if (moveBeforeTimeout) {
                    clearTimeout(moveBeforeTimeout);
                    setMoveBeforeTimeout(null);
                  }
                  setShowMoveBeforeSubmenu(true);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setShowMoveBeforeSubmenu(false);
                  }, 300);
                  setMoveBeforeTimeout(timeout);
                }}
                className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2 justify-between"
              >
                Move Left
              </button>
              {showMoveBeforeSubmenu && contextMenu && (
                <div
                  className={`absolute ${calculateSubmenuPosition().left} ${
                    calculateSubmenuPosition().top
                  } ${
                    calculateSubmenuPosition().ml
                  } bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg shadow-lg min-w-[240px] z-50`}
                  onMouseEnter={() => {
                    if (moveBeforeTimeout) {
                      clearTimeout(moveBeforeTimeout);
                      setMoveBeforeTimeout(null);
                    }
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setShowMoveBeforeSubmenu(false);
                    }, 300);
                    setMoveBeforeTimeout(timeout);
                  }}
                >
                  {(() => {
                    const candidates = getLeftMoveCandidates(
                      contextMenu.nodeId
                    );
                    if (candidates.length === 0)
                      return (
                        <div className="px-4 py-2 text-sm text-theme-secondary">
                          No nodes available
                        </div>
                      );
                    return candidates.slice(0, 4).map((nodeId) => {
                      const node = nodes.find((n) => n.id === nodeId);
                      return (
                        <button
                          key={nodeId}
                          onClick={() => {
                            /* Implemented separately */ setContextMenu(null);
                            setShowMoveBeforeSubmenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors"
                        >
                          {node?.data.label ||
                            node?.data.name ||
                            `Node ${nodeId.slice(-4)}`}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <div className="border-t border-white/20 dark:border-white/10 my-1"></div>
            <button
              onClick={() => handleContextMenuAction("delete")}
              className="w-full px-4 py-2 text-left text-sm text-[#ef4a45] hover:bg-[#ef4a45]/10 transition-colors flex items-center gap-2"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isPieceSelectorOpen && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="px-4 py-2 rounded-xl bg-theme-form/95 border border-white/20 dark:border-white/10 text-theme-secondary shadow-lg">
                Loading pieces...
              </div>
            </div>
          }
        >
          <FlowPieceSelector
            isOpen={isPieceSelectorOpen}
            onClose={() => {
              setIsPieceSelectorOpen(false);
              setSelectedNodeId(null);
            }}
            onSelectPiece={handlePieceSelect}
            type={selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId)?.type === "trigger" ? "trigger" : "action") : "action"}
            nodePosition={pieceSelectorPosition}
          />
        </React.Suspense>
      )}
      <DataSelectorModal
        isOpen={isDataSelectorOpen}
        onClose={() => setIsDataSelectorOpen(false)}
        previousNodes={(function getPrev(){
          const prev: Array<{ id: string; displayName: string; stepName?: string }> = [];
          try {
            const nodesList = (reactFlowInstance?.getNodes?.() as Array<{ id: string; data?: { label?: string; name?: string } }>) || [];
            const selectedIdx = selectedNodeId ? nodesList.findIndex((n) => n.id === selectedNodeId) : -1;
            const upto = selectedIdx >= 0 ? selectedIdx : nodesList.length;
            type NodeLite = { id: string; data?: { label?: string; name?: string } };
            (nodesList as NodeLite[]).slice(0, upto).forEach((n) => {
              const label = n?.data?.label;
              if (n && n.id && typeof label === "string") {
                prev.push({ id: n.id, displayName: label, stepName: n?.data?.name || n.id });
              }
            });
          } catch { /* noop */ }
          return prev;
        })()}
      />
      {showConnectionModal && connectionPiece && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="px-4 py-2 rounded-xl bg-theme-form/95 border border-white/20 dark:border-white/10 text-theme-secondary shadow-lg">
                Loading connection...
              </div>
            </div>
          }
        >
          <ConnectionSetupModalLazy
            isOpen={showConnectionModal}
            onClose={handleConnectionModalClose}
            piece={{
              id: connectionPiece.name,
              name: connectionPiece.name,
              displayName: connectionPiece.displayName,
              logoUrl:
                connectionPiece.logoUrl ||
                "https://via.placeholder.com/32x32?text=?",
              description: "",
              categories: [],
              actions: 0,
              triggers: 0,
            }}
            onConnectionCreated={handleConnectionCreated}
          />
        </React.Suspense>
      )}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">
                Unsaved Changes
              </h3>
              <p className="mt-1 text-sm text-theme-secondary">
                You have unsaved changes that will be lost if you continue. Are
                you sure you want to leave?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-colors hover:bg-theme-input-focus"
                onClick={() => setShowUnsavedWarning(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  navigate("/flows");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] focus:outline-none focus:ring-2 focus:ring-[#ef4a45]/20"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-theme-primary">
              Delete node?
            </h3>
            <p className="text-sm text-theme-secondary mt-1">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteNodeId(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-colors hover:bg-theme-input-focus"
                disabled={isDeletingNode}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirmDeleteNodeId) return;
                  setIsDeletingNode(true);
                  try {
                    deleteNode(confirmDeleteNodeId);
                    setConfirmDeleteNodeId(null);
                  } catch {
                    // const message =
                    //   error instanceof Error
                    //     ? error.message
                    //     : "Failed to delete node";
                    // toastError("Delete failed", message);
                  } finally {
                    setIsDeletingNode(false);
                  }
                }}
                disabled={isDeletingNode}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-60"
              >
                {isDeletingNode ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
