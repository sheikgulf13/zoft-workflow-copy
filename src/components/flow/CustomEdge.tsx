import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { Plus } from 'lucide-react';

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
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    if (data?.onAddNode) {
      data.onAddNode(id, { x: labelX, y: labelY });
    }
  };

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={2}
        stroke="#b3a1ff80"
        fill="none"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
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
    </>
  );
}
