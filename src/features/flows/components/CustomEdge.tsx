import { getBezierPath, EdgeLabelRenderer } from "reactflow";
import type { EdgeProps } from "reactflow";
import { Plus } from "lucide-react";
import { useState } from "react";

type EdgeData = {
  suppressPlus?: boolean;
  onAddNode?: (edgeId: string, position: { x: number; y: number }) => void;
};
export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [isHovered, setIsHovered] = useState(false);
  const suppressPlus = Boolean(data?.suppressPlus);
  const onEdgeClick = () => {
    if (!suppressPlus && data?.onAddNode) {
      data.onAddNode(id, { x: labelX, y: labelY });
    }
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          transition: "stroke 120ms ease, stroke-width 120ms ease",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={isHovered ? 2.8 : 2}
        stroke={isHovered ? "#b3a1ff" : "#b3a1ff80"}
        fill="none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {!suppressPlus && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              className="w-6 h-6 bg-theme-form/95 backdrop-blur-md border-2 border-white/20 dark:border-white/10 rounded-full flex items-center justify-center hover:border-[#b3a1ff]/50 hover:bg-[#b3a1ff]/10 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b3a1ff]/20"
              onClick={onEdgeClick}
              title="Add node between"
            >
              <Plus size={12} className="text-theme-primary" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
