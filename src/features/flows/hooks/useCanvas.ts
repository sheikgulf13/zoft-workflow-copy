import { useState, useCallback, useEffect } from "react";

interface CanvasState {
  scale: number;
  position: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

interface UseCanvasOptions {
  minScale?: number;
  maxScale?: number;
  zoomFactor?: number;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const { minScale = 0.1, maxScale = 5, zoomFactor = 1.2 } = options;
  const [state, setState] = useState<CanvasState>({
    scale: 1,
    position: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
  });

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * zoomFactor, maxScale),
    }));
  }, [zoomFactor, maxScale]);
  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / zoomFactor, minScale),
    }));
  }, [zoomFactor, minScale]);
  const resetZoom = useCallback(() => {
    setState((prev) => ({ ...prev, scale: 1, position: { x: 0, y: 0 } }));
  }, []);
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
      setState((prev) => ({
        ...prev,
        scale: Math.max(minScale, Math.min(maxScale, prev.scale * delta)),
      }));
    },
    [zoomFactor, minScale, maxScale]
  );
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setState((prev) => ({
        ...prev,
        isDragging: true,
        dragStart: {
          x: e.clientX - prev.position.x,
          y: e.clientY - prev.position.y,
        },
      }));
    }
  }, []);
  const updateDrag = useCallback((e: React.MouseEvent) => {
    setState((prev) => {
      if (!prev.isDragging) return prev;
      return {
        ...prev,
        position: {
          x: e.clientX - prev.dragStart.x,
          y: e.clientY - prev.dragStart.y,
        },
      };
    });
  }, []);
  const stopDrag = useCallback(() => {
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    ...state,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    startDrag,
    updateDrag,
    stopDrag,
  };
}
