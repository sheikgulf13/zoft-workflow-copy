import { useState, useCallback, useRef } from "react";
import { addEdge, useNodesState, useEdgesState } from "reactflow";
import type { Node, Edge, Connection, ReactFlowInstance } from "reactflow";
import { toastError, toastSuccess } from "../../../components/ui/Toast";
import type { WorkflowNodeData } from "../components/CustomNodes";
type NodeType =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "router"
  | "routerBranch"
  | "code"
  | "loop";
import type {
  FlowPiece,
  FlowPieceAction,
  FlowPieceTrigger,
} from "../components/FlowPieceSelector";
import {
  addActionAfter,
  addActionUnderTrigger,
  duplicateAction,
  deleteAction,
  duplicateBranch,
  deleteBranch,
  markVersionAsDraft,
  getFlowVersionGraph,
} from "../services/flowService";
import type { AddActionRequest } from "../types/operations.types";

export interface WorkflowState {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  isRunning: boolean;
  isDirty: boolean;
}

export function useWorkflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const HORIZONTAL_GAP = 300;

  const slugify = useCallback(
    (text: string) =>
      text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48),
    []
  );

  const generateUniqueStepName = useCallback(
    (base: string) => {
      const existingNames = new Set(
        nodes
          .map((n) => (n.data as Partial<WorkflowNodeData>)?.name)
          .filter(Boolean) as string[]
      );
      const normalized = slugify(base || "step");
      if (!existingNames.has(normalized)) return normalized;
      let i = 1;
      let candidate = `${normalized}_${i}`;
      while (existingNames.has(candidate)) {
        i += 1;
        candidate = `${normalized}_${i}`;
      }
      return candidate;
    },
    [nodes, slugify]
  );

  const generateNodeId = useCallback(
    () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  const initializeWorkflow = useCallback(() => {
    const triggerId = generateNodeId();
    const actionId = generateNodeId();
    const initialNodes: Node<WorkflowNodeData>[] = [
      {
        id: triggerId,
        type: "trigger",
        position: { x: 400, y: 100 },
        data: {
          label: "Webhook Trigger",
          type: "trigger",
          status: "idle",
          isEmpty: false,
          name: "webhook",
        },
      },
      {
        id: actionId,
        type: "action",
        position: { x: 400 + HORIZONTAL_GAP, y: 100 },
        data: {
          label: "2. Add Action",
          type: "action",
          status: "idle",
          isEmpty: true,
        },
      },
    ];
    // Assign deterministic unique names on create page only
    try {
      const isCreatePage =
        typeof window !== "undefined" &&
        window.location.pathname.includes("/flows/create");
      if (isCreatePage) {
        const uniqueTriggerName = generateUniqueStepName("trigger");
        initialNodes[0].data = {
          ...initialNodes[0].data,
          name: uniqueTriggerName,
        };
        const uniqueSecondName = generateUniqueStepName("action");
        initialNodes[1].data = {
          ...initialNodes[1].data,
          name: uniqueSecondName,
        };
      }
    } catch {
      // noop: best-effort assignment based on location
    }
    const initialEdges: Edge[] = [
      {
        id: `edge-${triggerId}-${actionId}`,
        source: triggerId,
        target: actionId,
        type: "custom",
      },
    ];
    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsDirty(false);
  }, [generateNodeId, setNodes, setEdges, generateUniqueStepName]);

  useState(() => {
    initializeWorkflow();
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const sourceId = (params as Connection).source;
      if (!sourceId) return;
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return;
      // Ensure parent itself is connected (unless it's the trigger)
      if (sourceNode.type !== "trigger") {
        const hasIncoming = edges.some((e) => e.target === sourceId);
        if (!hasIncoming) {
          try {
            toastError(
              "Connect parent first",
              "Parent node must be connected (except trigger)."
            );
          } catch {
            /* noop */
          }
          setNodes((nds) =>
            nds.map((n) =>
              n.id === sourceId
                ? { ...n, data: { ...n.data, status: "error" } }
                : n
            )
          );
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === sourceId
                  ? { ...n, data: { ...n.data, status: "idle" } }
                  : n
              )
            );
          }, 800);
          return;
        }
      }

      if (sourceNode.type !== "router") {
        const existingOutgoing = edges.filter(
          (e) => e.source === sourceId
        ).length;
        if (existingOutgoing >= 2) {
          // visual and toast feedback
          try {
            toastError(
              "Branch limit reached",
              "This node can have at most 2 branches."
            );
          } catch {
            /* noop */
          }
          setNodes((nds) =>
            nds.map((n) =>
              n.id === sourceId
                ? { ...n, data: { ...n.data, status: "error" } }
                : n
            )
          );
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === sourceId
                  ? { ...n, data: { ...n.data, status: "idle" } }
                  : n
              )
            );
          }, 800);
          return;
        }
      }
      const newEdge = { ...params, type: "custom" };
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);

      // When connecting to a loop node, add LOOP action after the parent
      try {
        const loopTargetId = (params as Connection).target;
        if (loopTargetId) {
          const loopTarget = nodes.find((n) => n.id === loopTargetId);
          if (loopTarget && loopTarget.type === "loop") {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored
              ? (JSON.parse(stored) as { id?: string })
              : undefined;
            const flowId = parsed?.id;
            if (flowId) {
              const parentIsTrigger2 = sourceNode.type === "trigger";
              const parentName2 = parentIsTrigger2
                ? "trigger"
                : (sourceNode.data as Partial<WorkflowNodeData>)?.name ||
                  sourceNode.id;
              const loopName =
                (loopTarget.data as Partial<WorkflowNodeData>)?.name ||
                "loop_1";
              const loopPayload: AddActionRequest["action"] = {
                type: "LOOP_ON_ITEMS",
                name: String(loopName),
                displayName: "Process Each Item",
                valid: true,
                settings: {
                  items: "{{trigger.body.items}}",
                  loopIndexName: "index",
                  loopItemName: "item",
                } as unknown as AddActionRequest["action"]["settings"],
              };
              addActionAfter(
                flowId,
                String(parentName2),
                "AFTER",
                loopPayload
              ).catch(() => {
                try {
                  toastError("Loop add failed", "Could not add loop action");
                } catch {
                  /* noop */
                }
              });
            }
          }
        }
      } catch {
        /* noop */
      }

      // When connecting to a code node, add CODE action after the parent
      try {
        const codeTargetId = (params as Connection).target;
        if (codeTargetId) {
          const codeTarget = nodes.find((n) => n.id === codeTargetId);
          if (codeTarget && codeTarget.type === "code") {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored
              ? (JSON.parse(stored) as { id?: string })
              : undefined;
            const flowId = parsed?.id;
            if (flowId) {
              const parentIsTrigger3 = sourceNode.type === "trigger";
              const parentName3 = parentIsTrigger3
                ? "trigger"
                : (sourceNode.data as Partial<WorkflowNodeData>)?.name ||
                  sourceNode.id;
              const codeName =
                (codeTarget.data as Partial<WorkflowNodeData>)?.name ||
                "code_step_1";
              const codePayload: AddActionRequest["action"] = {
                type: "CODE",
                name: String(codeName),
                displayName: "Process Data",
                valid: true,
                settings: {
                  sourceCode: {
                    code: "export const code = async (inputs) => {\n  return { success: true };\n};",
                  },
                  input: {},
                } as unknown as AddActionRequest["action"]["settings"],
              };
              addActionAfter(
                flowId,
                String(parentName3),
                "AFTER",
                codePayload
              ).catch(() => {
                try {
                  toastError("Code add failed", "Could not add code action");
                } catch {
                  /* noop */
                }
              });
            }
          }
        }
      } catch {
        /* noop */
      }

      // When connecting to a router node, add ROUTER action after the parent
      try {
        const targetId = (params as Connection).target;
        if (!targetId) return;
        const targetNode = nodes.find((n) => n.id === targetId);
        if (!targetNode || targetNode.type !== "router") return;

        const stored = sessionStorage.getItem("zw_current_flow");
        const parsed = stored
          ? (JSON.parse(stored) as { id?: string })
          : undefined;
        const flowId = parsed?.id;
        if (!flowId) return;

        // Determine parent step name for API
        const parentIsTrigger = sourceNode.type === "trigger";
        const parentName = parentIsTrigger
          ? "trigger"
          : (sourceNode.data as Partial<WorkflowNodeData>)?.name ||
            sourceNode.id;

        const routerName =
          (targetNode.data as Partial<WorkflowNodeData>)?.name || "router";
        const actionPayload: AddActionRequest["action"] = {
          type: "ROUTER",
          name: String(routerName),
          displayName: "Route Based on Condition",
          valid: true,
          settings: {
            branches: [
              {
                branchName: "Success Path",
                branchType: "CONDITION",
                conditions: [
                  [
                    {
                      firstValue: `{{${parentName}.success}}`,
                      operator: "TEXT_EXACTLY_MATCHES",
                      secondValue: "true",
                    },
                  ],
                ],
              },
              { branchName: "Fallback", branchType: "FALLBACK" },
            ],
          } as unknown as AddActionRequest["action"]["settings"],
        };

        // Immediately create two router branch nodes and edges from route-1 and route-2 (UI-first, no revert on API failure)
        try {
          const isCreatePage =
            typeof window !== "undefined" &&
            window.location.pathname.includes("/flows/create");
          if (isCreatePage) {
            const handles = ["route-1", "route-2"];
            const branchByHandle: Record<
              string,
              { branchName: string; branchType: "CONDITION" | "FALLBACK" }
            > = {
              "route-1": {
                branchName: "Success Path",
                branchType: "CONDITION",
              },
              "route-2": { branchName: "Fallback", branchType: "FALLBACK" },
            };
            // Dedup: skip creating for handles that already have edges from this router
            type EdgeWithHandle = Edge & { sourceHandle?: string };
            const existingHandleSet = new Set(
              edges
                .map((e) => e as EdgeWithHandle)
                .filter(
                  (e) =>
                    e.source === targetId && typeof e.sourceHandle === "string"
                )
                .map((e) => String(e.sourceHandle))
            );
            const missingHandles = handles.filter(
              (h) => !existingHandleSet.has(h)
            );
            if (missingHandles.length === 0) return;

            const verticalOffset = 150; // distance below the router node
            const baseY = targetNode.position.y + verticalOffset;
            const xOffsetByHandle: Record<string, number> = {
              "route-1": -120,
              "route-2": 120,
            };

            const createdNodes: Array<{
              node: Node<WorkflowNodeData>;
              handle: string;
            }> = missingHandles.map((h) => {
              const def = branchByHandle[h] ?? {
                branchName: "Branch",
                branchType: "FALLBACK",
              };
              const nodeId = generateNodeId();
              const label = def.branchName;
              const uniqueName = generateUniqueStepName(
                `${String(routerName)}_${slugify(label)}`
              );
              const node: Node<WorkflowNodeData> = {
                id: nodeId,
                type: "routerBranch",
                position: {
                  x: targetNode.position.x + (xOffsetByHandle[h] || 0),
                  y: baseY,
                },
                data: {
                  label,
                  type: "routerBranch",
                  status: "idle",
                  isEmpty: true,
                  config: {
                    routerBranch: {
                      branchName: def.branchName,
                      branchType: def.branchType,
                    },
                  },
                  name: uniqueName,
                },
              } as Node<WorkflowNodeData>;
              return { node, handle: h };
            });

            setNodes((nds) => nds.concat(createdNodes.map((c) => c.node)));
            setEdges((eds) => [
              ...eds,
              ...createdNodes.map(
                (c) =>
                  ({
                    id: `edge-${targetId}-${c.node.id}`,
                    source: targetId,
                    target: c.node.id,
                    type: "custom",
                    data: { suppressPlus: true },
                    sourceHandle: c.handle,
                  } as Edge)
              ),
            ]);
            setIsDirty(true);
          }
        } catch {
          // swallow UI-only errors
        }

        // Fire API request, but do not block UI and do not rollback on failure
        addActionAfter(
          flowId,
          String(parentName),
          "AFTER",
          actionPayload
        ).catch(() => {
          try {
            toastError("Router add failed", "Could not add router action");
          } catch {
            /* noop */
          }
        });
      } catch {
        // swallow: non-fatal for UI
      }
    },
    [
      nodes,
      edges,
      setNodes,
      setEdges,
      generateNodeId,
      generateUniqueStepName,
      slugify,
    ]
  );

  const findGoodPosition = useCallback(
    (preferredPosition?: { x: number; y: number }) => {
      if (preferredPosition) return preferredPosition;
      if (nodes.length === 0) return { x: 150, y: 200 };
      // Place to the right of the most recently placed (rightmost) node, aligned horizontally
      const rightmostNode = nodes.reduce(
        (acc, n) => (n.position.x > acc.position.x ? n : acc),
        nodes[0]
      );
      return {
        x: rightmostNode.position.x + HORIZONTAL_GAP,
        y: rightmostNode.position.y,
      };
    },
    [nodes]
  );

  const addNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      const id = generateNodeId();
      const nodePosition = findGoodPosition(position);
      const newNode: Node<WorkflowNodeData> = {
        id,
        type,
        position: nodePosition,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          type,
          status: "idle",
          isEmpty: true,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
      return id;
    },
    [generateNodeId, findGoodPosition, setNodes]
  );

  const addPieceNode = useCallback(
    async (
      piece: FlowPiece,
      action: FlowPieceAction | FlowPieceTrigger,
      nodeId: string,
      position?: { x: number; y: number }
    ) => {
      // Optimistically mark the node as configured with label
      const existingNode = nodes.find((n) => n.id === nodeId);
      const baseName = slugify(
        (action as FlowPieceAction).name || piece.name || "action"
      );
      const nodeUniqueName =
        (existingNode?.data as Partial<WorkflowNodeData>)?.name ||
        generateUniqueStepName(baseName);
      const newNode: Node<WorkflowNodeData> = {
        id: nodeId,
        type: "action",
        position: position || { x: 400, y: 300 },
        data: {
          label: action.displayName,
          type: "action",
          status: "idle",
          description: action.description,
          pieceName: piece.name,
          actionName: (action as FlowPieceAction).name,
          logoUrl: piece.logoUrl,
          isEmpty: false,
          name: nodeUniqueName,
        },
      };
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...newNode,
                position: node.position,
                data: {
                  ...newNode.data,
                  name:
                    (node.data as Partial<WorkflowNodeData>)?.name ||
                    nodeUniqueName,
                },
              }
            : node
        )
      );
      setIsDirty(true);

      // Backend ADD_ACTION
      try {
        const stored = sessionStorage.getItem("zw_current_flow");
        const parsed = stored
          ? (JSON.parse(stored) as { id?: string })
          : undefined;
        const flowId = parsed?.id;
        if (!flowId) return;
        const parentPath = ((): string[] => {
          // Local compute using edges; avoid calling the hook below before its declaration
          const path: string[] = [];
          let currentNodeId = nodeId;
          while (currentNodeId) {
            path.unshift(currentNodeId);
            const incomingEdge = edges.find(
              (edge) => edge.target === currentNodeId
            );
            if (!incomingEdge) break;
            currentNodeId = incomingEdge.source;
          }
          return path;
        })();
        const parentId =
          parentPath.length > 0 ? parentPath[parentPath.length - 2] : undefined;
        const parentNode = parentId
          ? nodes.find((n) => n.id === parentId)
          : undefined;

        const fullPieceName = piece.name.startsWith("@activepieces/piece-")
          ? piece.name
          : `@activepieces/piece-${piece.name}`;
        let input: Record<string, unknown> = {};
        const actionName = (action as FlowPieceAction).name || "";
        if (
          fullPieceName === "@activepieces/piece-gmail" &&
          actionName === "send_email"
        ) {
          input = {
            to: ["recipient@example.com"],
            subject: "Workflow Notification",
            body_text: "Your workflow has been executed successfully.",
          } as Record<string, unknown>;
        }
        const actionPayload: AddActionRequest["action"] = {
          type: "PIECE",
          name: nodeUniqueName,
          displayName: action.displayName,
          settings: {
            pieceName: fullPieceName,
            pieceVersion: piece.version || "latest",
            actionName,
            input,
          } as unknown as AddActionRequest["action"]["settings"],
        };

        if (!parentNode || parentNode.data.type === "trigger") {
          await addActionUnderTrigger(flowId, actionPayload);
        } else {
          const parentData = parentNode.data as { name?: string };
          const parentStepName = parentData.name || parentNode.id;
          await addActionAfter(flowId, parentStepName, "AFTER", actionPayload);
        }
      } catch (e) {
        console.warn("ADD_ACTION failed", e);
      }
    },
    [setNodes, nodes, edges, slugify, generateUniqueStepName]
  );

  const addEmptyNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = generateNodeId();
      const nodePosition = findGoodPosition(position);
      const uniqueName = generateUniqueStepName("action");
      const newNode: Node<WorkflowNodeData> = {
        id,
        type: "action",
        position: nodePosition,
        data: {
          label: "Add Action",
          type: "action",
          status: "idle",
          isEmpty: true,
          name: uniqueName,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
      return id;
    },
    [generateNodeId, findGoodPosition, setNodes, generateUniqueStepName]
  );

  const addRouterNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = generateNodeId();
      const nodePosition = findGoodPosition(position);
      const uniqueName = generateUniqueStepName("router");
      const newNode: Node<WorkflowNodeData> = {
        id,
        type: "router",
        position: nodePosition,
        data: {
          label: "Router",
          type: "router",
          status: "idle",
          isEmpty: false,
          description: "Branch to multiple paths",
          name: uniqueName,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
      return id;
    },
    [generateNodeId, findGoodPosition, setNodes, generateUniqueStepName]
  );

  const addLoopNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = generateNodeId();
      const nodePosition = findGoodPosition(position);
      const uniqueName = generateUniqueStepName("loop");
      const newNode: Node<WorkflowNodeData> = {
        id,
        type: "loop",
        position: nodePosition,
        data: {
          label: "Loop",
          type: "loop",
          status: "idle",
          isEmpty: true,
          name: uniqueName,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
      return id;
    },
    [generateNodeId, findGoodPosition, setNodes, generateUniqueStepName]
  );

  const addCodeNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = generateNodeId();
      const nodePosition = findGoodPosition(position);
      const uniqueName = generateUniqueStepName("code");
      const newNode: Node<WorkflowNodeData> = {
        id,
        type: "code",
        position: nodePosition,
        data: {
          label: "Code",
          type: "code",
          status: "idle",
          isEmpty: true,
          name: uniqueName,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
      return id;
    },
    [generateNodeId, findGoodPosition, setNodes, generateUniqueStepName]
  );

  const addNodeBetween = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      let newNodePosition = { x: 400, y: 300 };
      if (sourceNode && targetNode)
        newNodePosition = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        };
      const newNodeId = addEmptyNode(newNodePosition);
      setEdges((eds) =>
        eds.filter(
          (edge) => !(edge.source === sourceId && edge.target === targetId)
        )
      );
      const newEdges: Edge[] = [
        {
          id: `edge-${sourceId}-${newNodeId}`,
          source: sourceId,
          target: newNodeId,
          type: "custom",
        },
        {
          id: `edge-${newNodeId}-${targetId}`,
          source: newNodeId,
          target: targetId,
          type: "custom",
        },
      ];
      setEdges((eds) => [...eds, ...newEdges]);
      setIsDirty(true);
      return newNodeId;
    },
    [nodes, addEmptyNode, setEdges]
  );

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      const outgoingEdge = edges.find((edge) => edge.source === nodeId);
      const prevNodes = nodes;
      const prevEdges = edges;

      // If node belongs to a router branch, delete the branch via API with optimistic UI
      try {
        // Find nearest router and originating handle
        let current: string | undefined = nodeId;
        let routerNode: Node<WorkflowNodeData> | undefined;
        let edgeFromRouter: Edge | undefined;
        for (let i = 0; i < 200 && current; i++) {
          const inc = edges.find((e) => e.target === current);
          if (!inc) break;
          const src = nodes.find((n) => n.id === inc.source);
          if (src?.type === "router") {
            routerNode = src as Node<WorkflowNodeData>;
            edgeFromRouter = inc;
            break;
          }
          current = inc.source;
        }

        if (routerNode && edgeFromRouter) {
          type EdgeWithHandle = Edge & { sourceHandle?: string };
          const handle = (edgeFromRouter as EdgeWithHandle).sourceHandle || "";
          const handleToIndex: Record<string, number> = {
            "route-1": 0,
            "route-2": 1,
            "route-3": 2,
          };
          const branchIndex = handleToIndex[handle] ?? 0;
          const routerStepName =
            (routerNode.data as Partial<WorkflowNodeData>)?.name ||
            routerNode.id;

          // Optimistic remove branch node and its outgoing subgraph
          const removedNodeIds = new Set<string>([nodeId]);
          let cursor = nodeId;
          for (let i = 0; i < 200; i++) {
            const out = edges.find((e) => e.source === cursor);
            if (!out) break;
            removedNodeIds.add(out.target);
            cursor = out.target;
          }
          setNodes((nds) => nds.filter((n) => !removedNodeIds.has(n.id)));
          setEdges((eds) =>
            eds.filter(
              (e) =>
                !(removedNodeIds.has(e.source) || removedNodeIds.has(e.target))
            )
          );
          setIsDirty(true);

          // API call with rollback
          try {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored
              ? (JSON.parse(stored) as { id?: string })
              : undefined;
            const flowId = parsed?.id;
            if (flowId) {
              deleteBranch(flowId, {
                stepName: String(routerStepName),
                branchIndex,
              }).catch(() => {
                try {
                  toastError("Delete branch failed", "Could not delete branch");
                } catch {
                  /* noop */
                }
                setNodes(prevNodes);
                setEdges(prevEdges);
                setIsDirty(false);
              });
            }
          } catch {
            setNodes(prevNodes);
            setEdges(prevEdges);
            setIsDirty(false);
          }
          return;
        }
      } catch {
        /* noop */
      }

      // Default delete behavior for non-branch nodes
      // Optimistic remove
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      if (incomingEdge && outgoingEdge) {
        const reconnectEdge: Edge = {
          id: `edge-${incomingEdge.source}-${outgoingEdge.target}`,
          source: incomingEdge.source,
          target: outgoingEdge.target,
          type: "custom",
        };
        setEdges((eds) => [...eds, reconnectEdge]);
      }
      setIsDirty(true);

      // Backend delete action
      try {
        const stored = sessionStorage.getItem("zw_current_flow");
        const parsed = stored
          ? (JSON.parse(stored) as { id?: string })
          : undefined;
        const flowId = parsed?.id;
        const stepName = (node.data as Partial<WorkflowNodeData>)?.name;
        if (!flowId || !stepName) return;
        deleteAction(flowId, { names: [stepName] }).catch(() => {
          try {
            toastError("Delete failed", "Could not delete action");
          } catch {
            /* noop */
          }
          setNodes(prevNodes);
          setEdges(prevEdges);
          setIsDirty(false);
        });
      } catch {
        try {
          toastError("Delete failed", "Could not delete action");
        } catch {
          /* noop */
        }
        setNodes(prevNodes);
        setEdges(prevEdges);
        setIsDirty(false);
      }
    },
    [nodes, edges, setNodes, setEdges]
  );

  const findFlowPath = useCallback(
    (nodeId: string): string[] => {
      const path: string[] = [];
      let currentNodeId = nodeId;
      while (currentNodeId) {
        path.unshift(currentNodeId);
        const incomingEdge = edges.find(
          (edge) => edge.target === currentNodeId
        );
        if (!incomingEdge) break;
        currentNodeId = incomingEdge.source;
      }
      return path;
    },
    [edges]
  );

  const findNodesAfterInFlow = useCallback(
    (nodeId: string): string[] => {
      const nodesAfter: string[] = [];
      let currentNodeId = nodeId;
      while (currentNodeId) {
        const outgoingEdge = edges.find(
          (edge) => edge.source === currentNodeId
        );
        if (!outgoingEdge) break;
        nodesAfter.push(outgoingEdge.target);
        currentNodeId = outgoingEdge.target;
      }
      return nodesAfter;
    },
    [edges]
  );

  const findNodeBranch = useCallback(
    (nodeId: string): string[] => {
      // Horizontal layout: branch == same row (close y), ordered by x (left -> right)
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return [];
      const branchNodes = nodes.filter(
        (n) => Math.abs(n.position.y - node.position.y) < 50
      );
      return branchNodes
        .sort((a, b) => a.position.x - b.position.x)
        .map((n) => n.id);
    },
    [nodes]
  );

  // Removed unused findLastNodeInBranch helper to satisfy linter and avoid dead code.

  const findNodesBelowInFlow = useCallback(
    (nodeId: string): string[] => findNodesAfterInFlow(nodeId).slice(0, 5),
    [findNodesAfterInFlow]
  );
  const findNodesAboveInFlow = useCallback(
    (nodeId: string): string[] => findFlowPath(nodeId).slice(0, -1).slice(-5),
    [findFlowPath]
  );

  const getBranchFlowOrder = useCallback(
    (nodeId: string): string[] => {
      const branchNodes = findNodeBranch(nodeId);
      if (branchNodes.length === 0) return [];
      return branchNodes.sort((a, b) => {
        const nodeA = nodes.find((n) => n.id === a);
        const nodeB = nodes.find((n) => n.id === b);
        if (!nodeA || !nodeB) return 0;
        return nodeA.position.y - nodeB.position.y;
      });
    },
    [nodes, findNodeBranch]
  );

  const findNodesBelowInBranch = useCallback(
    (nodeId: string): string[] => {
      const branchOrder = getBranchFlowOrder(nodeId);
      const nodeIndex = branchOrder.indexOf(nodeId);
      if (nodeIndex === -1) return [];
      const nodesAfter = branchOrder.slice(nodeIndex + 1);
      return nodesAfter.slice(0, 5);
    },
    [getBranchFlowOrder]
  );

  const findNodesAboveInBranch = useCallback(
    (nodeId: string): string[] => {
      const branchOrder = getBranchFlowOrder(nodeId);
      const nodeIndex = branchOrder.indexOf(nodeId);
      if (nodeIndex === -1) return [];
      const nodesBefore = branchOrder.slice(0, nodeIndex);
      return nodesBefore.slice(-5);
    },
    [getBranchFlowOrder]
  );

  const updateBranchNodePositions = useCallback(
    (branchOrder: string[], newBranchOrder: string[]) => {
      // Preserve original y of the row; redistribute x left->right based on prior x ordering
      const originalXPositions = branchOrder
        .map((nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          return node ? node.position.x : 0;
        })
        .sort((a, b) => a - b);
      return nodes.map((node) => {
        const newIndex = newBranchOrder.indexOf(node.id);
        if (newIndex !== -1) {
          return {
            ...node,
            position: { x: originalXPositions[newIndex], y: node.position.y },
          };
        }
        return node;
      });
    },
    [nodes]
  );

  const getFlowOrder = useCallback((): string[] => {
    const order: string[] = [];
    const visited = new Set<string>();
    const nodesWithIncomingEdges = new Set(edges.map((edge) => edge.target));
    const rootNodes = nodes.filter(
      (node) => !nodesWithIncomingEdges.has(node.id)
    );
    if (rootNodes.length === 0) return [];
    let currentNodeId = rootNodes[0].id;
    while (currentNodeId && !visited.has(currentNodeId)) {
      order.push(currentNodeId);
      visited.add(currentNodeId);
      const outgoingEdge = edges.find((edge) => edge.source === currentNodeId);
      currentNodeId = outgoingEdge?.target || "";
    }
    return order;
  }, [nodes, edges]);

  const reorderNodesByFlow = useCallback(
    (flowOrder: string[]): Node<WorkflowNodeData>[] => {
      const baseX = 150;
      const xSpacing = 220;
      const baseY = 200;
      return flowOrder
        .map((nodeId, index) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return node;
          return {
            ...node,
            position: { x: baseX + index * xSpacing, y: baseY },
          };
        })
        .filter(Boolean) as Node<WorkflowNodeData>[];
    },
    [nodes]
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToDuplicate = nodes.find((node) => node.id === nodeId);
      if (!nodeToDuplicate) return;

      // If node belongs to a router branch, duplicate the branch via API and UI under the router
      try {
        // climb up to find the nearest router and the edge from that router (to detect branch index)
        let current: string | undefined = nodeId;
        let routerNode: Node<WorkflowNodeData> | undefined;
        let edgeFromRouter: Edge | undefined;
        const maxHops = 200;
        for (let i = 0; i < maxHops && current; i++) {
          const incoming = edges.find((e) => e.target === current);
          if (!incoming) break;
          const srcNode = nodes.find((n) => n.id === incoming.source);
          if (srcNode?.type === "router") {
            routerNode = srcNode as Node<WorkflowNodeData>;
            edgeFromRouter = incoming;
            break;
          }
          current = incoming.source;
        }

        if (routerNode && edgeFromRouter) {
          // Compute branchIndex based on router bottom handle
          type EdgeWithHandle = Edge & { sourceHandle?: string };
          const handle = (edgeFromRouter as EdgeWithHandle).sourceHandle || "";
          const handleToIndex: Record<string, number> = {
            "route-1": 0,
            "route-2": 1,
            "route-3": 2,
          };
          const branchIndex = handleToIndex[handle] ?? 0;
          const routerStepName =
            (routerNode.data as Partial<WorkflowNodeData>)?.name ||
            routerNode.id;

          // UI: create a new routerBranch node under the router, attach to any bottom handle (prefer free, else route-3)
          const handles = ["route-1", "route-2", "route-3"];
          type EdgeWithHandle2 = Edge & { sourceHandle?: string };
          const usedHandles = new Set(
            edges
              .map((e) => e as EdgeWithHandle2)
              .filter(
                (e) =>
                  e.source === routerNode!.id &&
                  typeof e.sourceHandle === "string"
              )
              .map((e) => String(e.sourceHandle))
          );
          const chosenHandle =
            handles.find((h) => !usedHandles.has(h)) || "route-3";
          const xOffsetByHandle: Record<string, number> = {
            "route-1": -120,
            "route-2": 120,
            "route-3": 0,
          };
          const verticalOffset = 150;
          const newY = routerNode.position.y + verticalOffset;
          const newX =
            routerNode.position.x + (xOffsetByHandle[chosenHandle] || 0);

          const newNodeId = generateNodeId();
          const label = `Copy of ${nodeToDuplicate.data.label}`;
          const uniqueName = generateUniqueStepName(
            `${String(routerStepName)}_${slugify(label)}`
          );
          const newBranchNode: Node<WorkflowNodeData> = {
            id: newNodeId,
            type: "routerBranch",
            position: { x: newX, y: newY },
            data: {
              label,
              type: "routerBranch",
              status: "idle",
              isEmpty: true,
              config: {
                routerBranch: {
                  duplicatedFrom: (
                    nodeToDuplicate.data as Partial<WorkflowNodeData>
                  )?.name,
                  branchIndex,
                },
              },
              name: uniqueName,
            },
          } as Node<WorkflowNodeData>;

          setNodes((nds) => [...nds, newBranchNode]);
          setEdges((eds) => [
            ...eds,
            {
              id: `edge-${routerNode!.id}-${newNodeId}`,
              source: routerNode!.id,
              target: newNodeId,
              type: "custom",
              data: { suppressPlus: true },
              sourceHandle: chosenHandle,
            } as Edge,
          ]);
          setIsDirty(true);

          // Backend DUPLICATE_BRANCH; rollback UI on failure
          try {
            const stored = sessionStorage.getItem("zw_current_flow");
            const parsed = stored
              ? (JSON.parse(stored) as { id?: string })
              : undefined;
            const flowId = parsed?.id;
            if (flowId) {
              const createdEdgeId = `edge-${routerNode!.id}-${newNodeId}`;
              duplicateBranch(flowId, {
                stepName: String(routerStepName),
                branchIndex,
              }).catch(() => {
                try {
                  toastError(
                    "Duplicate branch failed",
                    "Could not duplicate branch"
                  );
                } catch {
                  /* noop */
                }
                // Revert optimistic UI
                setNodes((nds) => nds.filter((n) => n.id !== newNodeId));
                setEdges((eds) => eds.filter((e) => e.id !== createdEdgeId));
                setIsDirty(false);
              });
            }
          } catch {
            // swallow
          }

          return; // handled branch duplication; stop here
        }
      } catch {
        // non-fatal: fall back to action duplication
      }

      // Determine the last node of the first branch starting from the clicked node
      const outgoing = edges.filter((e) => e.source === nodeId);
      let parentForDuplicateId = nodeId; // default: attach under the clicked node when no branches
      if (outgoing.length > 0) {
        const sorted = [...outgoing].sort((a, b) => {
          const ta = nodes.find((n) => n.id === a.target);
          const tb = nodes.find((n) => n.id === b.target);
          return (ta?.position.y || 0) - (tb?.position.y || 0);
        });
        let tail = sorted[0].target;
        // Traverse to branch tail
        // Protect against cycles by limiting steps
        for (let i = 0; i < 100; i++) {
          const next = edges.find((e) => e.source === tail);
          if (!next) break;
          tail = next.target;
        }
        parentForDuplicateId = tail;
      }

      const parentForDuplicate = nodes.find(
        (n) => n.id === parentForDuplicateId
      );
      if (parentForDuplicate && parentForDuplicate.type !== "router") {
        const outCount = edges.filter(
          (e) => e.source === parentForDuplicateId
        ).length;
        if (outCount >= 2) {
          try {
            toastError(
              "Branch limit reached",
              "This node can have at most 2 branches."
            );
          } catch {
            /* noop */
          }
          setNodes((nds) =>
            nds.map((n) =>
              n.id === parentForDuplicateId
                ? { ...n, data: { ...n.data, status: "error" } }
                : n
            )
          );
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === parentForDuplicateId
                  ? { ...n, data: { ...n.data, status: "idle" } }
                  : n
              )
            );
          }, 800);
          return;
        }
      }

      const newNodeId = generateNodeId();
      const basePosition = parentForDuplicate || nodeToDuplicate;
      const newNodePosition = {
        x: basePosition.position.x + HORIZONTAL_GAP,
        y: basePosition.position.y,
      };
      const uniqueName = generateUniqueStepName(
        (nodeToDuplicate.data as Partial<WorkflowNodeData>)?.name ||
          nodeToDuplicate.data.type ||
          "action"
      );
      const duplicatedNode: Node<WorkflowNodeData> = {
        id: newNodeId,
        type: nodeToDuplicate.type,
        position: newNodePosition,
        data: {
          label: nodeToDuplicate.data.label,
          type: nodeToDuplicate.data.type,
          status: nodeToDuplicate.data.status || "idle",
          description: nodeToDuplicate.data.description,
          config: nodeToDuplicate.data.config
            ? { ...nodeToDuplicate.data.config }
            : undefined,
          pieceName: nodeToDuplicate.data.pieceName,
          actionName: nodeToDuplicate.data.actionName,
          triggerName: nodeToDuplicate.data.triggerName,
          logoUrl: nodeToDuplicate.data.logoUrl,
          isEmpty: nodeToDuplicate.data.isEmpty,
          onNodeClick: nodeToDuplicate.data.onNodeClick,
          name: uniqueName,
        },
      };
      setNodes((nds) => [...nds, duplicatedNode]);

      // Link from tail (or the clicked node when no branches) to the duplicate
      const newEdge: Edge = {
        id: `edge-${parentForDuplicateId}-${newNodeId}`,
        source: parentForDuplicateId,
        target: newNodeId,
        type: "custom",
      };
      setEdges((eds) => [...eds, newEdge]);
      setIsDirty(true);

      // Backend DUPLICATE_ACTION call with rollback on failure
      try {
        const stored = sessionStorage.getItem("zw_current_flow");
        const parsed = stored
          ? (JSON.parse(stored) as { id?: string })
          : undefined;
        const flowId = parsed?.id;
        const stepName = (nodeToDuplicate.data as Partial<WorkflowNodeData>)
          ?.name;
        if (!flowId || !stepName) return;
        duplicateAction(flowId, { stepName }).catch(() => {
          // visual error feedback
          try {
            toastError("Duplicate failed", "Could not duplicate action");
          } catch {
            /* noop */
          }
          setNodes((nds) => nds.filter((n) => n.id !== newNodeId));
          setEdges((eds) =>
            eds.filter(
              (e) => e.source !== parentForDuplicateId || e.target !== newNodeId
            )
          );
          setIsDirty(false);
        });
      } catch {
        try {
          toastError("Duplicate failed", "Could not duplicate action");
        } catch {
          /* noop */
        }
        setNodes((nds) => nds.filter((n) => n.id !== newNodeId));
        setEdges((eds) =>
          eds.filter(
            (e) => e.source !== parentForDuplicateId || e.target !== newNodeId
          )
        );
        setIsDirty(false);
      }
    },
    [
      nodes,
      edges,
      generateNodeId,
      setNodes,
      setEdges,
      generateUniqueStepName,
      slugify,
    ]
  );

  const swapNodeAbove = useCallback(
    (nodeId: string) => {
      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      if (!incomingEdge) return;
      const nodeAboveId = incomingEdge.source;
      const nodeAbove = nodes.find((node) => node.id === nodeAboveId);
      const currentNode = nodes.find((node) => node.id === nodeId);
      if (!nodeAbove || !currentNode) return;
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) return { ...node, data: { ...nodeAbove.data } };
        if (node.id === nodeAboveId)
          return { ...node, data: { ...currentNode.data } };
        return node;
      });
      setNodes(updatedNodes);
      setIsDirty(true);
    },
    [nodes, edges, setNodes]
  );

  const swapNodeBelow = useCallback(
    (nodeId: string) => {
      const outgoingEdge = edges.find((edge) => edge.source === nodeId);
      if (!outgoingEdge) return;
      const nodeBelowId = outgoingEdge.target;
      const nodeBelow = nodes.find((node) => node.id === nodeBelowId);
      const currentNode = nodes.find((node) => node.id === nodeId);
      if (!nodeBelow || !currentNode) return;
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) return { ...node, data: { ...nodeBelow.data } };
        if (node.id === nodeBelowId)
          return { ...node, data: { ...currentNode.data } };
        return node;
      });
      setNodes(updatedNodes);
      setIsDirty(true);
    },
    [nodes, setNodes, edges]
  );

  const moveNodeAfterInBranch = useCallback(
    (nodeId: string, targetNodeId: string) => {
      const nodeToMove = nodes.find((node) => node.id === nodeId);
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      if (!nodeToMove || !targetNode) return;
      const branchOrder = getBranchFlowOrder(nodeId);
      const nodeToMoveIndex = branchOrder.indexOf(nodeId);
      const targetIndex = branchOrder.indexOf(targetNodeId);
      if (nodeToMoveIndex === -1 || targetIndex === -1) return;
      const newBranchOrder = [...branchOrder];
      newBranchOrder.splice(nodeToMoveIndex, 1);
      const newTargetIndex = newBranchOrder.indexOf(targetNodeId);
      newBranchOrder.splice(newTargetIndex + 1, 0, nodeId);
      const updatedNodes = updateBranchNodePositions(
        branchOrder,
        newBranchOrder
      );
      const otherEdges = edges.filter(
        (edge) =>
          !branchOrder.includes(edge.source) ||
          !branchOrder.includes(edge.target)
      );
      const newBranchEdges: Edge[] = [];
      for (let i = 0; i < newBranchOrder.length - 1; i++) {
        newBranchEdges.push({
          id: `edge-${newBranchOrder[i]}-${newBranchOrder[i + 1]}`,
          source: newBranchOrder[i],
          target: newBranchOrder[i + 1],
          type: "custom",
        });
      }
      setNodes(updatedNodes);
      setEdges([...otherEdges, ...newBranchEdges]);
      setIsDirty(true);
    },
    [
      nodes,
      setNodes,
      setEdges,
      getBranchFlowOrder,
      updateBranchNodePositions,
      edges,
    ]
  );

  const moveNodeBeforeInBranch = useCallback(
    (nodeId: string, targetNodeId: string) => {
      const nodeToMove = nodes.find((node) => node.id === nodeId);
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      if (!nodeToMove || !targetNode) return;
      const branchOrder = getBranchFlowOrder(nodeId);
      const nodeToMoveIndex = branchOrder.indexOf(nodeId);
      const targetIndex = branchOrder.indexOf(targetNodeId);
      if (nodeToMoveIndex === -1 || targetIndex === -1) return;
      const newBranchOrder = [...branchOrder];
      newBranchOrder.splice(nodeToMoveIndex, 1);
      const newTargetIndex = newBranchOrder.indexOf(targetNodeId);
      newBranchOrder.splice(newTargetIndex, 0, nodeId);
      const updatedNodes = updateBranchNodePositions(
        branchOrder,
        newBranchOrder
      );
      const otherEdges = edges.filter(
        (edge) =>
          !branchOrder.includes(edge.source) ||
          !branchOrder.includes(edge.target)
      );
      const newBranchEdges: Edge[] = [];
      for (let i = 0; i < newBranchOrder.length - 1; i++) {
        newBranchEdges.push({
          id: `edge-${newBranchOrder[i]}-${newBranchOrder[i + 1]}`,
          source: newBranchOrder[i],
          target: newBranchOrder[i + 1],
          type: "custom",
        });
      }
      setNodes(updatedNodes);
      setEdges([...otherEdges, ...newBranchEdges]);
      setIsDirty(true);
    },
    [
      nodes,
      setNodes,
      setEdges,
      getBranchFlowOrder,
      updateBranchNodePositions,
      edges,
    ]
  );

  const moveNodeAfter = useCallback(
    (nodeId: string, targetNodeId: string) => {
      const nodeToMove = nodes.find((node) => node.id === nodeId);
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      if (!nodeToMove || !targetNode) return;
      const flowOrder = getFlowOrder();
      const nodeToMoveIndex = flowOrder.indexOf(nodeId);
      const targetIndex = flowOrder.indexOf(targetNodeId);
      if (nodeToMoveIndex === -1 || targetIndex === -1) return;
      const newFlowOrder = [...flowOrder];
      newFlowOrder.splice(nodeToMoveIndex, 1);
      const newTargetIndex = newFlowOrder.indexOf(targetNodeId);
      newFlowOrder.splice(newTargetIndex + 1, 0, nodeId);
      const reorderedNodes = reorderNodesByFlow(newFlowOrder);
      const newEdges: Edge[] = [];
      for (let i = 0; i < newFlowOrder.length - 1; i++)
        newEdges.push({
          id: `edge-${newFlowOrder[i]}-${newFlowOrder[i + 1]}`,
          source: newFlowOrder[i],
          target: newFlowOrder[i + 1],
          type: "custom",
        });
      setNodes(reorderedNodes);
      setEdges(newEdges);
      setIsDirty(true);
    },
    [nodes, setNodes, setEdges, getFlowOrder, reorderNodesByFlow]
  );

  const moveNodeBefore = useCallback(
    (nodeId: string, targetNodeId: string) => {
      const nodeToMove = nodes.find((node) => node.id === nodeId);
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      if (!nodeToMove || !targetNode) return;
      const flowOrder = getFlowOrder();
      const nodeToMoveIndex = flowOrder.indexOf(nodeId);
      const targetIndex = flowOrder.indexOf(targetNodeId);
      if (nodeToMoveIndex === -1 || targetIndex === -1) return;
      const newFlowOrder = [...flowOrder];
      newFlowOrder.splice(nodeToMoveIndex, 1);
      const newTargetIndex = newFlowOrder.indexOf(targetNodeId);
      newFlowOrder.splice(newTargetIndex, 0, nodeId);
      const reorderedNodes = reorderNodesByFlow(newFlowOrder);
      const newEdges: Edge[] = [];
      for (let i = 0; i < newFlowOrder.length - 1; i++)
        newEdges.push({
          id: `edge-${newFlowOrder[i]}-${newFlowOrder[i + 1]}`,
          source: newFlowOrder[i],
          target: newFlowOrder[i + 1],
          type: "smoothstep",
        });
      setNodes(reorderedNodes);
      setEdges(newEdges);
      setIsDirty(true);
    },
    [nodes, setNodes, setEdges, getFlowOrder, reorderNodesByFlow]
  );

  const saveWorkflow = useCallback(async () => {
    // Filter out loop, router, and code nodes from empty node validation
    const emptyNodes = nodes.filter((node) => {
      if (!node.data.isEmpty) return false;
      const nodeType = node.data.type;
      // Skip validation for loop, router, and code nodes
      if (nodeType === "loop" || nodeType === "router" || nodeType === "code")
        return false;
      return true;
    });
    if (emptyNodes.length > 0) {
      toastError(
        "Cannot save incomplete workflow",
        `Please configure all nodes before saving. ${emptyNodes.length} node(s) need configuration.`
      );
      return;
    }
    try {
      // Call USE_AS_DRAFT with the first version id from versions array
      const storedFlow = sessionStorage.getItem("zw_current_flow");
      const parsedFlow = storedFlow
        ? (JSON.parse(storedFlow) as {
            id?: string;
            versions?: Array<{ id?: string }>;
          })
        : undefined;
      const flowId = parsedFlow?.id;
      const versionId =
        Array.isArray(parsedFlow?.versions) && parsedFlow!.versions.length > 0
          ? String(parsedFlow!.versions[0]?.id ?? "")
          : "";
      if (!flowId || !versionId) {
        toastError("Save failed", "Missing flow or version id");
        return;
      }
      await markVersionAsDraft(flowId, { versionId });
      setIsDirty(false);
      toastSuccess(
        "Workflow saved",
        "Your workflow has been saved successfully"
      );
    } catch {
      toastError("Save failed", "Failed to save workflow. Please try again.");
    }
  }, [nodes]);

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toastSuccess(
        "Workflow completed",
        "Your workflow has been executed successfully"
      );
    } catch {
      toastError(
        "Execution failed",
        "Failed to run workflow. Please try again."
      );
    } finally {
      setIsRunning(false);
    }
  }, []);

  const loadWorkflow = useCallback(async () => {
    try {
      // Visual loading: set temporary running status on placeholder root
      setNodes((nds) =>
        nds.map((n, i) =>
          i === 0 ? { ...n, data: { ...n.data, status: "running" } } : n
        )
      );
      const stored = sessionStorage.getItem("zw_current_flow");
      const parsed = stored
        ? (JSON.parse(stored) as { id?: string })
        : undefined;
      const flowId = parsed?.id;
      if (!flowId) {
        initializeWorkflow();
        return;
      }
      const raw = (await getFlowVersionGraph(flowId)) as Record<
        string,
        unknown
      >;
      const dataRoot =
        raw && typeof raw === "object"
          ? ((raw as Record<string, unknown>)["data"] as
              | Record<string, unknown>
              | undefined)
          : undefined;
      const versions =
        dataRoot && typeof dataRoot === "object"
          ? (dataRoot["versions"] as Array<Record<string, unknown>> | undefined)
          : undefined;
      const first =
        Array.isArray(versions) && versions.length > 0
          ? versions[0]
          : undefined;
      const trigWrap =
        first && typeof first === "object"
          ? (first["trigger"] as Record<string, unknown> | undefined)
          : undefined;
      const triggerNode =
        trigWrap && typeof trigWrap === "object"
          ? (trigWrap["trigger"] as Record<string, unknown> | undefined)
          : undefined;
      if (!triggerNode) {
        initializeWorkflow();
        return;
      }

      // Helpers to map backend node to canvas node (with details)
      const createNodeFromBackend = (
        backend: Record<string, unknown>,
        pos: { x: number; y: number }
      ): Node<WorkflowNodeData> => {
        const typeRaw = String(backend["type"] ?? "action").toUpperCase();
        const normalizeType = (t: string): NodeType => {
          switch (t) {
            case "PIECE":
              return "action";
            case "CODE":
              return "code";
            case "ROUTER":
              return "router";
            case "LOOP_ON_ITEMS":
              return "loop";
            case "WEBHOOK":
              return "trigger";
            default:
              return "action";
          }
        };
        const nodeType: NodeType = normalizeType(typeRaw);
        const displayName = String(
          backend["displayName"] ??
            backend["name"] ??
            (nodeType === "trigger" ? "Webhook Trigger" : "Step")
        );
        const name = String(
          backend["name"] ?? displayName.toLowerCase().replace(/\s+/g, "_")
        );
        const settings =
          (backend["settings"] as Record<string, unknown> | undefined) || {};

        const nodeData: WorkflowNodeData = {
          label: displayName,
          type: nodeType,
          status: "idle",
          isEmpty: false,
          name,
        };

        // Attach details based on type
        if (nodeType === "action") {
          const pieceName = settings["pieceName"] as string | undefined;
          const actionName = settings["actionName"] as string | undefined;
          const triggerName = settings["triggerName"] as string | undefined;
          if (pieceName) nodeData.pieceName = pieceName;
          if (actionName) nodeData.actionName = actionName;
          if (triggerName) nodeData.triggerName = triggerName;
          nodeData.config = settings;
        } else if (nodeType === "code") {
          nodeData.config = settings;
        } else if (nodeType === "router") {
          nodeData.config = settings;
        } else if (nodeType === "loop") {
          nodeData.config = settings;
        } else if (nodeType === "trigger") {
          nodeData.config = settings;
          if (!nodeData.name) nodeData.name = "trigger";
        }

        return {
          id: generateNodeId(),
          type: nodeType,
          position: pos,
          data: nodeData,
        };
      };

      // BFS traversal over nextAction (may be 1 or 2 children)
      const nodesAcc: Node<WorkflowNodeData>[] = [];
      const edgesAcc: Edge[] = [];
      const queue: Array<{
        backend: Record<string, unknown>;
        parentId?: string;
        depth: number;
        branchIndex?: number;
      }> = [];
      const root = createNodeFromBackend(triggerNode, { x: 150, y: 200 });
      nodesAcc.push(root);
      queue.push({ backend: triggerNode, parentId: undefined, depth: 0 });

      const xGap = 260;
      const yGap = 160;

      while (queue.length > 0) {
        const { backend, parentId, depth } = queue.shift()!;
        const next = backend["nextAction"];
        const children: Array<Record<string, unknown>> = Array.isArray(next)
          ? (next as Array<Record<string, unknown>>)
          : next && typeof next === "object"
          ? [next as Record<string, unknown>]
          : [];
        children.forEach((child, index) => {
          const x = 150 + (depth + 1) * xGap;
          const y = 200 + index * yGap;
          const childNode = createNodeFromBackend(child, { x, y });
          nodesAcc.push(childNode);
          if (parentId) {
            edgesAcc.push({
              id: `edge-${parentId}-${childNode.id}`,
              source: parentId,
              target: childNode.id,
              type: "custom",
            });
          } else {
            edgesAcc.push({
              id: `edge-${root.id}-${childNode.id}`,
              source: root.id,
              target: childNode.id,
              type: "custom",
            });
          }
          queue.push({
            backend: child,
            parentId: childNode.id,
            depth: depth + 1,
            branchIndex: index,
          });
        });
      }

      // Mark all nodes as running briefly, then restore to idle
      setNodes(
        nodesAcc.map((n) => ({ ...n, data: { ...n.data, status: "running" } }))
      );
      setEdges(edgesAcc);
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } }))
        );
      }, 600);
      setIsDirty(false);
    } catch {
      toastError("Load failed", "Failed to load workflow. Please try again.");
    }
  }, [initializeWorkflow, generateNodeId, setNodes, setEdges]);

  const setReactFlowInstance = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setIsDirty(true);
    },
    [setEdges]
  );

  const getWorkflowState = useCallback(
    (): WorkflowState => ({ nodes, edges, isRunning, isDirty }),
    [nodes, edges, isRunning, isDirty]
  );

  // Helpers for branch-aware menus
  const getOutgoingEdges = useCallback(
    (nodeId: string) => edges.filter((e) => e.source === nodeId),
    [edges]
  );
  const getIncomingEdges = useCallback(
    (nodeId: string) => edges.filter((e) => e.target === nodeId),
    [edges]
  );

  const collectNonEmptyForward = useCallback(
    (startNodeId: string, limit: number): string[] => {
      const result: string[] = [];
      let current: string | undefined = startNodeId;
      const visited = new Set<string>();
      while (current && result.length < limit && !visited.has(current)) {
        visited.add(current);
        const node = nodes.find((n) => n.id === current);
        if (!node) break;
        if (!node.data.isEmpty) result.push(current);
        const outs = edges.filter((e) => e.source === current);
        if (outs.length !== 1) break;
        current = outs[0].target;
      }
      return result;
    },
    [nodes, edges]
  );

  const collectNonEmptyBackward = useCallback(
    (startNodeId: string, limit: number): string[] => {
      const result: string[] = [];
      let current: string | undefined = startNodeId;
      const visited = new Set<string>();
      while (current && result.length < limit && !visited.has(current)) {
        visited.add(current);
        const node = nodes.find((n) => n.id === current);
        if (!node) break;
        if (!node.data.isEmpty) result.push(current);
        const ins = edges.filter((e) => e.target === current);
        if (ins.length !== 1) break;
        current = ins[0].source;
      }
      return result;
    },
    [nodes, edges]
  );

  const getRightMoveCandidates = useCallback(
    (nodeId: string): string[] => {
      const outs = getOutgoingEdges(nodeId).sort((a, b) => {
        const ay = nodes.find((n) => n.id === a.target)?.position.y || 0;
        const by = nodes.find((n) => n.id === b.target)?.position.y || 0;
        return ay - by;
      });
      if (outs.length >= 2) {
        return [
          ...collectNonEmptyForward(outs[0].target, 2),
          ...collectNonEmptyForward(outs[1].target, 2),
        ].slice(0, 4);
      }
      if (outs.length === 1) return collectNonEmptyForward(outs[0].target, 4);
      return [];
    },
    [getOutgoingEdges, nodes, collectNonEmptyForward]
  );

  const getLeftMoveCandidates = useCallback(
    (nodeId: string): string[] => {
      const ins = getIncomingEdges(nodeId).sort((a, b) => {
        const ay = nodes.find((n) => n.id === a.source)?.position.y || 0;
        const by = nodes.find((n) => n.id === b.source)?.position.y || 0;
        return ay - by;
      });
      if (ins.length >= 2) {
        return [
          ...collectNonEmptyBackward(ins[0].source, 2),
          ...collectNonEmptyBackward(ins[1].source, 2),
        ].slice(0, 4);
      }
      if (ins.length === 1) return collectNonEmptyBackward(ins[0].source, 4);
      return [];
    },
    [getIncomingEdges, nodes, collectNonEmptyBackward]
  );

  // Note: advanced rewire logic for moving left/right has been removed per request.

  return {
    nodes,
    edges,
    isRunning,
    isDirty,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addPieceNode,
    addEmptyNode,
    addNodeBetween,
    updateNodeData,
    deleteNode,
    duplicateNode,
    swapNodeAbove,
    swapNodeBelow,
    moveNodeAfter,
    moveNodeBefore,
    moveNodeAfterInBranch,
    moveNodeBeforeInBranch,
    addCodeNode,
    getRightMoveCandidates,
    getLeftMoveCandidates,
    saveWorkflow,
    runWorkflow,
    loadWorkflow,
    setReactFlowInstance,
    removeEdge,
    addRouterNode,
    addLoopNode,
    findNodesBelowInFlow,
    findNodesAboveInFlow,
    findNodesBelowInBranch,
    findNodesAboveInBranch,
    getWorkflowState,
    reactFlowInstance: reactFlowInstance.current,
  };
}
