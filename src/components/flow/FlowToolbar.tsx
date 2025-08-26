import { useCallback } from 'react';
import { 
  Plus, 
  Play, 
  Save
} from 'lucide-react';
import { toastError } from '../ui/Toast';

interface FlowToolbarProps {
  onAddEmptyNode: (position: { x: number; y: number }) => void;
  onSave?: () => void;
  onRun?: () => void;
  isRunning?: boolean;
}

export default function FlowToolbar({ 
  onAddEmptyNode, 
  onSave, 
  onRun, 
  isRunning = false
}: FlowToolbarProps) {

  const handleAddEmptyNode = useCallback(() => {
    try {
      // Calculate center position for new node
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      onAddEmptyNode({ x: centerX, y: centerY });
    } catch (error) {
      console.error('Failed to add empty node:', error);
      toastError('Add node failed', 'Failed to add empty node to workflow');
    }
  }, [onAddEmptyNode]);

  const handleSave = useCallback(() => {
    try {
      onSave?.();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toastError('Save failed', 'Failed to save workflow');
    }
  }, [onSave]);

  const handleRun = useCallback(() => {
    try {
      onRun?.();
    } catch (error) {
      console.error('Failed to run workflow:', error);
      toastError('Run failed', 'Failed to run workflow');
    }
  }, [onRun]);

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      {/* Add Node Button */}
      <button
        onClick={handleAddEmptyNode}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Plus size={16} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Add Node</span>
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onSave && (
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={16} className="inline mr-1" />
            Save
          </button>
        )}
        
        {onRun && (
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={16} className="inline mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
        )}
      </div>
    </div>
  );
}
