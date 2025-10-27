import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import {
  Play,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ChevronDown,
  GitBranch,
  RefreshCcw,
  Code,
} from "lucide-react";
import { Tooltip } from "../../../components/ui/Tooltip";

export type WorkflowNodeData = {
  label: string;
  type:
    | "trigger"
    | "action"
    | "condition"
    | "delay"
    | "router"
    | "loop"
    | "webhook"
    | "email"
    | "database"
    | "end"
    | "routerBranch"
    | "code";
  status?: "idle" | "running" | "success" | "error" | "waiting";
  description?: string;
  config?: Record<string, unknown>;
  pieceName?: string;
  actionName?: string;
  triggerName?: string;
  logoUrl?: string;
  onNodeClick?: (nodeId: string) => void;
  isEmpty?: boolean;
  name?: string; // internal identifier for validation payloads
  validationErrors?: string[]; // names of missing required fields
  optionProps?: string[];
  optionPropsRequiredByName?: Record<string, boolean>;
  optionPropTypesByName?: Record<string, string>;
  optionPropRefreshersByName?: Record<string, string[]>;
};

const ValidationBadge: React.FC<{ errors?: string[] }> = ({ errors }) => {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const content = errors.length === 1 ? `Missing: ${errors[0]}` : `Missing: ${errors.join(", ")}`;
  return (
    <Tooltip className="absolute bottom-0 right-0" content={content}>
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-theme-form/95 text-[#ef4a45]">
        <AlertCircle size={12} className="text-[#ef4a45]" />
      </div>
    </Tooltip>
  );
};

const NodeWrapper = memo(
  ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: WorkflowNodeData;
  }) => {
    const getStatusColor = () => {
      switch (data.status) {
        case "running":
          return "border-[#b3a1ff] bg-[#b3a1ff]/10 backdrop-blur-md";
        case "success":
          return "border-[#a4f5a6] bg-[#a4f5a6]/10 backdrop-blur-md";
        case "error":
          return "border-[#ef4a45] bg-[#ef4a45]/10 backdrop-blur-md";
        case "waiting":
          return "border-[#fbbf24] bg-[#fbbf24]/10 backdrop-blur-md";
        default:
          return "border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md";
      }
    };

    const getStatusIcon = () => {
      switch (data.status) {
        case "running":
          return <Clock size={12} className="text-[#b3a1ff]" />;
        case "success":
          return <CheckCircle size={12} className="text-[#a4f5a6]" />;
        case "error":
          return <AlertCircle size={12} className="text-[#ef4a45]" />;
        case "waiting":
          return <Clock size={12} className="text-[#fbbf24]" />;
        default:
          return null;
      }
    };

    const hasValidation = Array.isArray(data.validationErrors) && data.validationErrors.length > 0;
    return (
      <div
        className={`relative rounded-2xl border-1 shadow-sm transition-all duration-200 cursor-pointer zw-node ${getStatusColor()} ${hasValidation ? "border-[#ef4a45] bg-[#ef4a45]/5" : ""}`}
        data-has-validation={hasValidation ? "1" : "0"}
        aria-invalid={hasValidation ? true : undefined}
      >
        {children}
        {data.status && data.status !== "idle" && (
          <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-theme-form/95 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 shadow-sm">
            {getStatusIcon()}
          </div>
        )}
        {data.status === "running" && (
          <>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          </>
        )}
      </div>
    );
  }
);

NodeWrapper.displayName = "NodeWrapper";

