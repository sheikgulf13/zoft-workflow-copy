import { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { toastError } from '../ui/Toast';
import { useContextStore } from '../../stores/contextStore';
import { http } from '../../lib/http';
import type { Connection } from '../../types/connection';

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

// Types
export interface StepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  step: {
    id: string;
    name: string;
    type: 'action' | 'trigger';
    pieceName?: string;
    actionName?: string;
    triggerName?: string;
    displayName: string;
    logoUrl?: string;
    config?: Record<string, unknown>;
  } | null;
  onUpdateStep: (stepId: string, updates: Partial<StepSettingsProps['step']>) => void;
  onConnectionModalOpen: (piece: any) => void;
}

export default function StepSettings({
  isOpen,
  onClose,
  step,
  onUpdateStep,
  onConnectionModalOpen
}: StepSettingsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [topSectionHeight, setTopSectionHeight] = useState(90); // Percentage for top section height
  const [isDragging, setIsDragging] = useState(false);
  const currentProject = useContextStore((state) => state.currentProject);

  const loadConnections = useCallback(async () => {
    if (!step?.pieceName || !currentProject?.id) return;
    
    try {
      setIsLoadingConnections(true);
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.BACKEND_API_URL || "";
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/projects/${currentProject.id}/app-connections`;
      
      const response = await http.get<{ connections: Connection[] }>(url);
      const allConnections = response.data.connections || [];
      
      // Filter connections by piece name
      const filteredConnections = allConnections.filter(
        connection => connection.pieceName === step.pieceName
      );
      
      setConnections(filteredConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toastError('Failed to load connections', 'Unable to fetch connections for this piece');
    } finally {
      setIsLoadingConnections(false);
    }
  }, [step?.pieceName, currentProject?.id]);

  // Load connections for the piece
  useEffect(() => {
    if (isOpen && step?.pieceName) {
      loadConnections();
    }
  }, [isOpen, step?.pieceName, loadConnections]);

  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnection(connectionId);
    // Update step configuration with selected connection
    if (step) {
      onUpdateStep(step.id, {
        config: {
          ...step.config,
          connectionId
        }
      });
    }
  };

  const fetchPieceDetails = async (pieceName: string) => {
    try {
      console.log('Fetching piece details for:', pieceName);
      
      // The pieceName from step is the full Activepieces piece name like "@activepieces/piece-agent"
      // We need to extract the piece identifier from it
      const pieceIdentifier = pieceName.replace('@activepieces/piece-', '');
      
      const response = await fetch("https://cloud.activepieces.com/api/v1/pieces");
      const pieces = await response.json();
      
      // Find the piece by matching the name or identifier
      const piece = pieces.find((p: ActivePiece) => 
        p.name === pieceIdentifier || 
        p.name === pieceName ||
        `@activepieces/piece-${p.name}` === pieceName
      );
      
      console.log('Found piece:', piece);
      return piece;
    } catch (error) {
      console.error('Failed to fetch piece details:', error);
      toastError('Failed to load piece details', 'Unable to fetch piece configuration');
      return null;
    }
  };

  const handleCreateConnection = async () => {
    if (!step?.pieceName) return;
    
    // Try to fetch piece details, but open modal even if it fails
    const pieceDetails = await fetchPieceDetails(step.pieceName);
    
    // Create piece object for the modal
    const piece = pieceDetails || {
      id: step?.id || '',
      name: step?.pieceName || '',
      displayName: step?.displayName || '',
      logoUrl: step?.logoUrl || '',
      description: '',
      categories: [],
      actions: 0,
      triggers: 0,
    };
    
    onConnectionModalOpen(piece);
  };



  // Handle vertical resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('step-settings-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Limit the split between 30% and 80%
    const clampedHeight = Math.max(20, Math.min(90, newHeight));
    setTopSectionHeight(clampedHeight);
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

  if (!isOpen || !step) return null;

  return (
    <>
      <div className="h-full w-full bg-theme-form/95 backdrop-blur-md flex flex-col">
     

        {/* Vertical Split Layout */}
        <div 
          id="step-settings-container" 
          className={`flex-1 flex flex-col min-h-0 ${isDragging ? 'cursor-row-resize' : ''}`}
        >
          {/* Top Section - Step Settings */}
          <div 
            className="flex flex-col min-h-0 border-b border-white/20 dark:border-white/10" 
            style={{ height: `${topSectionHeight}%` }}
          >
               {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center gap-3">
            {step.logoUrl && (
              <img
                src={step.logoUrl}
                alt={step.displayName}
                className="w-8 h-8 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32x32?text=?';
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
         

            {/* Step Settings Content */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              <div className="p-4 space-y-6">
                {/* Connection Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-theme-primary">Connection</h3>
                    <button
                      onClick={handleCreateConnection}
                      className="flex items-center gap-1 text-sm text-[#b3a1ff] hover:text-[#a08fff] transition-all duration-200"
                    >
                      <Plus size={14} />
                      Create
                    </button>
                  </div>
                  
                  {isLoadingConnections ? (
                    <div className="text-sm text-theme-secondary">Loading connections...</div>
                  ) : connections.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-theme-secondary mb-3">No connections available for this piece</div>
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
                          onClick={() => handleConnectionSelect(connection.id)}
                          className={`w-full p-3 text-left border rounded-xl transition-all duration-200 ${
                            selectedConnection === connection.id
                              ? 'border-[#b3a1ff] bg-[#b3a1ff]/10'
                              : 'border-white/20 dark:border-white/10 hover:bg-theme-input-focus'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {connection.metadata?.pieceLogoUrl && (
                              <img
                                src={connection.metadata.pieceLogoUrl}
                                alt={connection.displayName}
                                className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32x32?text=?';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-theme-primary truncate">{connection.displayName}</div>
                              <div className="text-sm text-theme-secondary">
                                Created: {new Date(connection.created).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step Configuration */}
                <div>
                  <h3 className="text-sm font-medium text-theme-primary mb-3">Configuration</h3>
                  <div className="space-y-3">
                    {/* Step Name */}
                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-1">
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => onUpdateStep(step.id, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                      />
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={step.displayName}
                        onChange={(e) => onUpdateStep(step.id, { displayName: e.target.value })}
                        className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                      />
                    </div>

                    {/* Piece-specific configuration would go here */}
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

          {/* Horizontal Resize Handler */}
          <div 
            className="h-1 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-row-resize flex items-center justify-center relative transition-all duration-200"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-8 bg-theme-primary/50 rounded-full hover:bg-theme-primary transition-all duration-200"></div>
            </div>
          </div>

          {/* Bottom Section - Sample Detail */}
          <div 
            className="flex flex-col min-h-0" 
            style={{ height: `${100 - topSectionHeight}%` }}
          >
            <div className="flex-shrink-0 p-4 border-b border-white/20 dark:border-white/10">
              <h3 className="text-sm font-medium text-theme-primary">Sample Detail</h3>
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              <div className="p-4 space-y-4">
                <div className="text-sm text-theme-secondary">
                  This section will contain additional details and sample data for the selected step.
                </div>
                
                {/* Test content to demonstrate scrolling */}
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="p-3 bg-theme-input/50 rounded-xl border border-white/20 dark:border-white/10">
                    <div className="text-sm font-medium text-theme-primary">Sample Item {i + 1}</div>
                    <div className="text-xs text-theme-secondary mt-1">
                      This is sample content to demonstrate the scrolling functionality in the bottom section.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
