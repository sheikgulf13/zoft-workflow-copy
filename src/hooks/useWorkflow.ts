import { useState, useCallback, useRef } from 'react';
import { 
  addEdge, 
  useNodesState, 
  useEdgesState,
} from 'reactflow';
import type { 
  Node, 
  Edge, 
  Connection, 
  ReactFlowInstance
} from 'reactflow';
import { toastError, toastSuccess } from '../components/ui/Toast';
import type { WorkflowNodeData } from '../components/flow/CustomNodes';
// NodeType is no longer exported from FlowToolbar, define it here
type NodeType = 'trigger' | 'action' | 'condition' | 'delay';
import type { FlowPiece, FlowPieceAction, FlowPieceTrigger } from '../components/flow/FlowPieceSelector';

export interface WorkflowState {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  isRunning: boolean;
  isDirty: boolean;
}

export function useWorkflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Generate unique ID for nodes
  const generateNodeId = useCallback(() => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize workflow with basic trigger -> action setup
  const initializeWorkflow = useCallback(() => {
    const triggerId = generateNodeId();
    const actionId = generateNodeId();

    const initialNodes: Node<WorkflowNodeData>[] = [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 400, y: 100 },
        data: {
          label: '1. Select Trigger',
          type: 'trigger',
          status: 'idle',
          isEmpty: true,
        },
      },
      {
        id: actionId,
        type: 'action',
        position: { x: 400, y: 300 },
        data: {
          label: '2. Add Action',
          type: 'action',
          status: 'idle',
          isEmpty: true,
        },
      },
    ];

    const initialEdges: Edge[] = [
      {
        id: `edge-${triggerId}-${actionId}`,
        source: triggerId,
        target: actionId,
        type: 'custom',
      },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsDirty(false);
  }, [generateNodeId, setNodes, setEdges]);

  // Initialize workflow on first load
  useState(() => {
    initializeWorkflow();
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdge = { ...params, type: 'custom' };
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  // Helper function to find a good position for new nodes
  const findGoodPosition = useCallback((preferredPosition?: { x: number; y: number }) => {
    if (preferredPosition) return preferredPosition;
    
    if (nodes.length === 0) {
      return { x: 400, y: 100 };
    }
    
    // Find the rightmost and bottommost positions
    const rightmost = Math.max(...nodes.map(n => n.position.x));
    const bottommost = Math.max(...nodes.map(n => n.position.y));
    
    // Place new node to the right of existing nodes, or below if too far right
    if (rightmost < 800) {
      return { x: rightmost + 200, y: 200 };
    } else {
      return { x: 400, y: bottommost + 150 };
    }
  }, [nodes]);

  // Add a new node of specified type
  const addNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const id = generateNodeId();
    const nodePosition = findGoodPosition(position);
    
    const newNode: Node<WorkflowNodeData> = {
      id,
      type,
      position: nodePosition,
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        type,
        status: 'idle',
        isEmpty: true,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
    return id;
  }, [generateNodeId, findGoodPosition, setNodes]);

  // Add a piece-based node (from piece selector)
  const addPieceNode = useCallback((
    piece: FlowPiece, 
    action: FlowPieceAction | FlowPieceTrigger, 
    nodeId: string,
    position?: { x: number; y: number }
  ) => {
    const newNode: Node<WorkflowNodeData> = {
      id: nodeId,
      type: 'action',
      position: position || { x: 400, y: 300 }, // Use existing position or fallback
      data: {
        label: action.displayName,
        type: 'action',
        status: 'idle',
        description: action.description,
        pieceName: piece.name,
        actionName: action.name,
        logoUrl: piece.logoUrl,
        isEmpty: false,
      },
    };

    setNodes((nds) => nds.map(node => 
      node.id === nodeId ? { ...newNode, position: node.position } : node
    ));
    setIsDirty(true);
  }, [setNodes]);

  // Add an empty node (for workflow building)
  const addEmptyNode = useCallback((position?: { x: number; y: number }) => {
    const id = generateNodeId();
    const nodePosition = findGoodPosition(position);
    
    const newNode: Node<WorkflowNodeData> = {
      id,
      type: 'action',
      position: nodePosition,
      data: {
        label: 'Add Action',
        type: 'action',
        status: 'idle',
        isEmpty: true,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
    return id;
  }, [generateNodeId, findGoodPosition, setNodes]);

  // Add node between existing nodes
  const addNodeBetween = useCallback((sourceId: string, targetId: string) => {
    // Find source and target nodes to calculate position
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    let newNodePosition = { x: 400, y: 300 };
    if (sourceNode && targetNode) {
      // Position the new node between source and target
      newNodePosition = {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
      };
    }
    
    const newNodeId = addEmptyNode(newNodePosition);
    
    // Remove existing edge between source and target
    setEdges((eds) => eds.filter(edge => 
      !(edge.source === sourceId && edge.target === targetId)
    ));
    
    // Add new edges: source -> newNode -> target
    const newEdges: Edge[] = [
      {
        id: `edge-${sourceId}-${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        type: 'custom',
      },
      {
        id: `edge-${newNodeId}-${targetId}`,
        source: newNodeId,
        target: targetId,
        type: 'custom',
      },
    ];
    
    setEdges((eds) => [...eds, ...newEdges]);
    setIsDirty(true);
    
    return newNodeId;
  }, [nodes, addEmptyNode, setEdges]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, updates: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
    setIsDirty(true);
  }, [setNodes]);

  // Delete a node and reconnect workflow
  const deleteNode = useCallback((nodeId: string) => {
    // Find edges connected to this node
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    const outgoingEdge = edges.find(edge => edge.source === nodeId);
    
    // Remove the node
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    
    // Remove edges connected to this node
    setEdges((eds) => eds.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // If there were both incoming and outgoing edges, reconnect them
    if (incomingEdge && outgoingEdge) {
      const reconnectEdge: Edge = {
        id: `edge-${incomingEdge.source}-${outgoingEdge.target}`,
        source: incomingEdge.source,
        target: outgoingEdge.target,
        type: 'custom',
      };
      
      setEdges((eds) => [...eds, reconnectEdge]);
    }
    
    setIsDirty(true);
  }, [edges, setNodes, setEdges]);

  // Helper function to find the flow path for a given node (from root to the node)
  const findFlowPath = useCallback((nodeId: string): string[] => {
    const path: string[] = [];
    let currentNodeId = nodeId;
    
    // Traverse backwards to find the path from root to the target node
    while (currentNodeId) {
      path.unshift(currentNodeId);
      const incomingEdge = edges.find(edge => edge.target === currentNodeId);
      if (!incomingEdge) break;
      currentNodeId = incomingEdge.source;
    }
    
    return path;
  }, [edges]);

  // Helper function to find all nodes that come after a given node in the flow
  const findNodesAfterInFlow = useCallback((nodeId: string): string[] => {
    const nodesAfter: string[] = [];
    let currentNodeId = nodeId;
    
    // Traverse forwards to find all nodes that come after the target node
    while (currentNodeId) {
      const outgoingEdge = edges.find(edge => edge.source === currentNodeId);
      if (!outgoingEdge) break;
      nodesAfter.push(outgoingEdge.target);
      currentNodeId = outgoingEdge.target;
    }
    
    return nodesAfter;
  }, [edges]);

  // Helper function to find which branch a node belongs to (based on X position)
  const findNodeBranch = useCallback((nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    
    // Find all nodes in the same X position (same branch)
    const branchNodes = nodes.filter(n => Math.abs(n.position.x - node.position.x) < 50);
    
    // Sort by Y position to get the order
    return branchNodes
      .sort((a, b) => a.position.y - b.position.y)
      .map(n => n.id);
  }, [nodes]);

  // Helper function to find the last node in a specific branch
  const findLastNodeInBranch = useCallback((nodeId: string): string | null => {
    const branchNodes = findNodeBranch(nodeId);
    if (branchNodes.length === 0) return null;
    
    // Return the last node in the branch (highest Y position)
    return branchNodes[branchNodes.length - 1];
  }, [findNodeBranch]);





  // Helper function to find nodes below the target node in the flow (up to 5 nodes)
  const findNodesBelowInFlow = useCallback((nodeId: string): string[] => {
    const nodesAfter = findNodesAfterInFlow(nodeId);
    return nodesAfter.slice(0, 5); // Take only the first 5
  }, [findNodesAfterInFlow]);

  // Helper function to find nodes above the target node in the flow (up to 5 nodes)
  const findNodesAboveInFlow = useCallback((nodeId: string): string[] => {
    const flowPath = findFlowPath(nodeId);
    // Remove the current node and take the last 5 nodes before it
    const nodesBefore = flowPath.slice(0, -1).slice(-5);
    return nodesBefore;
  }, [findFlowPath]);

  // Helper function to get the current flow order for a specific branch
  const getBranchFlowOrder = useCallback((nodeId: string): string[] => {
    const branchNodes = findNodeBranch(nodeId);
    if (branchNodes.length === 0) return [];
    
    // Sort by Y position to get the correct order
    return branchNodes.sort((a, b) => {
      const nodeA = nodes.find(n => n.id === a);
      const nodeB = nodes.find(n => n.id === b);
      if (!nodeA || !nodeB) return 0;
      return nodeA.position.y - nodeB.position.y;
    });
  }, [nodes, findNodeBranch]);

  // Helper function to find nodes below the target node in the same branch (up to 5 nodes)
  const findNodesBelowInBranch = useCallback((nodeId: string): string[] => {
    const branchOrder = getBranchFlowOrder(nodeId);
    const nodeIndex = branchOrder.indexOf(nodeId);
    if (nodeIndex === -1) return [];
    
    // Get nodes after the current node in the branch
    const nodesAfter = branchOrder.slice(nodeIndex + 1);
    return nodesAfter.slice(0, 5); // Take only the first 5
  }, [getBranchFlowOrder]);

  // Helper function to find nodes above the target node in the same branch (up to 5 nodes)
  const findNodesAboveInBranch = useCallback((nodeId: string): string[] => {
    const branchOrder = getBranchFlowOrder(nodeId);
    const nodeIndex = branchOrder.indexOf(nodeId);
    if (nodeIndex === -1) return [];
    
    // Get nodes before the current node in the branch
    const nodesBefore = branchOrder.slice(0, nodeIndex);
    return nodesBefore.slice(-5); // Take only the last 5
  }, [getBranchFlowOrder]);

  // Helper function to update node positions within a branch while preserving Y positions
  const updateBranchNodePositions = useCallback((branchOrder: string[], newBranchOrder: string[]) => {
    // Get the original Y positions of the branch nodes
    const originalYPositions = branchOrder.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node ? node.position.y : 0;
    }).sort((a, b) => a - b); // Sort Y positions in ascending order
    
    return nodes.map(node => {
      const newIndex = newBranchOrder.indexOf(node.id);
      if (newIndex !== -1) {
        return {
          ...node,
          position: {
            x: node.position.x, // Keep same X position (same branch)
            y: originalYPositions[newIndex] // Use the original Y position at the new index
          }
        };
      }
      return node;
    });
  }, [nodes]);

  // Helper function to get the current flow order
  const getFlowOrder = useCallback((): string[] => {
    const order: string[] = [];
    const visited = new Set<string>();
    
    // Find the root node (node with no incoming edges)
    const nodesWithIncomingEdges = new Set(edges.map(edge => edge.target));
    const rootNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
    
    if (rootNodes.length === 0) return [];
    
    // Start from the first root node (assuming single flow)
    let currentNodeId = rootNodes[0].id;
    
    while (currentNodeId && !visited.has(currentNodeId)) {
      order.push(currentNodeId);
      visited.add(currentNodeId);
      
      const outgoingEdge = edges.find(edge => edge.source === currentNodeId);
      currentNodeId = outgoingEdge?.target || '';
    }
    
    return order;
  }, [nodes, edges]);

  // Helper function to reorder nodes and update positions
  const reorderNodesByFlow = useCallback((flowOrder: string[]): Node<WorkflowNodeData>[] => {
    const baseY = 100;
    const ySpacing = 200;
    const baseX = 400;
    
    return flowOrder.map((nodeId, index) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return node;
      
      return {
        ...node,
        position: {
          x: baseX,
          y: baseY + (index * ySpacing)
        }
      };
    }).filter(Boolean) as Node<WorkflowNodeData>[];
  }, [nodes]);

  // Duplicate a node and place it at the end of its own branch
  const duplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(node => node.id === nodeId);
    if (!nodeToDuplicate) return;
    
    const newNodeId = generateNodeId();
    
    // Find the last node in the same branch to determine positioning
    const lastNodeInBranch = findLastNodeInBranch(nodeId);
    
    let newNodePosition: { x: number; y: number };
    
    if (lastNodeInBranch) {
      const lastNode = nodes.find(node => node.id === lastNodeInBranch);
      if (lastNode) {
        // Place the duplicated node below the last node in the same branch
        newNodePosition = {
          x: lastNode.position.x, // Same X position as the branch
          y: lastNode.position.y + 200 // 200px below the last node
        };
      } else {
        // Fallback: place near the original node
        newNodePosition = {
          x: nodeToDuplicate.position.x,
          y: nodeToDuplicate.position.y + 200
        };
      }
    } else {
      // Fallback: place near the original node
      newNodePosition = {
        x: nodeToDuplicate.position.x,
        y: nodeToDuplicate.position.y + 200
      };
    }
    
    // Create completely new node with copied data
    const duplicatedNode: Node<WorkflowNodeData> = {
      id: newNodeId,
      type: nodeToDuplicate.type,
      position: newNodePosition,
      data: {
        label: nodeToDuplicate.data.label,
        type: nodeToDuplicate.data.type,
        status: nodeToDuplicate.data.status || 'idle',
        description: nodeToDuplicate.data.description,
        config: nodeToDuplicate.data.config ? { ...nodeToDuplicate.data.config } : undefined,
        pieceName: nodeToDuplicate.data.pieceName,
        actionName: nodeToDuplicate.data.actionName,
        triggerName: nodeToDuplicate.data.triggerName,
        logoUrl: nodeToDuplicate.data.logoUrl,
        isEmpty: nodeToDuplicate.data.isEmpty, // Keep the same empty state
        onNodeClick: nodeToDuplicate.data.onNodeClick,
      }
    };
    
    // Add the duplicated node
    setNodes((nds) => [...nds, duplicatedNode]);
    
    // Connect the duplicated node to the last node in the branch
    if (lastNodeInBranch) {
      const newEdge: Edge = {
        id: `edge-${lastNodeInBranch}-${newNodeId}`,
        source: lastNodeInBranch,
        target: newNodeId,
        type: 'custom',
      };
      
      setEdges((eds) => [...eds, newEdge]);
    }
    
    setIsDirty(true);
  }, [nodes, edges, generateNodeId, setNodes, setEdges, findLastNodeInBranch]);

  // Swap node with the node above it (based on flow connections)
  const swapNodeAbove = useCallback((nodeId: string) => {
    // Find the node that comes before this one in the flow
    const incomingEdge = edges.find(edge => edge.target === nodeId);
    if (!incomingEdge) return; // Can't swap if it's the first node
    
    const nodeAboveId = incomingEdge.source;
    const nodeAbove = nodes.find(node => node.id === nodeAboveId);
    const currentNode = nodes.find(node => node.id === nodeId);
    
    if (!nodeAbove || !currentNode) return;
    
    // Swap only the data, keep positions and connections the same
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...nodeAbove.data } };
      }
      if (node.id === nodeAboveId) {
        return { ...node, data: { ...currentNode.data } };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    setIsDirty(true);
  }, [nodes, edges, setNodes]);

  // Swap node with the node below it (based on flow connections)
  const swapNodeBelow = useCallback((nodeId: string) => {
    // Find the node that comes after this one in the flow
    const outgoingEdge = edges.find(edge => edge.source === nodeId);
    if (!outgoingEdge) return; // Can't swap if it's the last node
    
    const nodeBelowId = outgoingEdge.target;
    const nodeBelow = nodes.find(node => node.id === nodeBelowId);
    const currentNode = nodes.find(node => node.id === nodeId);
    
    if (!nodeBelow || !currentNode) return;
    
    // Swap only the data, keep positions and connections the same
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...nodeBelow.data } };
      }
      if (node.id === nodeBelowId) {
        return { ...node, data: { ...currentNode.data } };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    setIsDirty(true);
  }, [nodes, edges, setNodes]);

  // Move node after a specific target node within the same branch
  const moveNodeAfterInBranch = useCallback((nodeId: string, targetNodeId: string) => {
    const nodeToMove = nodes.find(node => node.id === nodeId);
    const targetNode = nodes.find(node => node.id === targetNodeId);
    
    if (!nodeToMove || !targetNode) return;
    
    // Get the current branch flow order
    const branchOrder = getBranchFlowOrder(nodeId);
    const nodeToMoveIndex = branchOrder.indexOf(nodeId);
    const targetIndex = branchOrder.indexOf(targetNodeId);
    
    if (nodeToMoveIndex === -1 || targetIndex === -1) return;
    
    // Create new branch order: remove nodeToMove and insert it after target
    const newBranchOrder = [...branchOrder];
    newBranchOrder.splice(nodeToMoveIndex, 1); // Remove nodeToMove
    const newTargetIndex = newBranchOrder.indexOf(targetNodeId);
    newBranchOrder.splice(newTargetIndex + 1, 0, nodeId); // Insert after target
    
    // Update node positions within the branch
    const updatedNodes = updateBranchNodePositions(branchOrder, newBranchOrder);
    
    // Update edges within the branch
    const otherEdges = edges.filter(edge => 
      !branchOrder.includes(edge.source) || !branchOrder.includes(edge.target)
    );
    
    // Create new edges for the branch
    const newBranchEdges: Edge[] = [];
    for (let i = 0; i < newBranchOrder.length - 1; i++) {
      newBranchEdges.push({
        id: `edge-${newBranchOrder[i]}-${newBranchOrder[i + 1]}`,
        source: newBranchOrder[i],
        target: newBranchOrder[i + 1],
        type: 'custom',
      });
    }
    
    setNodes(updatedNodes);
    setEdges([...otherEdges, ...newBranchEdges]);
    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges, getBranchFlowOrder, updateBranchNodePositions]);

  // Move node before a specific target node within the same branch
  const moveNodeBeforeInBranch = useCallback((nodeId: string, targetNodeId: string) => {
    const nodeToMove = nodes.find(node => node.id === nodeId);
    const targetNode = nodes.find(node => node.id === targetNodeId);
    
    if (!nodeToMove || !targetNode) return;
    
    // Get the current branch flow order
    const branchOrder = getBranchFlowOrder(nodeId);
    const nodeToMoveIndex = branchOrder.indexOf(nodeId);
    const targetIndex = branchOrder.indexOf(targetNodeId);
    
    if (nodeToMoveIndex === -1 || targetIndex === -1) return;
    
    // Create new branch order: remove nodeToMove and insert it before target
    const newBranchOrder = [...branchOrder];
    newBranchOrder.splice(nodeToMoveIndex, 1); // Remove nodeToMove
    const newTargetIndex = newBranchOrder.indexOf(targetNodeId);
    newBranchOrder.splice(newTargetIndex, 0, nodeId); // Insert before target
    
    // Update node positions within the branch
    const updatedNodes = updateBranchNodePositions(branchOrder, newBranchOrder);
    
    // Update edges within the branch
    const otherEdges = edges.filter(edge => 
      !branchOrder.includes(edge.source) || !branchOrder.includes(edge.target)
    );
    
    // Create new edges for the branch
    const newBranchEdges: Edge[] = [];
    for (let i = 0; i < newBranchOrder.length - 1; i++) {
      newBranchEdges.push({
        id: `edge-${newBranchOrder[i]}-${newBranchOrder[i + 1]}`,
        source: newBranchOrder[i],
        target: newBranchOrder[i + 1],
        type: 'custom',
      });
    }
    
    setNodes(updatedNodes);
    setEdges([...otherEdges, ...newBranchEdges]);
    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges, getBranchFlowOrder, updateBranchNodePositions]);

  // Move node after a specific target node (reorder flow)
  const moveNodeAfter = useCallback((nodeId: string, targetNodeId: string) => {
    const nodeToMove = nodes.find(node => node.id === nodeId);
    const targetNode = nodes.find(node => node.id === targetNodeId);
    
    if (!nodeToMove || !targetNode) return;
    
    // Get the current flow order
    const flowOrder = getFlowOrder();
    const nodeToMoveIndex = flowOrder.indexOf(nodeId);
    const targetIndex = flowOrder.indexOf(targetNodeId);
    
    if (nodeToMoveIndex === -1 || targetIndex === -1) return;
    
    // Create new flow order: remove nodeToMove and insert it after target
    const newFlowOrder = [...flowOrder];
    newFlowOrder.splice(nodeToMoveIndex, 1); // Remove nodeToMove
    const newTargetIndex = newFlowOrder.indexOf(targetNodeId);
    newFlowOrder.splice(newTargetIndex + 1, 0, nodeId); // Insert after target
    
    // Reorder nodes and update positions
    const reorderedNodes = reorderNodesByFlow(newFlowOrder);
    
    // Create new edges based on the new flow order
    const newEdges: Edge[] = [];
    for (let i = 0; i < newFlowOrder.length - 1; i++) {
      newEdges.push({
        id: `edge-${newFlowOrder[i]}-${newFlowOrder[i + 1]}`,
        source: newFlowOrder[i],
        target: newFlowOrder[i + 1],
        type: 'custom',
      });
    }
    
    setNodes(reorderedNodes);
    setEdges(newEdges);
    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges, getFlowOrder, reorderNodesByFlow]);

  // Move node before a specific target node (reorder flow)
  const moveNodeBefore = useCallback((nodeId: string, targetNodeId: string) => {
    const nodeToMove = nodes.find(node => node.id === nodeId);
    const targetNode = nodes.find(node => node.id === targetNodeId);
    
    if (!nodeToMove || !targetNode) return;
    
    // Get the current flow order
    const flowOrder = getFlowOrder();
    const nodeToMoveIndex = flowOrder.indexOf(nodeId);
    const targetIndex = flowOrder.indexOf(targetNodeId);
    
    if (nodeToMoveIndex === -1 || targetIndex === -1) return;
    
    // Create new flow order: remove nodeToMove and insert it before target
    const newFlowOrder = [...flowOrder];
    newFlowOrder.splice(nodeToMoveIndex, 1); // Remove nodeToMove
    const newTargetIndex = newFlowOrder.indexOf(targetNodeId);
    newFlowOrder.splice(newTargetIndex, 0, nodeId); // Insert before target
    
    // Reorder nodes and update positions
    const reorderedNodes = reorderNodesByFlow(newFlowOrder);
    
    // Create new edges based on the new flow order
    const newEdges: Edge[] = [];
    for (let i = 0; i < newFlowOrder.length - 1; i++) {
      newEdges.push({
        id: `edge-${newFlowOrder[i]}-${newFlowOrder[i + 1]}`,
        source: newFlowOrder[i],
        target: newFlowOrder[i + 1],
        type: 'custom',
      });
    }
    
    setNodes(reorderedNodes);
    setEdges(newEdges);
    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges, getFlowOrder, reorderNodesByFlow]);

  // Save workflow
  const saveWorkflow = useCallback(async () => {
    // Validation: Check if any nodes are empty
    const emptyNodes = nodes.filter(node => node.data.isEmpty);
    if (emptyNodes.length > 0) {
      toastError(
        "Cannot save incomplete workflow", 
        `Please configure all nodes before saving. ${emptyNodes.length} node(s) need configuration.`
      );
      return;
    }

    try {
      // Here you would make an API call to save the workflow
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsDirty(false);
      toastSuccess("Workflow saved", "Your workflow has been saved successfully");
    } catch {
      toastError("Save failed", "Failed to save workflow. Please try again.");
    }
  }, [nodes]);

  // Run workflow
  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    try {
      // Simulate workflow execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toastSuccess("Workflow completed", "Your workflow has been executed successfully");
    } catch {
      toastError("Execution failed", "Failed to run workflow. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Load workflow (placeholder)
  const loadWorkflow = useCallback(async (workflowId: string) => {
    try {
      // Here you would load workflow from API
      console.log('Loading workflow:', workflowId);
      // For now, just initialize with default
      initializeWorkflow();
    } catch {
      toastError("Load failed", "Failed to load workflow. Please try again.");
    }
  }, [initializeWorkflow]);

  // Set React Flow instance reference
  const setReactFlowInstance = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  // Get current workflow state
  const getWorkflowState = useCallback((): WorkflowState => {
    return {
      nodes,
      edges,
      isRunning,
      isDirty,
    };
  }, [nodes, edges, isRunning, isDirty]);

  return {
    // State
    nodes,
    edges,
    isRunning,
    isDirty,
    
    // Handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    
    // Actions
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
    saveWorkflow,
    runWorkflow,
    loadWorkflow,
    setReactFlowInstance,
    
    // Utils
    findNodesBelowInFlow,
    findNodesAboveInFlow,
    findNodesBelowInBranch,
    findNodesAboveInBranch,
    getWorkflowState,
    reactFlowInstance: reactFlowInstance.current
  };
}