export const TriggerNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };

    if (data.isEmpty) {
      return (
        <div
          className={`relative rounded-2xl border-2 border-dashed ${
            data.status === "error"
              ? "border-[#ef4a45] bg-[#ef4a45]/10"
              : "border-white/30 dark:border-white/20 bg-theme-form/50 hover:border-[#b3a1ff]/50"
          } backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-lg`}
        >
          <div
            className="p-3 w-[180px] h-[70px] cursor-pointer flex flex-col justify-center"
            onClick={handleClick}
          >
            <Handle
              type="target"
              position={Position.Left}
              className="w-2 h-2 !bg-theme-tertiary border-0"
            />
            <div className="flex items-center gap-2 mb-1">
              <Play size={16} className="text-[#b3a1ff]" />
              <span className="text-xs font-medium text-theme-primary truncate">
                {data.label}
              </span>
            </div>
            <div className="text-xs text-theme-tertiary">
              Click to configure
            </div>
            <Handle
              type="source"
              position={Position.Right}
              className="w-2 h-2 !bg-[#b3a1ff] border-0"
            />
          </div>
        </div>
      );
    }

    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[180px] h-[70px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
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
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-[#b3a1ff] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

TriggerNode.displayName = "TriggerNode";

export const ActionNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };

    if (data.isEmpty) {
      return (
        <div
          className={`relative rounded-2xl border-2 border-dashed ${
            data.status === "error"
              ? "border-[#ef4a45] bg-[#ef4a45]/10"
              : "border-white/30 dark:border-white/20 bg-theme-form/50 hover:border-[#a4f5a6]/50"
          } backdrop-blur-md shadow-sm transition-all duration-200 hover:shadow-lg`}
        >
          <div
            className="p-3 w-[180px] h-[70px] cursor-pointer flex flex-col justify-center"
            onClick={handleClick}
          >
            <Handle
              type="target"
              position={Position.Left}
              className="w-2 h-2 !bg-theme-tertiary border-0"
            />
            <div className="flex items-center gap-2 mb-1">
              <Plus size={16} className="text-theme-tertiary" />
              <span className="text-xs font-medium text-theme-secondary truncate">
                {data.label}
              </span>
            </div>
            <div className="text-xs text-theme-tertiary">
              Click to configure
            </div>
            <Handle
              type="source"
              position={Position.Right}
              className="w-2 h-2 !bg-theme-tertiary border-0"
            />
          </div>
        </div>
      );
    }

    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[180px] h-[70px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
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
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-[#a4f5a6] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

ActionNode.displayName = "ActionNode";

export const ConditionNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };

    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[180px] h-[70px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <ChevronDown size={16} className="text-[#fbbf24]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label}
            </span>
          </div>
          {data.description && (
            <Tooltip content={data.description} className="block w-full">
              <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {data.description}
              </div>
            </Tooltip>
          )}
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-[#fbbf24] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

ConditionNode.displayName = "ConditionNode";

export const DelayNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };

    return (
      <NodeWrapper data={data}>
        <div
          className="p-3 w-[180px] h-[70px] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Top}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-[#8b5cf6]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label}
            </span>
          </div>
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-2 h-2 !bg-[#8b5cf6] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

DelayNode.displayName = "DelayNode";

export const RouterNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };

    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[200px] h-[86px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={16} className="text-[#60a5fa]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label || "Router"}
            </span>
          </div>
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          {/* three outputs on bottom, one output on right */}
          <Handle
            id="route-1"
            type="source"
            position={Position.Bottom}
            style={{ left: 30 }}
            className="w-2 h-2 !bg-[#60a5fa] border-0"
          />
          <Handle
            id="route-2"
            type="source"
            position={Position.Bottom}
            style={{ left: 100 }}
            className="w-2 h-2 !bg-[#60a5fa] border-0"
          />
          <Handle
            id="route-3"
            type="source"
            position={Position.Bottom}
            style={{ left: 170 }}
            className="w-2 h-2 !bg-[#60a5fa] border-0"
          />
          <Handle
            id="route-main"
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-[#60a5fa] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

RouterNode.displayName = "RouterNode";

export const LoopNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };
    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[190px] h-[80px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <RefreshCcw size={16} className="text-[#34d399]" />
              <div
                className="absolute inset-0 animate-spin-slow"
                style={{ animationDuration: "6s" }}
              >
                <RefreshCcw size={16} className="opacity-20 text-[#34d399]" />
              </div>
            </div>
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label || "Loop"}
            </span>
          </div>
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          <Handle
            id="loop-done"
            type="source"
            position={Position.Right}
            style={{ top: 28 }}
            className="w-2 h-2 !bg-[#34d399] border-0"
          />
          <Handle
            id="loop-items"
            type="source"
            position={Position.Right}
            style={{ bottom: 12, top: "auto" }}
            className="w-2 h-2 !bg-[#34d399] border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

LoopNode.displayName = "LoopNode";

// RouterBranchNode: branch placeholder with a single top target handle and no side handles
export const RouterBranchNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };
    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[180px] h-[64px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Top}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={16} className="text-[#60a5fa]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label}
            </span>
          </div>
          <div className="relative">
            {data.description && (
              <Tooltip content={data.description} className="block w-full">
                <div className="text-xs text-theme-secondary w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {data.description}
                </div>
              </Tooltip>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          {/* No side or bottom handles to force incoming-only from router */}
        </div>
      </NodeWrapper>
    );
  }
);

RouterBranchNode.displayName = "RouterBranchNode";

// CodeNode: code execution node with standard handles
export const CodeNode = memo(
  ({ id, data }: { id: string; data: WorkflowNodeData }) => {
    const handleClick = () => {
      data.onNodeClick?.(id);
    };
    return (
      <NodeWrapper data={data}>
        <div
          className="relative p-3 w-[190px] h-[80px] transition-all duration-200 flex flex-col justify-between"
          onClick={handleClick}
        >
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
          <div className="flex items-center gap-2 mb-1">
            <Code size={16} className="text-[#f59e0b]" />
            <span className="text-xs font-medium text-theme-primary truncate">
              {data.label || "Code"}
            </span>
          </div>
          <div className="relative">
            {data.description && (
              <p className="text-xs text-theme-secondary line-clamp-2">
                {data.description}
              </p>
            )}
            <div className="absolute bottom-0 right-0">
              <ValidationBadge errors={data.validationErrors} />
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-theme-tertiary border-0"
          />
        </div>
      </NodeWrapper>
    );
  }
);

CodeNode.displayName = "CodeNode";

export const EndNode = memo(({ data }: { data: WorkflowNodeData }) => {
  return (
    <NodeWrapper data={data}>
      <div className="p-3 w-[180px] h-[70px] text-center flex flex-col justify-center">
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 !bg-theme-tertiary border-0"
        />
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-theme-secondary/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-theme-secondary"></div>
          </div>
        </div>
        <div className="text-xs font-medium text-theme-primary">End</div>
      </div>
    </NodeWrapper>
  );
});

EndNode.displayName = "EndNode";
