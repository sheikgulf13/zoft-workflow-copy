import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useContextStore, type ContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";

type PrevNode = { id: string; displayName: string; stepName?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  previousNodes: PrevNode[];
};

export default function DataSelectorModal({ isOpen, onClose, previousNodes }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const modalWidth = 500;
  const project = useContextStore((s: ContextStore) => s.currentProject);
  const [optionsByStep, setOptionsByStep] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const flowId = useMemo(() => {
    try {
      const stored = sessionStorage.getItem("zw_current_flow");
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string };
        if (parsed?.id) return parsed.id;
      }
    } catch { /* noop */ }
    const last = sessionStorage.getItem("zw_last_created_flow_id");
    return last || undefined;
  }, []);

  useEffect(() => {
    if (!isOpen || !project?.id || !flowId) return;
    (async () => {
      try {
        setIsLoading(true);
        const resp = await http.get(`/projects/${project.id}/flows/${flowId}/sample-data`);
        const dataRoot = (resp.data as { data?: { sampleData?: Array<Record<string, unknown>> } } | undefined)?.data;
        const list: Array<Record<string, unknown>> = Array.isArray(dataRoot?.sampleData) ? (dataRoot!.sampleData as Array<Record<string, unknown>>) : [];
        const map: Record<string, string[]> = {};
        list.forEach((item) => {
          const stepName = String((item?.stepName as string) ?? "");
          const dataObj = item?.data as Record<string, unknown> | undefined;
          if (!stepName || !dataObj || typeof dataObj !== "object") return;
          map[stepName] = Object.keys(dataObj);
        });
        setOptionsByStep(map);
      } catch {
        setOptionsByStep({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen, project?.id, flowId]);
  if (!isOpen) return null;
  const container = document.getElementById("flow-editor-container");
  const canvasTarget = container?.querySelector(".react-flow") as HTMLElement | null;
  const target = canvasTarget || container;
  if (!target) return null;
  return createPortal(
      <div
        className={`absolute bottom-6 right-5 z-50 pointer-events-auto ${isMinimized ? "h-[48px]" : "h-[72vh]"}`}
        style={{ width: `${modalWidth}px` }}
      >
        <div className="rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/20 dark:border-white/10">
            <h3 className="text-base font-semibold text-theme-primary">Data Selector</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized((v: boolean) => !v)}
                className="px-2 py-1 text-sm rounded-xl bg-theme-input hover:bg-theme-input-focus text-theme-primary border border-white/20 dark:border-white/10"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M7 14h10v2H7z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M6 19h12v-2H6v2zM6 7h12V5H6v2zm0 6h12v-2H6v2z"/></svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-2 py-1 text-sm rounded-xl bg-theme-input hover:bg-theme-input-focus text-theme-primary border border-white/20 dark:border-white/10"
              >
                Close
              </button>
            </div>
          </div>
          {!isMinimized && (
            <div className="p-4 space-y-2 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              {previousNodes.length === 0 ? (
                <div className="text-sm text-theme-secondary">No previous steps found</div>
              ) : (
                previousNodes.map((n) => (
                  <div key={n.id} className="border border-white/20 dark:border-white/10 rounded-xl overflow-hidden mb-3 shadow-sm bg-theme-form/70">
                    <button
                      type="button"
                      onClick={() => setOpenId((v: string | null) => (v === n.id ? null : n.id))}
                      className="w-full px-3 py-2 flex items-center justify-between bg-theme-input/70 hover:bg-theme-input-focus text-theme-primary"
                    >
                      <span className="truncate text-left font-medium">{n.displayName}</span>
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 text-theme-secondary transition-transform ${openId === n.id ? "rotate-180" : ""}`}>
                        <path fill="currentColor" d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>
                    {openId === n.id && (
                      <div className="p-3 space-y-1 bg-theme-form/70">
                        {isLoading ? (
                          <div className="text-xs text-theme-secondary">Loading options...</div>
                        ) : (
                          <>
                            {(optionsByStep[(n.stepName || n.id)] || []).length === 0 ? (
                              <div className="text-xs text-theme-secondary">No options available</div>
                            ) : (
                              <div className="divide-y divide-white/10">
                                {(optionsByStep[(n.stepName || n.id)] || []).map((k: string) => (
                                  <button
                                    key={`${n.id}::${k}`}
                                    type="button"
                                    onClick={() => {
                                      const token = `{{${(n.stepName || n.id)}.${k}}}`;
                                      try {
                                        const evt = new CustomEvent("zw:insert-data-token", { detail: { token } });
                                        window.dispatchEvent(evt);
                                      } catch { /* noop */ }
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-theme-primary hover:bg-theme-input-focus hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                                  >
                                    {k}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>,
    target
  );
}


