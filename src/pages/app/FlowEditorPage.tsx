import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/flow-editor.css';

import { useWorkflow } from '../../hooks/useWorkflow';
import FlowPieceSelector from '../../components/flow/FlowPieceSelector';
import StepSettings from '../../components/flow/StepSettings';
import ConnectionSetupModal from '../../components/modals/ConnectionSetupModal';
import { nodeTypes } from '../../components/flow/nodeTypes';
import { edgeTypes } from '../../components/flow/edgeTypes';
import type { FlowPiece, FlowPieceAction, FlowPieceTrigger } from '../../components/flow/FlowPieceSelector';
import { ArrowLeft, Save, Play, Plus } from 'lucide-react';
import { ThemeToggle } from '../../components/ui';
import type { Connection } from '../../types/connection';

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
    moveNodeAfterInBranch,
    moveNodeBeforeInBranch,
    findNodesBelowInBranch,
    findNodesAboveInBranch,
    saveWorkflow,
    runWorkflow,
    isRunning,
    isDirty,
    setReactFlowInstance,
    reactFlowInstance,
  } = useWorkflow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPieceSelectorOpen, setIsPieceSelectorOpen] = useState(false);
  const [isStepSettingsOpen, setIsStepSettingsOpen] = useState(false);
  const [pieceSelectorPosition, setPieceSelectorPosition] = useState({ x: 0, y: 0 });
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
  const [moveBeforeTimeout, setMoveBeforeTimeout] = useState<number | null>(null);
  const [splitWidth, setSplitWidth] = useState(70); // Percentage for canvas width
  const [isDragging, setIsDragging] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionPiece, setConnectionPiece] = useState<any>(null);

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
        setShowUnsavedWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty]);

  const handleBackToFlows = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      navigate('/flows');
    }
  };

  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    if (node.data.isEmpty) {
      // Open piece selector for empty nodes
      setSelectedNodeId(node.id);
      
      // Calculate position for the modal
      const rect = event.currentTarget.getBoundingClientRect();
      setPieceSelectorPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
      
      setIsPieceSelectorOpen(true);
    } else {
      // Open step settings for configured nodes
      setSelectedNodeId(node.id);
      setIsStepSettingsOpen(true);
    }
  }, []);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
    // Add a new empty node between the connected nodes
    addNodeBetween(edge.source, edge.target);
  }, [addNodeBetween]);

  // Helper function to calculate optimal menu position
  const calculateMenuPosition = useCallback((clientX: number, clientY: number, menuWidth: number = 160, menuHeight: number = 200) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = clientX;
    let y = clientY;
    
    // Check right boundary
    if (x + menuWidth > viewportWidth) {
      x = clientX - menuWidth;
    }
    
    // Check bottom boundary
    if (y + menuHeight > viewportHeight) {
      y = clientY - menuHeight;
    }
    
    // Ensure menu doesn't go off-screen to the left
    if (x < 0) {
      x = 0;
    }
    
    // Ensure menu doesn't go off-screen to the top
    if (y < 0) {
      y = 0;
    }
    
    return { x, y };
  }, []);

  // Helper function to calculate sub-menu position
  const calculateSubmenuPosition = useCallback(() => {
    if (!contextMenu) return { left: 'left-full', top: 'top-0', ml: 'ml-1' };
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const submenuWidth = 200;
    const submenuHeight = 150;
    
    let position = { left: 'left-full', top: 'top-0', ml: 'ml-1' };
    
    // Check if submenu would overflow to the right
    if (contextMenu.x + 160 + submenuWidth > viewportWidth) {
      position = { left: 'right-full', top: 'top-0', ml: 'mr-1' };
    }
    
    // Check if submenu would overflow to the bottom
    if (contextMenu.y + submenuHeight > viewportHeight) {
      position = { ...position, top: 'bottom-0' };
    }
    
    return position;
  }, [contextMenu]);

  const handleContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    
    const position = calculateMenuPosition(event.clientX, event.clientY);
    
    setContextMenu({
      visible: true,
      x: position.x,
      y: position.y,
      nodeId: node.id,
    });
  }, [calculateMenuPosition]);

  const handleContextMenuAction = useCallback((action: 'duplicate' | 'swapAbove' | 'swapBelow' | 'delete') => {
    if (!contextMenu) return;
    
    const { nodeId } = contextMenu;
    
    switch (action) {
      case 'duplicate':
        duplicateNode(nodeId);
        break;
      case 'swapAbove':
        swapNodeAbove(nodeId);
        break;
      case 'swapBelow':
        swapNodeBelow(nodeId);
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this node?')) {
          deleteNode(nodeId);
        }
        break;
    }
    
    setContextMenu(null);
  }, [contextMenu, duplicateNode, swapNodeAbove, swapNodeBelow, deleteNode]);

  const handleCanvasClick = useCallback(() => {
    setContextMenu(null);
    setShowMoveAfterSubmenu(false);
    setShowMoveBeforeSubmenu(false);
    if (moveAfterTimeout) {
      clearTimeout(moveAfterTimeout);
      setMoveAfterTimeout(null);
    }
    if (moveBeforeTimeout) {
      clearTimeout(moveBeforeTimeout);
      setMoveBeforeTimeout(null);
    }
  }, [moveAfterTimeout, moveBeforeTimeout]);

  const handlePieceSelect = useCallback((piece: FlowPiece, actionOrTrigger: FlowPieceAction | FlowPieceTrigger, _type: 'action' | 'trigger') => {
    if (selectedNodeId) {
      addPieceNode(piece, actionOrTrigger, selectedNodeId);
      setIsPieceSelectorOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, addPieceNode]);

  const handleStepSettingsClose = useCallback(() => {
    setIsStepSettingsOpen(false);
    setSelectedNodeId(null);
  }, []);

  // Handle split resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('flow-editor-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Limit the split between 30% and 80%
    const clampedWidth = Math.max(30, Math.min(80, newWidth));
    setSplitWidth(clampedWidth);
    
    // Force ReactFlow to recalculate its dimensions
    const reactFlowElement = container.querySelector('.react-flow');
    if (reactFlowElement) {
      // Trigger a resize event to make ReactFlow recalculate
      window.dispatchEvent(new Event('resize'));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle ReactFlow resize when split width changes
  useEffect(() => {
    if (reactFlowInstance) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 1.5 });
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [splitWidth, reactFlowInstance]);

  const handleStepUpdate = useCallback((stepId: string, updates: any) => {
    updateNodeData(stepId, updates);
  }, [updateNodeData]);

  const handleConnectionModalOpen = useCallback((piece: any) => {
    setConnectionPiece(piece);
    setShowConnectionModal(true);
  }, []);

  const handleConnectionModalClose = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionPiece(null);
  }, []);

  const handleConnectionCreated = useCallback((connection: Connection) => {
    // Handle the created connection if needed
    console.log('Connection created:', connection);
    // TODO: Update StepSettings with the new connection
    handleConnectionModalClose();
  }, [handleConnectionModalClose]);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="h-screen w-full flex flex-col bg-theme-background relative overflow-hidden">
      
      {/* Toolbar */}
      <div className="sticky top-0 z-10 h-[7vh] max-h-[10vh] flex items-center w-full border-b border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-4 w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToFlows}
              className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft size={16} className='m-0 p-0' />
              <span className="font-medium text-sm">Back to Flows</span>
            </button>
            <div className="h-6 w-px bg-white/20 dark:bg-white/10" />
            <h1 className="text-md font-semibold text-theme-primary">Flow Editor</h1>
            {isDirty && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fbbf24]/20 text-[#d97706] border border-[#fbbf24]/30">
                Unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">

            <ThemeToggle variant="button"  />
            <button
              onClick={() => saveWorkflow()}
              className="px-3 py-2 bg-theme-primary text-theme-inverse text-xs font-medium rounded-xl hover:bg-[#a08fff] transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
            >
              <Save size={15} className="inline mr-1" />
              Save
            </button>
            
            <button
              onClick={() => runWorkflow()}
              disabled={isRunning}
              className="px-3 py-2 bg-[#a4f5a6] text-[#222222] text-xs font-medium rounded-xl hover:bg-[#8dff8d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#a4f5a6]/20"
            >
              <Play size={15} className="inline mr-1" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div 
        id="flow-editor-container"
        className={`flex-1 relative ${isDragging ? 'cursor-col-resize' : ''}`}
      >
        {/* Split Layout */}
        <div className="flex h-full">
          {/* Canvas Section */}
          <div 
            className="relative"
            style={{ width: isStepSettingsOpen ? `${splitWidth}%` : '100%' }}
          >
            {/* Add Node Button - In Canvas */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => addEmptyNode()}
                className="flex items-center gap-2 px-3 py-2 bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl shadow-sm hover:bg-theme-input-focus transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
              >
                <Plus size={16} className="text-theme-primary" />
                <span className="text-sm font-medium text-theme-primary">Add Node</span>
              </button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onNodeContextMenu={handleContextMenu}
              onPaneClick={handleCanvasClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
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
              style={{ width: '100%', height: '100%' }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Resize Handler */}
          {isStepSettingsOpen && (
            <div
              className="w-1 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-col-resize flex items-center justify-center relative transition-colors duration-200"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-8 bg-theme-primary/50 rounded-full hover:bg-theme-primary transition-colors duration-200"></div>
              </div>
            </div>
          )}

          {/* Step Settings Panel */}
          {isStepSettingsOpen && selectedNode && (
            <div 
              className="bg-theme-form/95 backdrop-blur-md border-l border-white/20 dark:border-white/10 max-h-[93vh] overflow-hidden"
              style={{ width: `${100 - splitWidth}%` }}
            >
                             <StepSettings
                 isOpen={isStepSettingsOpen}
                 step={{
                   id: selectedNode.id,
                   name: selectedNode.data.label,
                   type: selectedNode.data.type === 'trigger' ? 'trigger' : 'action',
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
               />
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-theme-form/95 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              onClick={() => handleContextMenuAction('duplicate')}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
            <button
              onClick={() => handleContextMenuAction('swapAbove')}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Swap Above
            </button>
            <button
              onClick={() => handleContextMenuAction('swapBelow')}
              className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Swap Below
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
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Move After
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showMoveAfterSubmenu && contextMenu && (
                <div 
                  className={`absolute ${calculateSubmenuPosition().left} ${calculateSubmenuPosition().top} ${calculateSubmenuPosition().ml} bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg shadow-lg min-w-[200px] z-50`}
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
                    const nodesBelow = findNodesBelowInBranch(contextMenu.nodeId);
                    if (nodesBelow.length === 0) {
                      return (
                        <div className="px-4 py-2 text-sm text-theme-secondary">
                          No nodes available to Move After
                        </div>
                      );
                    }
                    return nodesBelow.map(nodeId => {
                      const node = nodes.find(n => n.id === nodeId);
                      return (
                        <button
                          key={nodeId}
                          onClick={() => {
                            moveNodeAfterInBranch(contextMenu.nodeId, nodeId);
                            setContextMenu(null);
                            setShowMoveAfterSubmenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors"
                        >
                          {node?.data.label || `Node ${nodeId.slice(-4)}`}
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
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Move Before
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {showMoveBeforeSubmenu && contextMenu && (
                <div 
                  className={`absolute ${calculateSubmenuPosition().left} ${calculateSubmenuPosition().top} ${calculateSubmenuPosition().ml} bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-lg shadow-lg min-w-[200px] z-50`}
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
                    const nodesAbove = findNodesAboveInBranch(contextMenu.nodeId);
                    if (nodesAbove.length === 0) {
                      return (
                        <div className="px-4 py-2 text-sm text-theme-secondary">
                          No nodes available to Move Before
                        </div>
                      );
                    }
                    return nodesAbove.map(nodeId => {
                      const node = nodes.find(n => n.id === nodeId);
                      return (
                        <button
                          key={nodeId}
                          onClick={() => {
                            moveNodeBeforeInBranch(contextMenu.nodeId, nodeId);
                            setContextMenu(null);
                            setShowMoveBeforeSubmenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-colors"
                        >
                          {node?.data.label || `Node ${nodeId.slice(-4)}`}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <div className="border-t border-white/20 dark:border-white/10 my-1"></div>
            <button
              onClick={() => handleContextMenuAction('delete')}
              className="w-full px-4 py-2 text-left text-sm text-[#ef4a45] hover:bg-[#ef4a45]/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Piece Selector Modal */}
      {isPieceSelectorOpen && (
        <FlowPieceSelector
          isOpen={isPieceSelectorOpen}
          onClose={() => {
            setIsPieceSelectorOpen(false);
            setSelectedNodeId(null);
          }}
          onSelectPiece={handlePieceSelect}
          type="action"
          nodePosition={pieceSelectorPosition}
        />
      )}

      {/* Connection Setup Modal */}
      {showConnectionModal && connectionPiece && (
        <ConnectionSetupModal
          isOpen={showConnectionModal}
          onClose={handleConnectionModalClose}
          piece={connectionPiece}
          onConnectionCreated={handleConnectionCreated}
        />
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-theme-primary">Unsaved Changes</h3>
              <p className="mt-1 text-sm text-theme-secondary">
                You have unsaved changes that will be lost if you continue. Are you sure you want to leave?
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
                  navigate('/flows');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] focus:outline-none focus:ring-2 focus:ring-[#ef4a45]/20"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
