import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  Play, 
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ChevronDown
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

// Node type definitions
export type WorkflowNodeData = {
  label: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'webhook' | 'email' | 'database' | 'end';
  status?: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  description?: string;
  config?: Record<string, unknown>;
  pieceName?: string;
  actionName?: string;
  triggerName?: string;
  logoUrl?: string;
  onNodeClick?: (nodeId: string) => void;
  isEmpty?: boolean; // Flag to identify empty nodes that need configuration
};

// Base node wrapper with error boundary
const NodeWrapper = memo(({ children, data }: { children: React.ReactNode; data: WorkflowNodeData }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return 'border-[#b3a1ff] bg-[#b3a1ff]/10 backdrop-blur-md';
      case 'success': return 'border-[#a4f5a6] bg-[#a4f5a6]/10 backdrop-blur-md';
      case 'error': return 'border-[#ef4a45] bg-[#ef4a45]/10 backdrop-blur-md';
      case 'waiting': return 'border-[#fbbf24] bg-[#fbbf24]/10 backdrop-blur-md';
      default: return 'border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md';
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'running': return <Clock size={12} className="text-[#b3a1ff]" />;
      case 'success': return <CheckCircle size={12} className="text-[#a4f5a6]" />;
      case 'error': return <AlertCircle size={12} className="text-[#ef4a45]" />;
      case 'waiting': return <Clock size={12} className="text-[#fbbf24]" />;
      default: return null;
    }
  };

  return (
    <div className={`relative rounded-2xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg cursor-pointer ${getStatusColor()}`}>
      {children}
      {data.status && data.status !== 'idle' && (
        <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-theme-form/95 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 shadow-sm">
          {getStatusIcon()}
        </div>
      )}
    </div>
  );
});

NodeWrapper.displayName = 'NodeWrapper';

// Trigger Node
export const TriggerNode = memo(({ id, data }: { id: string; data: WorkflowNodeData }) => {
  const handleClick = () => {
    data.onNodeClick?.(id);
  };

  // Special styling for empty trigger nodes - same size as empty action nodes
  if (data.isEmpty) {
    return (
      <div className="relative rounded-2xl border-2 border-dashed border-white/30 dark:border-white/20 bg-theme-form/50 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-lg hover:border-[#b3a1ff]/50">
        <div 
          className="p-3 w-[180px] h-[70px] cursor-pointer flex flex-col justify-center"
          onClick={handleClick}
        >
          <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
          <div className="flex items-center gap-2 mb-1">
            <Play size={16} className="text-[#b3a1ff]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-theme-tertiary">
            Click to configure
          </div>
          <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#b3a1ff] border-0" />
        </div>
      </div>
    );
  }

  // Configured trigger node
  return (
    <NodeWrapper data={data}>
      <div 
        className="p-3 w-[180px] h-[70px] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
        onClick={handleClick}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
        <div className="flex items-center gap-2 mb-1">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" className="w-4 h-4 rounded" />
          ) : (
            <Play size={16} className="text-[#b3a1ff]" />
          )}
          <span className="text-xs font-medium text-theme-primary truncate">
            {data.label}
          </span>
        </div>
        {data.description && (
          <Tooltip content={data.description}>
            <div className="text-xs text-theme-secondary truncate">
              {data.description}
            </div>
          </Tooltip>
        )}
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#b3a1ff] border-0" />
      </div>
    </NodeWrapper>
  );
});

TriggerNode.displayName = 'TriggerNode';

