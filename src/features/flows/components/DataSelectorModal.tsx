import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useContextStore, type ContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";

type PrevNode = { id: string; displayName: string; stepName?: string; isWebhookTrigger?: boolean };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  previousNodes: PrevNode[];
};

export default function DataSelectorModal({ isOpen, onClose, previousNodes }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
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
  // Always open maximized when the modal is shown
  useEffect(() => {
    if (isOpen) setIsMinimized(false);
  }, [isOpen]);
  // Broadcast minimized state for other UI (e.g., MiniMap) to react to
  useEffect(() => {
    try {
      const evt = new CustomEvent("zw:data-selector:minimized", { detail: { minimized: isMinimized } });
      window.dispatchEvent(evt);
    } catch { /* noop */ }
  }, [isMinimized]);
  useEffect(() => {
    return () => {
      try {
        const evt = new CustomEvent("zw:data-selector:minimized", { detail: { minimized: false } });
        window.dispatchEvent(evt);
      } catch { /* noop */ }
    };
  }, []);
  // Broadcast minimized state for other UI (e.g., MiniMap) to react to
  useEffect(() => {
    try {
      const evt = new CustomEvent("zw:data-selector:minimized", { detail: { minimized: isMinimized } });
      window.dispatchEvent(evt);
    } catch { /* noop */ }
  }, [isMinimized]);
  useEffect(() => {
    return () => {
      try {
        const evt = new CustomEvent("zw:data-selector:minimized", { detail: { minimized: false } });
        window.dispatchEvent(evt);
      } catch { /* noop */ }
    };
  }, []);
  if (!isOpen) return null;
  const container = document.getElementById("flow-editor-container");
  const canvasTarget = container?.querySelector(".react-flow") as HTMLElement | null;
  const target = canvasTarget || container;
  if (!target) return null;
  return createPortal(
      <div
        className={`absolute bottom-[1.2vw] right-[1.2vw] z-50 pointer-events-auto transition-all duration-300 ${isMinimized ? "max-h-[3.4vw]" : "h-[72vh]"}`}
        style={{ width: `${Math.round(window.innerWidth * 0.26)}px` }}
      >
        <div className="rounded-[1vw] bg-white/30 backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden h-full flex flex-col">
          <div className={`flex items-center justify-between px-[1vw] border-b border-white/20 dark:border-white/10 ${isMinimized ? "py-[0.3vw]" : "py-[0.6vw]"}`}>
            <h3 className="text-[0.95vw] font-semibold text-theme-primary">Data Selector</h3>
            <div className="flex items-center gap-[0.6vw]">
              <button
                onClick={() => setIsMinimized((v: boolean) => !v)}
                className="px-[0.8vw] py-[0.4vw] text-[0.85vw] rounded-[0.8vw] bg-theme-input hover:bg-theme-input-focus text-theme-primary border border-white/20 dark:border-white/10"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw]"><path fill="currentColor" d="M6 19h12v-2H6v2zM6 7h12V5H6v2zm0 6h12v-2H6v2z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw]"><path fill="currentColor" d="M7 14h10v2H7z"/></svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-[0.8vw] py-[0.4vw] text-[0.85vw] rounded-[0.8vw] bg-theme-input hover:bg-theme-input-focus text-theme-primary border border-white/20 dark:border-white/10"
              >
                Close
              </button>
            </div>
          </div>
          {!isMinimized && (
            <div className="p-[1vw] space-y-[0.6vw] flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]">
              {previousNodes.length === 0 ? (
                <div className="text-[0.9vw] text-theme-secondary">No previous steps found</div>
              ) : (
                previousNodes.map((n) => (
                  <div key={n.id} className="border border-white/20 dark:border-white/10 rounded-[0.8vw] overflow-hidden mb-[0.8vw] shadow-sm bg-theme-form/70">
                    <button
                      type="button"
                      onClick={() => setOpenId((v: string | null) => (v === n.id ? null : n.id))}
                      className="w-full px-[0.9vw] py-[0.6vw] flex items-center justify-between bg-theme-input/70 hover:bg-theme-input-focus text-theme-primary"
                    >
                      <span className="truncate text-left font-medium text-[0.9vw]">{n.displayName}</span>
                      <svg viewBox="0 0 24 24" className={`w-[1vw] h-[1vw] text-theme-secondary transition-transform ${openId === n.id ? "rotate-180" : ""}`}>
                        <path fill="currentColor" d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>
                    {openId === n.id && (
                      <div className="p-[0.9vw] space-y-[0.4vw] bg-theme-form/70">
                        {isLoading ? (
                          <div className="text-[0.75vw] text-theme-secondary">Loading options...</div>
                        ) : (
                          <>
                            {(optionsByStep[(n.stepName || n.id)] || []).length === 0 ? (
                              <div className="text-[0.75vw] text-theme-secondary">No options available</div>
                            ) : (
                              <div className="divide-y divide-white/10">
                                {(optionsByStep[(n.stepName || n.id)] || []).map((k: string) => (
                                  <button
                                    key={`${n.id}::${k}`}
                                    type="button"
                                    onClick={() => {
                                      const stepIdForPayload = (n.isWebhookTrigger ? "trigger.body" : (n.stepName || n.id));
                                      const token = `{{${stepIdForPayload}.${k}}}`;
                                      try {
                                        const displayStep = n.displayName || (n.stepName || n.id);
                                        const uiToken = `{{${displayStep}.${k}}}`;
                                        const evt = new CustomEvent("zw:insert-data-token", { detail: { token, uiToken, webhookDisplayName: n.isWebhookTrigger ? n.displayName : undefined } });
                                        window.dispatchEvent(evt);
                                      } catch { /* noop */ }
                                    }}
                                    className="w-full text-left px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-primary hover:bg-theme-input-focus hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
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