// Action Node
export const ActionNode = memo(({ id, data }: { id: string; data: WorkflowNodeData }) => {
  const handleClick = () => {
    data.onNodeClick?.(id);
  };

  // Special styling for empty nodes
  if (data.isEmpty) {
    return (
      <div className="relative rounded-2xl border-2 border-dashed border-white/30 dark:border-white/20 bg-theme-form/50 backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-lg hover:border-[#a4f5a6]/50">
        <div 
          className="p-3 w-[180px] h-[70px] cursor-pointer flex flex-col justify-center"
          onClick={handleClick}
        >
          <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
          <div className="flex items-center gap-2 mb-1">
            <Plus size={16} className="text-theme-tertiary" />
            <span className="text-xs font-medium text-theme-secondary truncate">
              {data.label}
            </span>
          </div>
          <div className="text-xs text-theme-tertiary">
            Click to configure
          </div>
          <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-theme-tertiary border-0" />
        </div>
      </div>
    );
  }

  return (
    <NodeWrapper data={data}>
      <div 
        className="p-3 w-[180px] h-[70px] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
        onClick={handleClick}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
        <div className="flex items-center gap-2 mb-1">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" className="w-4 h-4 rounded" />
          ) : (
            <Zap size={16} className="text-[#a4f5a6]" />
          )}
          <span className="text-xs font-medium text-theme-primary truncate">
            {data.label}
          </span>
        </div>
        {data.description && (
          <Tooltip content={data.description}>
            <div className="text-xs text-theme-secondary truncate">
              {data.description}
            </div>
          </Tooltip>
        )}
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#a4f5a6] border-0" />
      </div>
    </NodeWrapper>
  );
});

ActionNode.displayName = 'ActionNode';

// Condition Node
export const ConditionNode = memo(({ id, data }: { id: string; data: WorkflowNodeData }) => {
  const handleClick = () => {
    data.onNodeClick?.(id);
  };

  return (
    <NodeWrapper data={data}>
      <div 
        className="p-3 w-[180px] h-[70px] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
        onClick={handleClick}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
        <div className="flex items-center gap-2 mb-1">
          <ChevronDown size={16} className="text-[#fbbf24]" />
          <span className="text-xs font-medium text-theme-primary truncate">
            {data.label}
          </span>
        </div>
        {data.description && (
          <Tooltip content={data.description}>
            <div className="text-xs text-theme-secondary truncate">
              {data.description}
            </div>
          </Tooltip>
        )}
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#fbbf24] border-0" />
        <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-[#ef4a45] border-0" />
      </div>
    </NodeWrapper>
  );
});

ConditionNode.displayName = 'ConditionNode';

// Delay Node
export const DelayNode = memo(({ id, data }: { id: string; data: WorkflowNodeData }) => {
  const handleClick = () => {
    data.onNodeClick?.(id);
  };

  return (
    <NodeWrapper data={data}>
      <div 
        className="p-3 w-[180px] h-[70px] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
        onClick={handleClick}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-[#8b5cf6]" />
          <span className="text-xs font-medium text-theme-primary truncate">
            {data.label}
          </span>
        </div>
        {data.description && (
          <Tooltip content={data.description}>
            <div className="text-xs text-theme-secondary truncate">
              {data.description}
            </div>
          </Tooltip>
        )}
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-[#8b5cf6] border-0" />
      </div>
    </NodeWrapper>
  );
});

DelayNode.displayName = 'DelayNode';

// End Node
export const EndNode = memo(({ data }: { data: WorkflowNodeData }) => {
  return (
    <NodeWrapper data={data}>
      <div className="p-3 w-[180px] h-[70px] text-center flex flex-col justify-center">
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-theme-tertiary border-0" />
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-theme-secondary/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-theme-secondary"></div>
          </div>
        </div>
        <div className="text-xs font-medium text-theme-primary">
          End
        </div>
      </div>
    </NodeWrapper>
  );
});

EndNode.displayName = 'EndNode';

// Error Boundary for nodes
class NodeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Node rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 border-2 border-[#ef4a45]/50 bg-[#ef4a45]/10 backdrop-blur-md rounded-2xl">
          <div className="flex items-center gap-2 text-[#ef4a45]">
            <AlertCircle size={16} />
            <span className="text-xs font-medium">Node Error</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap each node type with error boundary
const withErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => (
    <NodeErrorBoundary>
      <Component {...props} />
    </NodeErrorBoundary>
  );
};

export const SafeTriggerNode = withErrorBoundary(TriggerNode);
export const SafeActionNode = withErrorBoundary(ActionNode);
export const SafeConditionNode = withErrorBoundary(ConditionNode);
export const SafeDelayNode = withErrorBoundary(DelayNode);
export const SafeEndNode = withErrorBoundary(EndNode);