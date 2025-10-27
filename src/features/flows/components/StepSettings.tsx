import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, Check } from "lucide-react";
import { toastSuccess, toastWarning } from "../../../components/ui/Toast";
import { useContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";
import {
  changeWorkflowName,
  updateAction,
  testStep,
  getSampleData,
  updatePieceTrigger,
} from "../services/flowService";
import type { Connection } from "../../../types/connection";

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
      { displayName: string; required: boolean; type: string }
    >;
    type: string;
    displayName: string;
  };
};

export interface StepSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  step: {
    id: string;
    name: string;
    type: "action" | "trigger" | "code" | "loop" | "router";
    pieceName?: string;
    actionName?: string;
    triggerName?: string;
    displayName: string;
    logoUrl?: string;
    config?: Record<string, unknown>;
  } | null;
  onUpdateStep: (
    stepId: string,
    updates: Partial<StepSettingsProps["step"]>
  ) => void;
  onConnectionModalOpen: (piece: ActivePiece) => void;
  onOpenDataSelector?: () => void;
}

const getExistingSourceCode = (
  step: StepSettingsProps["step"]
): string | undefined => {
  if (!step?.config) return undefined;
  const config = step.config as Record<string, unknown>;
  if (
    config.sourceCode &&
    typeof config.sourceCode === "object" &&
    config.sourceCode !== null &&
    typeof (config.sourceCode as Record<string, unknown>).code === "string"
  ) {
    return (config.sourceCode as Record<string, unknown>).code as string;
  }
  return undefined;
};

export default function StepSettings({
  isOpen,
  onClose,
  step,
  onUpdateStep,
  onConnectionModalOpen,
  onOpenDataSelector,
}: StepSettingsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [topSectionHeight, setTopSectionHeight] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceCode, setSourceCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>(
    step?.displayName || ""
  );
  const [token, setToken] = useState<string>("");
  const [isConnDropdownOpen, setIsConnDropdownOpen] = useState(false);
  const [openPropDropdown, setOpenPropDropdown] = useState<string | null>(null);
  const [isLoadingOptionsByProp, setIsLoadingOptionsByProp] = useState<
    Record<string, boolean>
  >({});
  const [optionsByProp, setOptionsByProp] = useState<
    Record<string, Array<{ label: string; value: string }>>
  >({});
  const [discoveredOptionProps, setDiscoveredOptionProps] = useState<string[]>(
    []
  );
  const [optionPropsRequiredByName, setOptionPropsRequiredByName] = useState<
    Record<string, boolean>
  >({});
  const [optionPropTypesByName, setOptionPropTypesByName] = useState<
    Record<string, string>
  >({});
  const [optionPropRefreshersByName, setOptionPropRefreshersByName] = useState<
    Record<string, string[]>
  >({});
  const fetchedOptionKeysRef = useRef<Set<string>>(new Set());
  const optionsRequestGuardRef = useRef<Set<string>>(new Set());
  const prevOptionsBaseRef = useRef<string | null>(null);
  const lastPropsFetchKeyRef = useRef<string>("");
  // Date/Time picker state
  const [openDateProp, setOpenDateProp] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState<{
    year: number;
    month: number; // 1-12
    day: number; // 1-31
    hour: number; // 1-12
    minute: number; // 0-59
    ampm: "AM" | "PM";
  } | null>(null);
  const [dateAnchorRect, setDateAnchorRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [dateOpenField, setDateOpenField] = useState<
    "year" | "month" | "hour" | "minute" | "ampm" | null
  >(null);
  // Track steps we've auto-selected a connection for (to avoid overriding the user's choice)
  const autoSelectedForStepRef = useRef<Set<string>>(new Set());
  // Track focused input and caret to support data selector insertion
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusedPropName, setFocusedPropName] = useState<string | null>(null);
  const focusedCaretRef = useRef<number | null>(null);
  // Maintain UI values (with displayName tokens) separate from payload stored in config
  const [uiValuesByProp, setUiValuesByProp] = useState<Record<string, string>>({});
  // Remember the displayName of webhook trigger to map UI tokens -> payload tokens
  const webhookDisplayNameRef = useRef<string | null>(null);
  // Rate limit state for action input updates (1 request / 5s, trailing)
  const RATE_LIMIT_MS = 5000;
  const pendingUpdateRef = useRef<Record<string, unknown>>({});
  const lastSentAtRef = useRef<number>(0);
  const scheduledTimeoutRef = useRef<number | null>(null);
  // Placeholder: info fetch disabled for now
  // Metadata panel removed; using sample data instead
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleResponse, setSampleResponse] = useState<unknown>(null);
  const currentProject = useContextStore((s) => s.currentProject);

  // Resolve backend step name when unknown or mismatched
  const resolveStepName = useCallback(
    async (
      flowId: string,
      normalizedPieceName: string
    ): Promise<string | undefined> => {
      if (!currentProject?.id || !step) return undefined;
      const provided = (step.name || "").trim();
      const isLikelyBackendName =
        provided && !/\s/.test(provided) && !/^Add\s/i.test(provided);
      if (isLikelyBackendName) return provided;
      try {
        const resp = await http.get(
          `/projects/${currentProject.id}/flows/${flowId}`
        );
        const root = resp.data as unknown;
        if (!root || typeof root !== "object") return provided || undefined;
        const rec = root as Record<string, unknown>;
        const data = (rec["data"] as Record<string, unknown>) || rec;
        const versions =
          (data["versions"] as Array<Record<string, unknown>>) || [];
        const first = versions[0] || {};
        const flowData = (first["flowData"] as Record<string, unknown>) || {};
        const inner =
          (flowData["flowData"] as Record<string, unknown>) || flowData;
        const trigger = (inner["trigger"] as Record<string, unknown>) || {};
        const queue: Array<Record<string, unknown>> = [trigger];
        while (queue.length > 0) {
          const cur = queue.shift() as Record<string, unknown>;
          const type = String(cur["type"] ?? "");
          if (type === "PIECE") {
            const settings = (cur["settings"] as Record<string, unknown>) || {};
            const pieceName = String(settings["pieceName"] ?? "");
            const actionName = String(settings["actionName"] ?? "");
            const displayName = String(cur["displayName"] ?? "");
            if (
              pieceName === normalizedPieceName &&
              actionName === (step.actionName || "") &&
              (displayName === step.displayName ||
                step.displayName.includes(displayName) ||
                displayName.includes(step.displayName))
            ) {
              const nm = String(cur["name"] ?? "");
              if (nm) return nm;
            }
          }
          const next = cur["nextAction"];
          if (Array.isArray(next)) {
            next.forEach((n) => {
              if (n && typeof n === "object")
                queue.push(n as Record<string, unknown>);
            });
          } else if (next && typeof next === "object") {
            queue.push(next as Record<string, unknown>);
          }
        }
        return provided || undefined;
      } catch {
        return provided || undefined;
      }
    },
    [currentProject?.id, step]
  );

  // Fetch latest input from server for the current step
  const fetchLatestStepInput = useCallback(
    async (
      flowId: string,
      normalizedPieceName: string
    ): Promise<Record<string, unknown> | undefined> => {
      if (!currentProject?.id || !step) return undefined;
      try {
        const resp = await http.get(
          `/projects/${currentProject.id}/flows/${flowId}`
        );
        const root = resp.data as unknown;
        if (!root || typeof root !== "object") return undefined;
        const rec = root as Record<string, unknown>;
        const data = (rec["data"] as Record<string, unknown>) || rec;
        const versions =
          (data["versions"] as Array<Record<string, unknown>>) || [];
        const first = versions[0] || {};
        const flowData = (first["flowData"] as Record<string, unknown>) || {};
        const inner =
          (flowData["flowData"] as Record<string, unknown>) || flowData;
        const trigger = (inner["trigger"] as Record<string, unknown>) || {};
        const queue: Array<Record<string, unknown>> = [trigger];
        while (queue.length > 0) {
          const cur = queue.shift() as Record<string, unknown>;
          const type = String(cur["type"] ?? "");
          if (type === "PIECE") {
            const settings = (cur["settings"] as Record<string, unknown>) || {};
            const pieceName = String(settings["pieceName"] ?? "");
            const actionName = String(settings["actionName"] ?? "");
            const displayName = String(cur["displayName"] ?? "");
            if (
              pieceName === normalizedPieceName &&
              actionName === (step.actionName || "") &&
              (displayName === step.displayName ||
                step.displayName.includes(displayName) ||
                displayName.includes(step.displayName))
            ) {
              const input =
                (settings["input"] as Record<string, unknown> | undefined) ||
                undefined;
              if (input && typeof input === "object") {
                return input;
              }
            }
          }
          const next = cur["nextAction"];
          if (Array.isArray(next)) {
            next.forEach((n) => {
              if (n && typeof n === "object")
                queue.push(n as Record<string, unknown>);
            });
          } else if (next && typeof next === "object") {
            queue.push(next as Record<string, unknown>);
          }
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    [currentProject?.id, step]
  );

  // Helper: get current flowId from session
  const getCurrentFlowId = useCallback((): string | undefined => {
    try {
      const stored = sessionStorage.getItem("zw_current_flow");
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string };
        if (parsed?.id) return parsed.id;
      }
    } catch {
      /* noop */
    }
    const last = sessionStorage.getItem("zw_last_created_flow_id");
    return last || undefined;
  }, []);

  // Helper: send UPDATE_ACTION/UPDATE_TRIGGER with changed input props; keeps other inputs intact
  const postUpdateActionInput = useCallback(
    async (changed: Record<string, unknown>) => {
      if (!step || !step.pieceName) return;
      const flowId = getCurrentFlowId();
      if (!flowId || !currentProject?.id) return;
      const normalizedPieceName = step.pieceName.startsWith(
        "@activepieces/piece-"
      )
        ? step.pieceName
        : `@activepieces/piece-${step.pieceName}`;
      const cfg = (step.config ?? {}) as Record<string, unknown>;
      let pieceVersion =
        typeof cfg.pieceVersion === "string"
          ? (cfg.pieceVersion as string)
          : undefined;
      try {
        const { resolvePieceVersion } = await import("../services/flowService");
        const normalizedPieceName = step.pieceName.startsWith(
          "@activepieces/piece-"
        )
          ? step.pieceName
          : `@activepieces/piece-${step.pieceName}`;
        pieceVersion = await resolvePieceVersion(
          normalizedPieceName,
          pieceVersion
        );
      } catch {
        // best-effort; if undefined, backend may reject
      }
      // Build input by merging discovered props from current config.input and the change
      const input: Record<string, unknown> = {};
      try {
        const inputCfg = ((cfg["input"] as
          | Record<string, unknown>
          | undefined) || {}) as Record<string, unknown>;
        discoveredOptionProps.forEach((p) => {
          const typeUc = (optionPropTypesByName[p] || "").toUpperCase();
          // take from input first, then flat config (legacy)
          let v = (inputCfg as Record<string, unknown>)[p];
          if (v === undefined) v = (cfg as Record<string, unknown>)[p];
          // For checkboxes (required or not), default to false when not set so backend receives explicit disabled
          if (v === undefined && typeUc === "CHECKBOX") {
            v = false as unknown as Record<string, unknown>;
          }
          if (v !== undefined) input[p] = v as unknown;
        });
      } catch {
        /* noop */
      }
      // Force-sync 'auth' prop with selectedConnection if schema demands it
      if (discoveredOptionProps.includes("auth")) {
        input["auth"] = selectedConnection as unknown as Record<string, unknown>;
      }
      Object.assign(input, changed);
      // Include auth (connectionId) if available
      const auth =
        typeof cfg.connectionId === "string" && cfg.connectionId
          ? cfg.connectionId
          : selectedConnection || undefined;
      try {
        if (step.type === "trigger" && step.triggerName) {
          await updatePieceTrigger(String(flowId), {
            name: "trigger",
            displayName: step.displayName,
            pieceName: normalizedPieceName,
            pieceVersion,
            triggerName: step.triggerName,
            input,
            auth: auth as unknown as Record<string, unknown>,
          });
        } else if (step.type === "action" && step.actionName) {
          const effectiveStepName = await resolveStepName(
            flowId,
            normalizedPieceName
          );
          await updateAction(String(flowId), {
            name: effectiveStepName || step.name,
            type: "PIECE",
            displayName: step.displayName,
            settings: {
              auth,
              pieceName: normalizedPieceName,
              pieceVersion,
              actionName: step.actionName,
              input,
            } as unknown as Record<string, unknown>,
          });
        }
        // After successful backend update, rate-limit refetching of dependent dropdown options
        try {
          const changedKeys = Object.keys(changed || {});
          if (changedKeys.length > 0 && discoveredOptionProps.length > 0 && selectedConnection) {
            const dependents = discoveredOptionProps.filter((p) => {
              const t = (optionPropTypesByName[p] || "").toUpperCase();
              const isDropdown = t === "DROPDOWN" || t === "MULTI_SELECT_DROPDOWN";
              if (!isDropdown) return false;
              const refreshers = optionPropRefreshersByName[p] || [];
              return changedKeys.some((k) => refreshers.includes(k));
            });
            if (dependents.length > 0) {
              dependents.forEach((d) => dependentRefetchQueueRef.current.add(d));
              if (dependentRefetchTimerRef.current === null) {
                dependentRefetchTimerRef.current = window.setTimeout(() => {
                  try {
                    const toFetch = Array.from(dependentRefetchQueueRef.current);
                    dependentRefetchQueueRef.current.clear();
                    if (toFetch.length > 0) {
                      void loadOptionsOnly(selectedConnection, toFetch);
                    }
                  } finally {
                    dependentRefetchTimerRef.current = null;
                  }
                }, DEPENDENT_REFETCH_RATE_MS) as unknown as number;
              }
            }
          }
        } catch {
          /* noop */
        }
      } catch {
        /* best-effort */
      }
    },
    [
      step,
      selectedConnection,
      currentProject?.id,
      discoveredOptionProps,
      optionPropTypesByName,
      optionPropsRequiredByName,
      getCurrentFlowId,
      resolveStepName,
    ]
  );

  const loadConnections = useCallback(async () => {
    if (!step?.pieceName || !currentProject?.id) return;
    try {
      setIsLoadingConnections(true);
      const normalizedPieceName = step.pieceName.startsWith(
        "@activepieces/piece-"
      )
        ? step.pieceName
        : `@activepieces/piece-${step.pieceName}`;
      const pieceParam = encodeURIComponent(normalizedPieceName);
      const url = `/projects/${currentProject.id}/connections/piece/${pieceParam}`;
      const response = await http.get(url);
      const root = response.data as unknown;
      const extract = (val: unknown): Connection[] => {
        if (Array.isArray(val)) return val as Connection[];
        if (val && typeof val === "object") {
          const obj = val as Record<string, unknown>;
          if (Array.isArray(obj.connections))
            return obj.connections as Connection[];
          if (Array.isArray(obj.data)) return obj.data as Connection[];
          if (Array.isArray(obj.items)) return obj.items as Connection[];
        }
        return [] as Connection[];
      };
      const pieceConnections = extract(root);
      setConnections(pieceConnections);
    } catch (error) {
      console.error("Failed to load connections:", error);
      // toastError(
      //   "Failed to load connections",
      //   "Unable to fetch connections for this piece"
      // );
    } finally {
      setIsLoadingConnections(false);
    }
  }, [step?.pieceName, currentProject?.id]);

  useEffect(() => {
    // Reset state immediately when switching nodes to avoid showing stale content
    setConnections([]);
    setIsLoadingConnections(false);
    setOpenPropDropdown(null);
    setIsLoadingOptionsByProp({});
    setOptionsByProp({});
    setDiscoveredOptionProps([]);
    setOptionPropsRequiredByName({});
    setOptionPropTypesByName({});
    setOptionPropRefreshersByName({});
    fetchedOptionKeysRef.current = new Set();
    optionsRequestGuardRef.current.clear();
    prevOptionsBaseRef.current = null;
    lastPropsFetchKeyRef.current = "";
    setFocusedPropName(null);
    focusedCaretRef.current = null;
    setSampleResponse(null);
    // Initialize from incoming step config (connectionId, optionProps)
    if (step?.config && typeof step.config === "object") {
      const cfg = step.config as Record<string, unknown>;
      const cid = typeof cfg.connectionId === "string" ? cfg.connectionId : "";
      setSelectedConnection(cid || "");
      const props = Array.isArray(
        (cfg as Record<string, unknown>)["optionProps"]
      )
        ? ((cfg as Record<string, unknown>)[
            "optionProps"
          ] as unknown[] as string[])
        : [];
      if (Array.isArray(props) && props.length > 0)
        setDiscoveredOptionProps(props.slice());
    } else {
      setSelectedConnection("");
    }
  }, [step?.id]);

  // On first open for a step: if backend-provided settings include auth, and a matching
  // connection exists for this piece, preselect it.
  useEffect(() => {
    if (!isOpen || !step?.id) return;
    if (autoSelectedForStepRef.current.has(step.id)) return;
    const cfg = (step?.config as Record<string, unknown> | undefined) || {};
    const authVal = cfg?.auth as unknown;
    const authId = typeof authVal === "string" ? authVal : undefined;
    if (!authId) return;
    if (selectedConnection) return; // don't override user's selection
    // Wait until connections have loaded
    if (isLoadingConnections) return;
    const match = connections.find((c) => c.id === authId);
    if (match) {
      setSelectedConnection(match.id);
      autoSelectedForStepRef.current.add(step.id);
    }
  }, [
    isOpen,
    step?.id,
    step?.config,
    connections,
    isLoadingConnections,
    selectedConnection,
  ]);

  useEffect(() => {
    if (isOpen && step?.pieceName) {
      loadConnections();
    }
  }, [isOpen, step?.pieceName, loadConnections]);
  useEffect(() => {
    setDisplayName(step?.displayName || "");
    setIsConnDropdownOpen(false);
  }, [step?.id, step?.displayName]);
  useEffect(() => {
    if (step?.type === "code") {
      // Initialize source code from config or use default
      const defaultCode =
        "export const code = async (inputs) => {\n  return { success: true };\n};";
      const existingCode = getExistingSourceCode(step) || defaultCode;
      setSourceCode(existingCode);
    }
  }, [step?.id, step?.type]);

  // Removed metadata fetch

  // Do not auto-load sample data; fetch only when user clicks the button
  useEffect(() => {
    if (!isOpen) return;
    setSampleResponse(null);
  }, [isOpen, step?.id]);

  // Determine if required fields are filled
  const missingRequiredProps = useMemo(() => {
    if (!step) return [] as string[];
    const config = (step.config as Record<string, unknown> | undefined) || {};
    const inputConfig = ((config["input"] as
      | Record<string, unknown>
      | undefined) || {}) as Record<string, unknown>;
    const requiredProps = discoveredOptionProps.filter((p) =>
      Boolean(optionPropsRequiredByName[p])
    );
    const missing = requiredProps.filter((p) => {
      if (p === "auth") return false; // managed via selected connection
      const typeUc = (optionPropTypesByName[p] || "").toUpperCase();
      // For required checkboxes, treat unchecked (false) or undefined as satisfied
      if (typeUc === "CHECKBOX") return false;
      const v = (inputConfig as Record<string, unknown>)[p];
      return v === undefined || v === null || String(v) === "";
    });
    // Treat connection as required for piece actions and piece triggers
    const needsConnection =
      step.type === "action" ||
      (step.type === "trigger" && Boolean(step.pieceName));
    const hasAuth = Boolean(
      (step.config as Record<string, unknown> | undefined)?.["auth"]
    );
    const hasConnection = Boolean(selectedConnection) || hasAuth;
    if (needsConnection && !hasConnection) missing.push("connectionId");
    return missing;
  }, [
    step,
    discoveredOptionProps,
    optionPropsRequiredByName,
    optionPropTypesByName,
    selectedConnection,
  ]);
  const isGetSampleDisabled = useMemo(
    () => missingRequiredProps.length > 0 || isLoadingSample,
    [missingRequiredProps, isLoadingSample]
  );
  // Broadcast validation status to editor (so node can show indicator)
  useEffect(() => {
    try {
      const event = new CustomEvent("zw:update-node-validation", {
        detail: {
          stepId: step?.id,
          missing: missingRequiredProps,
        },
      });
      window.dispatchEvent(event);
    } catch {
      /* noop */
    }
  }, [missingRequiredProps, step?.id]);

  // Queue and rate-limit UPDATE_ACTION calls for typing changes
  const queueUpdateActionInput = useCallback(
    (changed: Record<string, unknown>) => {
      // Merge changed keys into pending batch
      pendingUpdateRef.current = { ...pendingUpdateRef.current, ...changed };
      const now = Date.now();
      const elapsed = now - (lastSentAtRef.current || 0);
      const remaining = RATE_LIMIT_MS - elapsed;
      // If a timer is already scheduled, do nothing (it will send latest batch)
      if (scheduledTimeoutRef.current !== null) return;
      const delay = remaining > 0 ? remaining : RATE_LIMIT_MS;
      scheduledTimeoutRef.current = window.setTimeout(async () => {
        const payload = pendingUpdateRef.current;
        pendingUpdateRef.current = {};
        scheduledTimeoutRef.current = null;
        lastSentAtRef.current = Date.now();
        try {
          await postUpdateActionInput(payload);
        } catch {
          /* best-effort; ignore */
        }
      }, delay) as unknown as number;
    },
    [postUpdateActionInput]
  );

  // Utils: days in month (handles leap years)
  const daysInMonth = (year: number, month1To12: number): number => {
    return new Date(year, month1To12, 0).getDate();
  };

  // Prevent runaway API calls by debouncing metadata broadcasts as well
  const metaBroadcastTimeoutRef = useRef<number | null>(null);
  const prevMetaSigRef = useRef<string>("");
  // Rate-limited dependent dropdown refetch after successful backend update
  const dependentRefetchQueueRef = useRef<Set<string>>(new Set());
  const dependentRefetchTimerRef = useRef<number | null>(null);
  const DEPENDENT_REFETCH_RATE_MS = 1200;

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      if (scheduledTimeoutRef.current !== null) {
        clearTimeout(scheduledTimeoutRef.current);
        scheduledTimeoutRef.current = null;
      }
    };
  }, []);

  const handleConnectionSelect = async (connectionId: string) => {
    const prevConfig = step?.config
      ? { ...(step.config as Record<string, unknown>) }
      : undefined;
    setSelectedConnection(connectionId);
    if (step)
      onUpdateStep(step.id, { config: { ...step.config, connectionId } });

    // Fire UPDATE_ACTION for actions OR UPDATE_TRIGGER for piece triggers; revert on failure
    try {
      if (!step || !step.pieceName) return;
      let flowId: string | undefined;
      const stored = sessionStorage.getItem("zw_current_flow");
      if (stored) {
        const parsed = JSON.parse(stored) as { id?: string };
        if (parsed?.id) flowId = parsed.id;
      }
      if (!flowId)
        flowId = sessionStorage.getItem("zw_last_created_flow_id") || undefined;
      if (!flowId || !currentProject?.id) return;
      const normalizedPieceName = step.pieceName.startsWith(
        "@activepieces/piece-"
      )
        ? step.pieceName
        : `@activepieces/piece-${step.pieceName}`;
      const cfg = (step.config ?? {}) as Record<string, unknown>;
      let pieceVersion =
        typeof cfg.pieceVersion === "string"
          ? (cfg.pieceVersion as string)
          : undefined;
      try {
        const { resolvePieceVersion } = await import("../services/flowService");
        pieceVersion = await resolvePieceVersion(
          normalizedPieceName,
          pieceVersion
        );
      } catch {
        // best-effort
      }
      if (step.type === "trigger" && step.triggerName) {
        await updatePieceTrigger(String(flowId), {
          name: "trigger",
          displayName: step.displayName,
          pieceName: normalizedPieceName,
          pieceVersion,
          triggerName: step.triggerName,
          auth: connectionId as unknown as Record<string, unknown>,
        });
      } else if (step.actionName) {
        const effectiveStepName = await resolveStepName(
          flowId,
          normalizedPieceName
        );
        const input =
          typeof cfg.input === "object" && cfg.input !== null
            ? (cfg.input as Record<string, unknown>)
            : {};
        await updateAction(String(flowId), {
          name: effectiveStepName || step.name,
          type: "PIECE",
          displayName: step.displayName,
          settings: {
            auth: connectionId,
            pieceName: normalizedPieceName,
            pieceVersion,
            actionName: step.actionName,
            input,
          } as unknown as Record<string, unknown>,
        });
      }

      // Options load handled by guarded effect after selectedConnection changes
    } catch {
      // Keep selected connection so options can still load; revert only config
      if (step) onUpdateStep(step.id, { config: prevConfig });
    }
  };

  // Helper: fetch piece action props from cloud API
  const fetchActionPropNames = useCallback(async (): Promise<{
    names: string[];
    requiredByName: Record<string, boolean>;
    typesByName: Record<string, string>;
    refreshersByName: Record<string, string[]>;
    staticOptionsByName: Record<
      string,
      Array<{ label: string; value: string }>
    >;
  }> => {
    if (!step?.pieceName || (!step?.actionName && !step?.triggerName))
      return {
        names: [],
        requiredByName: {},
        typesByName: {},
        refreshersByName: {},
        staticOptionsByName: {},
      };
    const normalizedPieceName = step.pieceName.startsWith(
      "@activepieces/piece-"
    )
      ? step.pieceName
      : `@activepieces/piece-${step.pieceName}`;
    try {
      const encodedId = normalizedPieceName.replace(/\//g, "%2F");
      const resp = await http.get(`/pods/${encodedId}`);
      const root = resp.data as unknown;
      const schema =
        root &&
        typeof root === "object" &&
        (root as Record<string, unknown>)["data"]
          ? ((root as Record<string, unknown>)["data"] as Record<
              string,
              unknown
            >)
          : (root as Record<string, unknown>) || {};
      if (step.type === "trigger" && step.triggerName) {
        const triggers = (schema["triggers"] as Record<string, unknown>) || {};
        const trigSchema =
          (triggers[step.triggerName] as Record<string, unknown>) || {};
        const props = (trigSchema["props"] as Record<string, unknown>) || {};
        const requiredByName: Record<string, boolean> = {};
        const typesByName: Record<string, string> = {};
        const refreshersByName: Record<string, string[]> = {};
        const staticOptionsByName: Record<
          string,
          Array<{ label: string; value: string }>
        > = {};
        Object.entries(props).forEach(([k, v]) => {
          const p = (v as Record<string, unknown>) || {};
          requiredByName[k] = Boolean(p["required"]);
          typesByName[k] = String(p["type"] || "");
          const refArr = Array.isArray(p["refreshers"])
            ? (p["refreshers"] as unknown[])
            : [];
          refreshersByName[k] = refArr.map((r) => String(r));
          const t = String(p["type"] || "").toUpperCase();
          if (t === "STATIC_DROPDOWN" || t === "STATIC_MULTI_SELECT_DROPDOWN") {
            const opts = (
              ((p["options"] as Record<string, unknown> | undefined)
                ?.options as Array<Record<string, unknown>> | undefined) || []
            ).map((opt) => ({
              label: String(opt?.label ?? opt?.value ?? ""),
              value: String(opt?.value ?? opt?.label ?? ""),
            }));
            staticOptionsByName[k] = opts;
          }
        });
        const namesSorted = Object.keys(props).sort();
        return {
          names: namesSorted,
          requiredByName,
          typesByName,
          refreshersByName,
          staticOptionsByName,
        };
      }
      const actions = (schema["actions"] as Record<string, unknown>) || {};
      const actionSchema =
        (actions[step.actionName as string] as Record<string, unknown>) || {};
      const props = (actionSchema["props"] as Record<string, unknown>) || {};
      const requiredByName: Record<string, boolean> = {};
      const typesByName: Record<string, string> = {};
      const refreshersByName: Record<string, string[]> = {};
      const staticOptionsByName: Record<
        string,
        Array<{ label: string; value: string }>
      > = {};
      Object.entries(props).forEach(([k, v]) => {
        const p = (v as Record<string, unknown>) || {};
        requiredByName[k] = Boolean(p["required"]);
        typesByName[k] = String(p["type"] || "");
        const refArr = Array.isArray(p["refreshers"])
          ? (p["refreshers"] as unknown[])
          : [];
        refreshersByName[k] = refArr.map((r) => String(r));
        const t = String(p["type"] || "").toUpperCase();
        if (t === "STATIC_DROPDOWN" || t === "STATIC_MULTI_SELECT_DROPDOWN") {
          const opts = (
            ((p["options"] as Record<string, unknown> | undefined)?.options as
              | Array<Record<string, unknown>>
              | undefined) || []
          ).map((opt) => ({
            label: String(opt?.label ?? opt?.value ?? ""),
            value: String(opt?.value ?? opt?.label ?? ""),
          }));
          staticOptionsByName[k] = opts;
        }
      });
      const namesSorted = Object.keys(props).sort();
      return {
        names: namesSorted,
        requiredByName,
        typesByName,
        refreshersByName,
        staticOptionsByName,
      };
    } catch {
      return {
        names: [],
        requiredByName: {},
        typesByName: {},
        refreshersByName: {},
        staticOptionsByName: {},
      };
    }
  }, [step?.pieceName, step?.actionName, step?.triggerName, step?.type]);

  // Helper: load options only (without UPDATE_ACTION)
  const loadOptionsOnly = useCallback(
    async (connectionId: string, propNamesOverride?: string[]) => {
      try {
        if (!currentProject?.id || !step?.name) return;
        let flowId: string | undefined;
        const stored = sessionStorage.getItem("zw_current_flow");
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string };
          if (parsed?.id) flowId = parsed.id;
        }
        if (!flowId)
          flowId =
            sessionStorage.getItem("zw_last_created_flow_id") || undefined;
        if (!flowId) return;
        const normalizedPieceName = step.pieceName?.startsWith(
          "@activepieces/piece-"
        )
          ? step.pieceName!
          : step.pieceName
          ? `@activepieces/piece-${step.pieceName}`
          : "";
        const effectiveStepName = await resolveStepName(
          flowId,
          normalizedPieceName
        );
        const propNames =
          propNamesOverride && propNamesOverride.length > 0
            ? propNamesOverride
            : discoveredOptionProps.length > 0
            ? discoveredOptionProps
            : [
                ((step.config as Record<string, unknown> | undefined)
                  ?.propertyName as string) || "select",
              ];
        for (const propertyName of propNames) {
          try {
            // Build currentValues with refreshers; treat checkbox refreshers as satisfied (default false)
            const refreshers = optionPropRefreshersByName[propertyName] || [];
            const currentValues: Record<string, unknown> = { connectionId };
            const cfgObj = (step.config as Record<string, unknown> | undefined) || {};
            const inputCfgObj = ((cfgObj["input"] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
            refreshers
              .filter((r) => r !== "auth")
              .forEach((r) => {
                const typeUc = (optionPropTypesByName[r] || "").toUpperCase();
                const v = (inputCfgObj as Record<string, unknown>)[r] ?? (cfgObj as Record<string, unknown>)[r];
                if (typeUc === "CHECKBOX") {
                  // Always include checkbox ref values; default to false when unset
                  currentValues[r] = Boolean(v);
                } else if (v !== undefined && v !== null && String(v) !== "") {
                  currentValues[r] = v as unknown;
                }
              });
            // Include refreshers signature in per-prop cache key so changes refetch options
            const refreshSig = refreshers
              .filter((r) => r !== "auth")
              .map((r) => `${r}:${String(currentValues[r] ?? "")}`)
              .sort()
              .join(",");
            const cacheKey = `${connectionId}::${
              effectiveStepName || step.name
            }::${propertyName}{${refreshSig}}`;
            if (fetchedOptionKeysRef.current.has(cacheKey)) continue;
            setIsLoadingOptionsByProp((prev) => ({
              ...prev,
              [propertyName]: true,
            }));
            const resp = await http.post(
              `/projects/${
                currentProject.id
              }/flows/${flowId}/steps/${encodeURIComponent(
                effectiveStepName || step.name || ""
              )}/properties/${encodeURIComponent(propertyName)}/options`,
              { currentValues }
            );
            fetchedOptionKeysRef.current.add(cacheKey);
            const root = resp.data as unknown;
            const optionsForProp: Array<{ label: string; value: string }> = [];
            const pushNormalized = (item: unknown) => {
              if (!item) return;
              if (typeof item === "string" || typeof item === "number") {
                const label = String(item);
                const value = String(item);
                optionsForProp.push({ label, value });
                return;
              }
              if (typeof item === "object") {
                const obj = item as Record<string, unknown>;
                const label = String(
                  obj.label ?? obj.name ?? obj.displayName ?? obj.id ?? ""
                );
                const valueRaw = (obj.value ?? obj.id ?? obj.key ?? label) as
                  | string
                  | number;
                const value = String(valueRaw);
                if (label) optionsForProp.push({ label, value });
              }
            };
            if (root && typeof root === "object") {
              const obj = root as Record<string, unknown>;
              const dataObj = obj.data as Record<string, unknown> | undefined;
              const optionsFromData = Array.isArray(dataObj?.options)
                ? (dataObj!.options as unknown[])
                : undefined;
              optionsFromData?.forEach(pushNormalized);
              const arr = (obj.options as unknown) || (obj.items as unknown);
              if (Array.isArray(arr)) arr.forEach(pushNormalized);
            } else if (Array.isArray(root)) {
              root.forEach(pushNormalized);
            }
            const seen = new Set<string>();
            const unique = optionsForProp.filter((o) => {
              const key = `${o.label}::${o.value}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setOptionsByProp((prev) => ({ ...prev, [propertyName]: unique }));
          } catch {
            // ignore per-prop failure
          } finally {
            setIsLoadingOptionsByProp((prev) => ({
              ...prev,
              [propertyName]: false,
            }));
          }
        }
      } finally {
        // noop
      }
    },
    [
      currentProject?.id,
      step,
      discoveredOptionProps,
      resolveStepName,
      optionPropRefreshersByName,
    ]
  );

  // Refetch dependent dropdown options when a refresher prop changes
  const refetchDependentDropdowns = useCallback(
    (changedPropName: string) => {
      try {
        if (!selectedConnection) return;
        if (discoveredOptionProps.length === 0) return;
        const dependents = discoveredOptionProps.filter((p) => {
          const t = (optionPropTypesByName[p] || "").toUpperCase();
          const isDropdown = t === "DROPDOWN" || t === "MULTI_SELECT_DROPDOWN";
          if (!isDropdown) return false;
          const refreshers = optionPropRefreshersByName[p] || [];
          return refreshers.includes(changedPropName);
        });
        if (dependents.length === 0) return;
        void loadOptionsOnly(selectedConnection, dependents);
      } catch {
        /* noop */
      }
    },
    [
      selectedConnection,
      discoveredOptionProps,
      optionPropRefreshersByName,
      optionPropTypesByName,
      loadOptionsOnly,
    ]
  );

  // Discover props when opening or step changes (actions and piece triggers)
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.type === "trigger" && !step.pieceName) return; // skip webhook trigger
    const key = `${step.pieceName || ""}::${step.type}::${
      step.actionName || ""
    }::${step.triggerName || ""}`;
    if (lastPropsFetchKeyRef.current === key) return; // prevent redundant re-fetch
    lastPropsFetchKeyRef.current = key;
    (async () => {
      const {
        names,
        requiredByName,
        typesByName,
        refreshersByName,
        staticOptionsByName,
      } = await fetchActionPropNames();
      if (names.length > 0) {
        const sortedNames = names.slice();
        const prev = discoveredOptionProps;
        const same =
          prev.length === sortedNames.length &&
          prev.every((p, i) => p === sortedNames[i]);
        if (!same) setDiscoveredOptionProps(sortedNames);
        setOptionPropsRequiredByName(requiredByName);
        setOptionPropTypesByName(typesByName);
        setOptionPropRefreshersByName(refreshersByName);
        if (
          staticOptionsByName &&
          Object.keys(staticOptionsByName).length > 0
        ) {
          setOptionsByProp((prev) => ({ ...prev, ...staticOptionsByName }));
        }
        // Broadcast prop meta so nodes can validate even when Step Settings is closed, debounce to prevent loops
        try {
          const propsSig = sortedNames.slice().sort().join("|");
          const reqKeys = Object.keys(requiredByName).sort();
          const reqSig = reqKeys
            .map((k) => `${k}:${requiredByName[k] ? 1 : 0}`)
            .join(",");
          const typesKeys = Object.keys(typesByName).sort();
          const typesSig = typesKeys
            .map((k) => `${k}:${typesByName[k]}`)
            .join(",");
          const rfKeys = Object.keys(refreshersByName).sort();
          const rfSig = rfKeys
            .map(
              (k) =>
                `${k}:[${(refreshersByName[k] || [])
                  .slice()
                  .sort()
                  .join("|")} ]`
            )
            .join(";");
          const nextSig = [propsSig, reqSig, typesSig, rfSig].join("#");
          if (prevMetaSigRef.current === nextSig) {
            // nothing new, skip broadcast entirely
          } else {
            prevMetaSigRef.current = nextSig;
            if (metaBroadcastTimeoutRef.current !== null) {
              clearTimeout(metaBroadcastTimeoutRef.current);
              metaBroadcastTimeoutRef.current = null;
            }
            // one-shot trailing debounce to collapse rapid successive updates
            metaBroadcastTimeoutRef.current = window.setTimeout(() => {
              try {
                const evt = new CustomEvent("zw:update-node-props-meta", {
                  detail: {
                    stepId: step.id,
                    optionProps: sortedNames,
                    optionPropsRequiredByName: requiredByName,
                    optionPropTypesByName: typesByName,
                    optionPropRefreshersByName: refreshersByName,
                  },
                });
                window.dispatchEvent(evt);
              } catch {
                /* noop */
              }
              metaBroadcastTimeoutRef.current = null;
            }, 400) as unknown as number;
          }
        } catch {
          /* noop */
        }
      } else {
        setDiscoveredOptionProps([]);
        setOptionPropsRequiredByName({});
        setOptionPropTypesByName({});
        setOptionPropRefreshersByName({});
      }
    })();
  }, [isOpen, step?.id, fetchActionPropNames]);

  useEffect(() => {
    return () => {
      if (metaBroadcastTimeoutRef.current !== null) {
        clearTimeout(metaBroadcastTimeoutRef.current);
        metaBroadcastTimeoutRef.current = null;
      }
    };
  }, []);

  // Listen for data selector token insertions and apply to currently focused input
  // Utility: convert UI string (may contain displayName tokens) to payload-safe string
  const convertUiToPayload = useCallback((val: string): string => {
    return String(val).replace(/\{\{([^}.]+)\.([^}]+)\}\}/g, (_m, stepPart: string, keyPart: string) => {
      const stepTrim = String(stepPart).trim();
      const webhookDisp = webhookDisplayNameRef.current;
      const isWebhookUi = webhookDisp && stepTrim === webhookDisp;
      if (isWebhookUi) return `{{trigger.body.${keyPart}}}`;
      if (stepTrim === "trigger" || stepTrim === "trigger.body") return `{{trigger.body.${keyPart}}}`;
      const normalized = stepTrim
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "_");
      return `{{${normalized}.${keyPart}}}`;
    });
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<{ token?: string; uiToken?: string; webhookDisplayName?: string }>) => {
      const tokenStr = e?.detail?.token || "";
      const uiTokenStr = e?.detail?.uiToken || tokenStr;
      const webhookDisp = e?.detail?.webhookDisplayName;
      if (webhookDisp) webhookDisplayNameRef.current = webhookDisp;
      if (!tokenStr || !focusedPropName) return;
      const el = inputRefs.current[focusedPropName];
      if (!el) return;
      const start = el.selectionStart ?? focusedCaretRef.current ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
      const needsTrailingSpace = after.length === 0 || !/^\s/.test(after);
      const insertUi = `${needsLeadingSpace ? " " : ""}${uiTokenStr}${needsTrailingSpace ? " " : ""}`;
      const insertPayload = `${needsLeadingSpace ? " " : ""}${tokenStr}${needsTrailingSpace ? " " : ""}`;
      const nextUi = `${before}${insertUi}${after}`;
      const nextPayload = `${before}${insertPayload}${after}`;
      el.value = nextUi;
      setUiValuesByProp((prev) => ({ ...prev, [focusedPropName]: nextUi }));
      // Update step config (nested under input) and backend
      if (step) {
        const prevCfg = (step.config as Record<string, unknown>) || {};
        const prevInput = ((prevCfg["input"] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
        onUpdateStep(step.id, {
          config: {
            ...prevCfg,
            input: {
              ...prevInput,
              [focusedPropName]: nextPayload,
            },
          },
        });
        queueUpdateActionInput({ [focusedPropName]: nextPayload });
      }
      try {
        const newCaret = start + insertUi.length;
        el.setSelectionRange(newCaret, newCaret);
        focusedCaretRef.current = newCaret;
        el.focus();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("zw:insert-data-token", handler as EventListener);
    return () => {
      window.removeEventListener(
        "zw:insert-data-token",
        handler as EventListener
      );
    };
  }, [focusedPropName, onUpdateStep, queueUpdateActionInput, step, convertUiToPayload]);


  // Guarded options load: once per [connection + step + propsSig] (actions and piece triggers)
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.type === "trigger" && !step.pieceName) return; // skip webhook trigger
    if (!selectedConnection) return;
    // Open the options dropdown after connection change so user sees loading
    setOpenPropDropdown((prev) => (prev ? prev : null));
    if (discoveredOptionProps.length === 0) return;
    const dropdownProps = discoveredOptionProps.filter((p) => {
      const t = (optionPropTypesByName[p] || "").toUpperCase();
      // Only dynamic dropdowns require options API
      return t === "DROPDOWN" || t === "MULTI_SELECT_DROPDOWN";
    });
    if (dropdownProps.length === 0) return;
    // Refreshers gating (driven only by successful backend updates via dependentRefetch flow)
    const satisfiableProps = dropdownProps.filter((p) => {
      const refreshers = optionPropRefreshersByName[p] || [];
      const extra = refreshers.filter((r) => r !== "auth");
      if (extra.length === 0) return true;
      const cfgObj = (step?.config as Record<string, unknown> | undefined) || {};
      const inputCfg = ((cfgObj["input"] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
      return extra.every((r) => {
        const t = (optionPropTypesByName[r] || "").toUpperCase();
        if (t === "CHECKBOX") return true;
        const v = (inputCfg as Record<string, unknown>)[r] ?? (cfgObj as Record<string, unknown>)[r];
        return v !== undefined && v !== null && String(v) !== "";
      });
    });
    if (satisfiableProps.length === 0) return;
    const baseKey = `${selectedConnection}::${step.id}`;
    if (prevOptionsBaseRef.current !== baseKey) {
      fetchedOptionKeysRef.current = new Set();
      optionsRequestGuardRef.current.clear();
      // do not clear options to avoid flicker; they'll be updated per-prop as they load
      prevOptionsBaseRef.current = baseKey;
    }
    const cfgObj = (step?.config as Record<string, unknown> | undefined) || {};
    const inputCfg = ((cfgObj["input"] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
    const propsSig = satisfiableProps
      .map((p) => {
        const refreshers = optionPropRefreshersByName[p] || [];
        const kv = refreshers
          .map((r) => {
            const v = (inputCfg as Record<string, unknown>)[r] ?? (cfgObj as Record<string, unknown>)[r];
            return `${r}:${String(v ?? "")}`;
          })
          .join(",");
        return `${p}{${kv}}`;
      })
      .join("|");
    const requestKey = `${baseKey}::${propsSig}`;
    if (optionsRequestGuardRef.current.has(requestKey)) return;
    optionsRequestGuardRef.current.add(requestKey);
    void loadOptionsOnly(selectedConnection, satisfiableProps);
  }, [
    isOpen,
    step?.id,
    selectedConnection,
    discoveredOptionProps,
    optionPropTypesByName,
    optionPropRefreshersByName,
    // Removed optionsRefreshSig so refetches are driven after confirmed backend updates
    loadOptionsOnly,
  ]);

  const fetchPieceDetails = async (pieceName: string) => {
    try {
      const pieceIdentifier = pieceName.replace("@activepieces/piece-", "");
      const response = await fetch(
        "https://cloud.activepieces.com/api/v1/pieces"
      );
      const pieces = await response.json();
      const piece = pieces.find(
        (p: ActivePiece) =>
          p.name === pieceIdentifier ||
          p.name === pieceName ||
          `@activepieces/piece-${p.name}` === pieceName
      );
      return piece;
    } catch (error) {
      console.error("Failed to fetch piece details:", error);
      // toastError(
      //   "Failed to load piece details",
      //   "Unable to fetch piece configuration"
      // );
      return null;
    }
  };

  const handleCreateConnection = async () => {
    if (!step?.pieceName) return;
    const pieceDetails = await fetchPieceDetails(step.pieceName);
    const piece = pieceDetails || {
      id: step?.id || "",
      name: step?.pieceName || "",
      displayName: step?.displayName || "",
      logoUrl: step?.logoUrl || "",
      description: "",
      categories: [],
      actions: 0,
      triggers: 0,
    };
    onConnectionModalOpen(piece);
  };

  // When a new connection is created from the modal, refetch connections for this piece
  useEffect(() => {
    const handler = (e: CustomEvent<{ connection?: { pieceName?: string } }>) => {
      try {
        const createdPiece = String(e?.detail?.connection?.pieceName || "");
        const currentPiece = String(step?.pieceName || "");
        if (createdPiece && currentPiece) {
          const normA = createdPiece.startsWith("@activepieces/piece-") ? createdPiece : `@activepieces/piece-${createdPiece}`;
          const normB = currentPiece.startsWith("@activepieces/piece-") ? currentPiece : `@activepieces/piece-${currentPiece}`;
          if (normA === normB) {
            void loadConnections();
          }
        } else if (currentPiece) {
          // If backend omits pieceName, still refresh to be safe
          void loadConnections();
        }
      } catch {
        // On any parsing error, refresh as a fallback
        void loadConnections();
      }
    };
    window.addEventListener("zw:connection:created", handler as EventListener);
    return () => window.removeEventListener("zw:connection:created", handler as EventListener);
  }, [step?.pieceName, loadConnections]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const container = document.getElementById("step-settings-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;
      // Top section: 10%–80% → Bottom section: 90%–20%
      const clampedHeight = Math.max(10, Math.min(80, newHeight));
      setTopSectionHeight(clampedHeight);
    },
    [isDragging]
  );
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen || !step) return null;

  return (
    <>
      <div className="h-full w-full bg-theme-form/95 backdrop-blur-md flex flex-col text-[0.9vw]">
        <div
          id="step-settings-container"
          className={`flex-1 flex flex-col min-h-0 ${
            isDragging ? "cursor-row-resize" : ""
          }`}
        >
          <div
            className="flex flex-col min-h-0 border-b border-white/20 dark:border-white/10"
            style={{
              height: `${Math.max(20, Math.min(90, topSectionHeight))}%`,
            }}
          >
            <div className="flex items-center justify-between p-[1vw] border-b border-white/20 dark:border-white/10">
              <div className="flex items-center gap-[0.6vw]">
                {step.logoUrl && (
                  <img
                    src={step.logoUrl}
                    alt={step.displayName}
                    className="w-[1.6vw] h-[1.6vw] rounded-[0.8vw] object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/32x32?text=?";
                    }}
                  />
                )}
                <h2 className="text-[1.1vw] leading-[1.3vw] font-semibold text-theme-primary truncate">
                  {step.displayName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-[0.4vw] hover:bg-theme-input-focus rounded-[0.8vw] transition-all duration-200"
              >
                <X className="h-[1vw] w-[1vw] text-theme-primary" />
              </button>
            </div>
            <div
              id="step-settings-scroll"
              className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]"
            >
              <div className="p-[1vw] pb-[4vw] space-y-[1.2vw]">
                {(step.type !== "trigger" ||
                  (step.type === "trigger" && Boolean(step.pieceName))) && (
                  <div>
                    <div className="bg-theme-input/40 rounded-[0.8vw] border border-white/10 p-[1vw] shadow-sm space-y-[0.8vw]">
                      <h3 className="text-[0.9vw] font-medium text-theme-primary">
                        Connection <span className="text-[#ef4a45]">*</span>
                      </h3>
                      <div className="relative">
                        <button
                          type="button"
                          disabled={isLoadingConnections}
                          onClick={() => setIsConnDropdownOpen((v) => !v)}
                          className={`w-full inline-flex items-center justify-between px-[0.9vw] py-[0.6vw] bg-theme-input border rounded-[0.8vw] text-[0.9vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary disabled:opacity-60 disabled:cursor-not-allowed ${
                            !selectedConnection
                              ? "border-[#ef4a45]"
                              : "border-white/20 dark:border-white/10"
                          }`}
                        >
                          <span className="truncate text-left">
                            {(() => {
                              const sel = connections.find(
                                (c) => c.id === selectedConnection
                              );
                              return sel ? sel.displayName : "Create Connection";
                            })()}
                          </span>
                          <ChevronDown className="h-[1vw] w-[1vw] text-theme-secondary ml-[0.5vw]" />
                        </button>
                        {!selectedConnection && (
                          <div className="mt-[0.25vw] text-[0.75vw] text-[#ef4a45]">
                            Connection is required
                          </div>
                        )}

                        {isConnDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsConnDropdownOpen(false)}
                              onWheel={(e) => {
                                try {
                                  e.preventDefault();
                                  const el = document.getElementById(
                                    "step-settings-scroll"
                                  );
                                  if (el)
                                    el.scrollBy({
                                      top: e.deltaY,
                                      behavior: "auto",
                                    });
                                } catch {
                                  /* noop */
                                }
                              }}
                              onTouchMove={(
                                e: React.TouchEvent<HTMLDivElement>
                              ) => {
                                try {
                                  const touch = e.changedTouches?.[0];
                                  if (!touch) return;
                                  const el = document.getElementById(
                                    "step-settings-container"
                                  );
                                  if (el)
                                    el.scrollBy({ top: 12, behavior: "auto" });
                                } catch {
                                  /* noop */
                                }
                              }}
                            />
                            <div className="absolute z-20 mt-[0.5vw] w-full overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1vw] shadow-xl">
                              <div className="py-[0.3vw] max-h-[20vw] overflow-y-auto pr-[0.3vw] [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsConnDropdownOpen(false);
                                    handleCreateConnection();
                                  }}
                                  className="w-full px-[0.9vw] py-[0.6vw] text-left text-[0.9vw] text-theme-primary hover:bg-theme-input-focus transition-all duration-200"
                                >
                                  Create Connection
                                </button>
                                <div className="my-[0.25vw] h-[0.05vw] bg-white/10" />
                                {isLoadingConnections ? (
                                  <div className="px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-secondary">
                                    Loading connections...
                                  </div>
                                ) : connections.length === 0 ? (
                                  <div className="px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-secondary">
                                    No connections available
                                  </div>
                                ) : (
                                  connections.map((connection) => (
                                    <button
                                      key={connection.id}
                                      type="button"
                                      onClick={() => {
                                        handleConnectionSelect(connection.id);
                                        setIsConnDropdownOpen(false);
                                      }}
                                      className={`w-full px-[0.9vw] py-[0.6vw] text-left flex items-center gap-[0.6vw] text-[0.9vw] transition-all duration-200 ${
                                        selectedConnection === connection.id
                                          ? "bg-[#b3a1ff] text-[#222222]"
                                          : "text-theme-primary hover:bg-theme-input-focus"
                                      }`}
                                    >
                                      {connection.metadata?.pieceLogoUrl && (
                                        <img
                                          src={connection.metadata.pieceLogoUrl}
                                          alt={connection.displayName}
                                          className="w-[1.2vw] h-[1.2vw] rounded-[0.4vw] object-cover flex-shrink-0"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              "https://via.placeholder.com/20x20?text=?";
                                          }}
                                        />
                                      )}
                                      <span className="truncate">
                                        {connection.displayName}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Dynamic options dropdowns per prop */}
                    <div className="mt-[1vw]">
                      <div className="bg-theme-input/40 rounded-[0.8vw] border border-white/10 p-[1vw] shadow-sm space-y-[0.8vw]">
                        <h3 className="text-[0.9vw] font-medium text-theme-primary">
                          Options
                        </h3>
                        {discoveredOptionProps.length === 0 ? (
                          <div className="text-[0.75vw] text-theme-secondary">
                            No dynamic options
                          </div>
                        ) : (
                          discoveredOptionProps.map((propName) => {
                            const propOptions = optionsByProp[propName] || [];
                            const inputCfgRender = (((
                              step.config as Record<string, unknown> | undefined
                            )?.["input"] as
                              | Record<string, unknown>
                              | undefined) || {}) as Record<string, unknown>;
                            // Keep UI in sync: if this prop is 'auth', show selectedConnection and disable
                            const isAuthProp = propName === "auth";
                            const propTypeUc = (
                              optionPropTypesByName[propName] || ""
                            ).toUpperCase();
                            const isDropdown =
                              propTypeUc === "DROPDOWN" ||
                              propTypeUc === "STATIC_DROPDOWN" ||
                              propTypeUc === "MULTI_SELECT_DROPDOWN" ||
                              propTypeUc === "STATIC_MULTI_SELECT_DROPDOWN";
                            const isStaticDropdown =
                              propTypeUc === "STATIC_DROPDOWN" ||
                              propTypeUc === "STATIC_MULTI_SELECT_DROPDOWN";
                            const isMultiSelect =
                              propTypeUc === "MULTI_SELECT_DROPDOWN" ||
                              propTypeUc === "STATIC_MULTI_SELECT_DROPDOWN";
                            const isCheckbox = propTypeUc === "CHECKBOX";
                            const isDateTime = propTypeUc === "DATE_TIME";
                            const isLoadingThis = Boolean(
                              isLoadingOptionsByProp[propName]
                            );
                            const currentRaw = isAuthProp
                              ? (selectedConnection as unknown)
                              : (inputCfgRender[propName] as unknown);
                            const selectedValues: string[] = isCheckbox
                              ? []
                              : isMultiSelect
                              ? Array.isArray(currentRaw)
                                ? (currentRaw as unknown[]).map((v) => String(v))
                                : typeof currentRaw === "string" && currentRaw
                                ? [String(currentRaw)]
                                : []
                              : [
                                  String(
                                    (currentRaw as string | number | undefined) ??
                                      ""
                                  ),
                                ];
                            const currentLabel = isCheckbox
                              ? ""
                              : isMultiSelect
                              ? selectedValues.length > 0
                                ? selectedValues
                                    .map(
                                      (v) =>
                                        propOptions.find((o) => o.value === v)
                                          ?.label || v
                                    )
                                    .join(", ")
                                : ""
                              : propOptions.find(
                                  (o) => o.value === selectedValues[0]
                                )?.label || selectedValues[0];
                            const isRequired = Boolean(
                              optionPropsRequiredByName[propName]
                            );
                            // For required checkboxes, never block on unchecked; treat as satisfied
                            const needsAttention = isCheckbox
                              ? false
                              : isRequired &&
                                (isMultiSelect
                                  ? selectedValues.length === 0
                                  : selectedValues[0] === "");
                            return (
                              <div key={propName}>
                                <div className="text-[0.85vw] font-medium text-[#8b8b8b] mb-[0.25vw]">
                                  {propName}
                                  {isRequired && (
                                    <span className="text-[#ef4a45] ml-[0.25vw]">*</span>
                                  )}
                                </div>
                                <div className="relative">
                                  {isAuthProp ? (
                                    <input
                                      type="text"
                                      value={String(selectedConnection || "")}
                                      readOnly
                                      disabled
                                      className="block w-full rounded-[0.8vw] border border-white/20 dark:border-white/10 bg-theme-input px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-secondary"
                                    />
                                  ) : isCheckbox ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!step) return;
                                        const checked = !(currentRaw
                                          ? true
                                          : false);
                                        const prevCfg =
                                          (step.config as
                                            | Record<string, unknown>
                                            | undefined) || {};
                                        const prevInput = ((prevCfg["input"] as
                                          | Record<string, unknown>
                                          | undefined) || {}) as Record<
                                          string,
                                          unknown
                                        >;
                                        onUpdateStep(step.id, {
                                          config: {
                                            ...prevCfg,
                                            input: {
                                              ...prevInput,
                                              [propName]: checked,
                                            },
                                          },
                                        });
                                        queueUpdateActionInput({
                                          [propName]: checked,
                                        });
                                      }}
                                      className={`group inline-flex items-center gap-[0.5vw] select-none px-[0.6vw] py-[0.3vw] rounded-[0.6vw] border transition-colors ${
                                        needsAttention
                                          ? "border-[#ef4a45]"
                                          : "border-white/20 dark:border-white/10"
                                      } hover:bg-theme-input-focus`}
                                    >
                                      <span
                                        className={`inline-flex items-center justify-center w-[1.2vw] h-[1.2vw] rounded-[0.4vw] border-[0.15vw] ${
                                          currentRaw
                                            ? "bg-[#b3a1ff] border-[#b3a1ff]"
                                            : "bg-[#ebebeb] border-[#d9d9d9]"
                                        }`}
                                        aria-checked={currentRaw ? true : false}
                                        role="checkbox"
                                      >
                                        {currentRaw ? (
                                          <Check className="text-[#222222] h-[0.9vw] w-[0.9vw]" />
                                        ) : null}
                                      </span>
                                      <span className="text-[0.9vw] text-[#000] font-medium">
                                        {(currentRaw ? true : false)
                                          ? "Enabled"
                                          : "Disabled"}
                                      </span>
                                    </button>
                                  ) : isDateTime ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          // Initialize draft from existing value or now
                                          const now = new Date();
                                          let d = now;
                                          if (
                                            typeof currentRaw === "string" &&
                                            currentRaw
                                          ) {
                                            const parsed = new Date(currentRaw);
                                            if (!isNaN(parsed.getTime()))
                                              d = parsed;
                                          }
                                          const yr = d.getFullYear();
                                          const mn = d.getMonth() + 1;
                                          const dy = d.getDate();
                                          let hr = d.getHours();
                                          const ampm: "AM" | "PM" =
                                            hr >= 12 ? "PM" : "AM";
                                          hr = hr % 12;
                                          if (hr === 0) hr = 12;
                                          const min = d.getMinutes();
                                          setDateDraft({
                                            year: yr,
                                            month: mn,
                                            day: dy,
                                            hour: hr,
                                            minute: min,
                                            ampm,
                                          });
                                          setOpenDateProp((p) =>
                                            p === propName ? null : propName
                                          );
                                          try {
                                            const rect = (
                                              e.currentTarget as HTMLElement
                                            ).getBoundingClientRect();
                                            setDateAnchorRect({
                                              left: rect.left,
                                              top: rect.bottom,
                                              width: rect.width,
                                              height: rect.height,
                                            });
                                          } catch {
                                            /* noop */
                                          }
                                        }}
                                        className={`w-full inline-flex items-center justify-between px-[0.9vw] py-[0.6vw] bg-theme-input border rounded-[0.8vw] text-[0.9vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary ${
                                          needsAttention
                                            ? "border-[#ef4a45]"
                                            : "border-white/20 dark:border-white/10"
                                        }`}
                                      >
                                        <span className="truncate text-left">
                                          {typeof currentRaw === "string" &&
                                          currentRaw
                                            ? currentRaw
                                            : "Select date and time"}
                                        </span>
                                        <ChevronDown
                                          className="text-theme-secondary ml-[0.5vw] h-[1vw] w-[1vw]"
                                         />
                                      </button>
                                      {openDateProp === propName &&
                                        dateDraft &&
                                        dateAnchorRect &&
                                        createPortal(
                                          (() => {
                                            const PANEL_W = 360;
                                            const margin = 8;
                                            const left = Math.max(
                                              12,
                                              Math.min(
                                                dateAnchorRect.left,
                                                window.innerWidth - PANEL_W - 12
                                              )
                                            );
                                            const topBelow =
                                              dateAnchorRect.top + margin;
                                            const top = Math.max(
                                              12,
                                              Math.min(
                                                topBelow,
                                                window.innerHeight - 380
                                              )
                                            );
                                            const years = Array.from({
                                              length: 21,
                                            }).map((_, i) => {
                                              const base =
                                                new Date().getFullYear();
                                              const year = base - 10 + i;
                                              return {
                                                label: String(year),
                                                value: year,
                                              };
                                            });
                                            const months = Array.from({
                                              length: 12,
                                            }).map((_, i) => ({
                                              label: new Date(
                                                2000,
                                                i,
                                                1
                                              ).toLocaleString(undefined, {
                                                month: "long",
                                              }),
                                              value: i + 1,
                                            }));
                                            const hours = Array.from({
                                              length: 12,
                                            }).map((_, i) => ({
                                              label: String(i + 1),
                                              value: i + 1,
                                            }));
                                            const minutes = Array.from({ length: 60 }).map((_, i) => ({
                                              label: String(i).padStart(2, "0"),
                                              value: i,
                                            }));
                                            const ampmOpts = [
                                              { label: "AM", value: "AM" },
                                              { label: "PM", value: "PM" },
                                            ];
                                            const OptionList = (props: {
                                              options: Array<{
                                                label: string;
                                                value: string | number;
                                              }>;
                                              onPick: (
                                                v: string | number
                                              ) => void;
                                              up?: boolean;
                                              selected?: string | number;
                                            }) => (
                                              <div
                                                className={`absolute z-[62] left-0 w-full bg-theme-input backdrop-blur-md dark:border-white/10 rounded-[0.8vw] shadow-xl overflow-hidden ${
                                                   props.up
                                                     ? "bottom-full mb-1"
                                                     : "mt-1"
                                                 }`}
                                               >
                                                <div className="max-h-[12vw] overflow-y-auto py-[0.3vw] [&::-webkit-scrollbar]:w-[0.3vw] [&::-webkit-scrollbar]:h-[0.2vw] [&::-webkit-scrollbar-track]:!bg-[#e9e9ed] dark:[&::-webkit-scrollbar-track]:bg-[#2a2a2f] [&::-webkit-scrollbar-thumb]:!bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]">
                                                   {props.options.map((opt) => {
                                                     const isActive = String(opt.value) === String(props.selected ?? "");
                                                     return (
                                                       <button
                                                         key={String(opt.value)}
                                                         type="button"
                                                         onClick={() => props.onPick(opt.value)}
                                                         className={`w-full text-left px-[0.9vw] py-[0.6vw] text-[0.9vw] transition-colors ${
                                                           isActive ? "bg-[#b3a1ff] text-[#222222]" : "text-theme-primary hover:bg-theme-input-focus"
                                                         }`}
                                                       >
                                                         {opt.label}
                                                       </button>
                                                     );
                                                   })}
                                                 </div>
                                               </div>
                                            );
                                            return (
                                              <>
                                                <div
                                                  className="fixed inset-0 z-[60]"
                                                  onClick={() => {
                                                    setOpenDateProp(null);
                                                    setDateOpenField(null);
                                                  }}
                                                />
                                                <div
                                                  className="fixed z-[61] overflow-hidden bg-theme-input backdrop-blur-md dark:border-white/10 rounded-[1vw] shadow-2xl p-[0.9vw]"
                                                  style={{
                                                    left,
                                                    top,
                                                    width: PANEL_W,
                                                    maxHeight: 380,
                                                  }}
                                                >
                                                  <div className="space-y-[0.8vw]">
                                                    <div className="grid grid-cols-2 gap-[0.5vw]">
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setDateOpenField(
                                                              (f) =>
                                                                f === "year"
                                                                  ? null
                                                                  : "year"
                                                            )
                                                          }
                                                          className="w-full inline-flex items-center justify-between px-[0.6vw] py-[0.6vw] bg-theme-input !bg-[#ebebeb] dark:border-white/10 rounded-[0.8vw] text-[0.9vw] text-theme-primary"
                                                        >
                                                          <span>
                                                            {dateDraft.year}
                                                          </span>
                                                          <ChevronDown className="h-[0.9vw] w-[0.9vw] text-theme-secondary" />
                                                        </button>
                                                        {dateOpenField ===
                                                          "year" && (
                                                          <>
                                                            <div
                                                              className="fixed inset-0 z-[61] bg-black/30"
                                                              onClick={() => setDateOpenField(null)}
                                                            />
                                                            <OptionList
                                                              options={years}
                                                              onPick={(v) => {
                                                                setDateDraft(
                                                                  (prev) =>
                                                                    prev
                                                                      ? {
                                                                          ...prev,
                                                                          year: Number(
                                                                            v
                                                                          ),
                                                                        }
                                                                      : prev
                                                                );
                                                                setDateOpenField(
                                                                  null
                                                                );
                                                              }}
                                                              up={false}
                                                              selected={dateDraft.year}
                                                            />
                                                          </>
                                                        )}
                                                      </div>
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setDateOpenField(
                                                              (f) =>
                                                                f === "month"
                                                                  ? null
                                                                  : "month"
                                                            )
                                                          }
                                                          className="w-full inline-flex items-center justify-between px-[0.6vw] py-[0.6vw] bg-theme-input !bg-[#ebebeb] dark:border-white/10 rounded-[0.8vw] text-[0.9vw] text-theme-primary"
                                                        >
                                                          <span>
                                                            {new Date(
                                                              2000,
                                                              dateDraft.month - 1,
                                                              1
                                                            ).toLocaleString(
                                                              undefined,
                                                              { month: "long" }
                                                            )}
                                                          </span>
                                                          <ChevronDown className="h-[0.9vw] w-[0.9vw] text-theme-secondary" />
                                                        </button>
                                                        {dateOpenField ===
                                                          "month" && (
                                                          <>
                                                            <div
                                                              className="fixed inset-0 z-[61] bg-black/30"
                                                              onClick={() => setDateOpenField(null)}
                                                            />
                                                            <OptionList
                                                              options={months}
                                                              onPick={(v) => {
                                                                setDateDraft(
                                                                  (prev) =>
                                                                    prev
                                                                      ? {
                                                                          ...prev,
                                                                          month:
                                                                            Number(
                                                                              v
                                                                            ),
                                                                          day: Math.min(
                                                                            prev.day,
                                                                            daysInMonth(
                                                                              prev.year,
                                                                              Number(
                                                                                v
                                                                              )
                                                                            )
                                                                          ),
                                                                        }
                                                                      : prev
                                                                );
                                                                setDateOpenField(
                                                                  null
                                                                );
                                                              }}
                                                              up={false}
                                                              selected={dateDraft.month}
                                                            />
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-[0.25vw]">
                                                      {Array.from({
                                                        length: daysInMonth(
                                                          dateDraft.year,
                                                          dateDraft.month
                                                        ),
                                                      }).map((_, i) => {
                                                        const day = i + 1;
                                                        const active =
                                                          day === dateDraft.day;
                                                        return (
                                                          <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() =>
                                                              setDateDraft(
                                                                (prev) =>
                                                                  prev
                                                                    ? {
                                                                        ...prev,
                                                                        day,
                                                                      }
                                                                    : prev
                                                              )
                                                            }
                                                            className={`px-[0.6vw] py-[0.3vw] rounded-[0.6vw] text-[0.9vw] ${
                                                              active
                                                                ? "bg-[#b3a1ff] text-[#222222]"
                                                                : "hover:bg-theme-input-focus"
                                                            }`}
                                                          >
                                                            {day}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-[0.5vw]">
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setDateOpenField(
                                                              (f) =>
                                                                f === "hour"
                                                                  ? null
                                                                  : "hour"
                                                            )
                                                          }
                                                          className="w-full inline-flex items-center justify-between px-[0.6vw] py-[0.6vw] bg-theme-input !bg-[#ebebeb] dark:border-white/10 rounded-[0.8vw] text-[0.9vw] text-theme-primary"
                                                        >
                                                          <span>
                                                            {String(
                                                              dateDraft.hour
                                                            ).padStart(2, "0")}
                                                          </span>
                                                          <ChevronDown className="h-[0.9vw] w-[0.9vw] text-theme-secondary" />
                                                        </button>
                                                        {dateOpenField ===
                                                          "hour" && (
                                                          <>
                                                            <div
                                                              className="fixed inset-0 z-[61] bg-black/30"
                                                              onClick={() => setDateOpenField(null)}
                                                            />
                                                            <OptionList
                                                              options={hours}
                                                              onPick={(v) => {
                                                                setDateDraft(
                                                                  (prev) =>
                                                                    prev
                                                                      ? {
                                                                          ...prev,
                                                                          hour: Number(
                                                                            v
                                                                          ),
                                                                        }
                                                                      : prev
                                                                );
                                                                setDateOpenField(
                                                                  null
                                                                );
                                                              }}
                                                              up={true}
                                                              selected={dateDraft.hour}
                                                            />
                                                          </>
                                                        )}
                                                      </div>
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setDateOpenField(
                                                              (f) =>
                                                                f === "minute"
                                                                  ? null
                                                                  : "minute"
                                                            )
                                                          }
                                                          className="w-full inline-flex items-center justify-between px-[0.6vw] py-[0.6vw] bg-theme-input !bg-[#ebebeb] dark:border-white/10 rounded-[0.8vw] text-[0.9vw] text-theme-primary"
                                                        >
                                                          <span>
                                                            {String(
                                                              dateDraft.minute
                                                            ).padStart(2, "0")}
                                                          </span>
                                                          <ChevronDown className="h-[0.9vw] w-[0.9vw] text-theme-secondary" />
                                                        </button>
                                                        {dateOpenField ===
                                                          "minute" && (
                                                          <>
                                                            <div
                                                              className="fixed inset-0 z-[61] bg-black/30"
                                                              onClick={() => setDateOpenField(null)}
                                                            />
                                                            <OptionList
                                                              options={minutes}
                                                              onPick={(v) => {
                                                                setDateDraft(
                                                                  (prev) =>
                                                                    prev
                                                                      ? {
                                                                          ...prev,
                                                                          minute: Number(
                                                                            v
                                                                          ),
                                                                        }
                                                                      : prev
                                                                );
                                                                setDateOpenField(
                                                                  null
                                                                );
                                                              }}
                                                              up={true}
                                                              selected={dateDraft.minute}
                                                            />
                                                          </>
                                                        )}
                                                      </div>
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setDateOpenField(
                                                              (f) =>
                                                                f === "ampm"
                                                                  ? null
                                                                  : "ampm"
                                                            )
                                                          }
                                                          className="w-full inline-flex items-center justify-between px-[0.6vw] py-[0.6vw] bg-theme-input !bg-[#ebebeb] dark:border-white/10 rounded-[0.8vw] text-[0.9vw] text-theme-primary"
                                                        >
                                                          <span>
                                                            {dateDraft.ampm}
                                                          </span>
                                                          <ChevronDown className="h-[0.9vw] w-[0.9vw] text-theme-secondary" />
                                                        </button>
                                                        {dateOpenField ===
                                                          "ampm" && (
                                                          <>
                                                            <div
                                                              className="fixed inset-0 z-[61] bg-black/30"
                                                              onClick={() => setDateOpenField(null)}
                                                            />
                                                            <OptionList
                                                              options={ampmOpts}
                                                              onPick={(v) => {
                                                                setDateDraft(
                                                                  (prev) =>
                                                                    prev
                                                                      ? {
                                                                          ...prev,
                                                                          ampm: String(v) as "AM" | "PM",
                                                                        }
                                                                      : prev
                                                                );
                                                                setDateOpenField(
                                                                  null
                                                                );
                                                              }}
                                                              up={true}
                                                              selected={dateDraft.ampm}
                                                            />
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-[0.5vw] pt-[0.25vw]">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setOpenDateProp(null);
                                                          setDateOpenField(null);
                                                        }}
                                                        className="px-[0.9vw] py-[0.45vw] text-[0.75vw] rounded-[0.8vw] bg-theme-input hover:bg-theme-input-focus text-theme-primary border border-white/20 dark:border-white/10"
                                                      >
                                                        Cancel
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const yyyy = dateDraft.year;
                                                          const mm = String(dateDraft.month).padStart(2, "0");
                                                          const dd = String(dateDraft.day).padStart(2, "0");
                                                          let hr = dateDraft.hour % 12;
                                                          if (dateDraft.ampm === "PM") hr += 12;
                                                          const HH = String(hr).padStart(2, "0");
                                                          const MM = String(dateDraft.minute).padStart(2, "0");
                                                          const iso = `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
                                                          const prevCfg = (step?.config as Record<string, unknown>) || {};
                                                          const prevInput = ((prevCfg["input"] as
                                                            | Record<string, unknown>
                                                            | undefined) || {}) as Record<string, unknown>;
                                                          onUpdateStep(step!.id, {
                                                            config: {
                                                              ...prevCfg,
                                                              input: {
                                                                ...prevInput,
                                                                [propName]: iso,
                                                              },
                                                            },
                                                          });
                                                          queueUpdateActionInput({ [propName]: iso });
                                                          setOpenDateProp(null);
                                                          setDateOpenField(null);
                                                        }}
                                                        className="px-[0.9vw] py-[0.45vw] text-[0.75vw] rounded-[0.8vw] bg-theme-primary text-theme-inverse hover:bg-[#a08fff]"
                                                      >
                                                        Apply
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })(),
                                          document.body
                                        )}
                                    </>
                                  ) : !isDropdown ? (
                                    <input
                                      type="text"
                                      value={uiValuesByProp[propName] ?? selectedValues[0]}
                                      onFocus={() => {
                                        if (
                                          propName !== "displayName" &&
                                          !isDateTime &&
                                          typeof onOpenDataSelector === "function"
                                        )
                                          onOpenDataSelector();
                                        setFocusedPropName(propName);
                                        try {
                                          const el = inputRefs.current[propName];
                                          focusedCaretRef.current =
                                            el?.selectionStart ?? null;
                                        } catch {
                                          /* noop */
                                        }
                                      }}
                                      onMouseDown={() => {
                                        if (
                                          propName !== "displayName" &&
                                          typeof onOpenDataSelector === "function"
                                        )
                                          onOpenDataSelector();
                                        setFocusedPropName(propName);
                                      }}
                                      onChange={(e) => {
                                        if (!step) return;
                                        const nextVal = e.target.value;
                                        setUiValuesByProp((prev) => ({ ...prev, [propName]: nextVal }));
                                        const payloadVal = convertUiToPayload(nextVal);
                                        const prevCfg =
                                          (step.config as
                                            | Record<string, unknown>
                                            | undefined) || {};
                                        const prevInput = ((prevCfg["input"] as
                                          | Record<string, unknown>
                                          | undefined) || {}) as Record<
                                          string,
                                          unknown
                                        >;
                                        onUpdateStep(step.id, {
                                          config: {
                                            ...prevCfg,
                                            input: {
                                              ...prevInput,
                                              [propName]: payloadVal,
                                            },
                                          },
                                        });
                                        // Queue UPDATE_ACTION with rate limit (1 per 5s)
                                        queueUpdateActionInput({ [propName]: payloadVal });
                                      }}
                                      placeholder="Enter value"
                                      className={`w-full px-[0.9vw] py-[0.6vw] bg-theme-input border rounded-[0.8vw] text-[0.9vw] text-theme-primary placeholder-theme-secondary focus:ring-[0.15vw] focus:ring-theme-primary/20 ${
                                        needsAttention
                                          ? "border-[#ef4a45]"
                                          : "border-white/20 dark:border-white/10"
                                      }`}
                                      ref={(el) => {
                                        inputRefs.current[propName] = el;
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        disabled={
                                          isStaticDropdown
                                            ? false
                                            : !selectedConnection || isLoadingThis
                                        }
                                        onClick={() => {
                                          if (!isStaticDropdown) {
                                            // If refreshers not satisfied, warn and skip opening
                                            const refreshers =
                                              optionPropRefreshersByName[
                                                propName
                                              ] || [];
                                            const extra = refreshers.filter(
                                              (r) => r !== "auth"
                                            );
                                            const missing = extra.filter((r) => {
                                              const typeUc = (optionPropTypesByName[r] || "").toUpperCase();
                                              if (typeUc === "CHECKBOX") return false; // treat checkbox refresher as satisfied
                                              const cfgObj = (step?.config as Record<string, unknown> | undefined) || {};
                                              const inputCfgObj = ((cfgObj["input"] as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
                                              const v = (inputCfgObj as Record<string, unknown>)[r] ?? (cfgObj as Record<string, unknown>)[r];
                                              return (
                                                v === undefined ||
                                                v === null ||
                                                String(v) === ""
                                              );
                                            });
                                            if (missing.length > 0) {
                                              const msg = `Select ${missing.join(
                                                ", "
                                              )} to load ${propName} options`;
                                              try {
                                                toastWarning(
                                                  "More info required",
                                                  msg
                                                );
                                              } catch {
                                                /* noop */
                                              }
                                              return;
                                            }
                                          }
                                          setOpenPropDropdown((v) =>
                                            v === propName ? null : propName
                                          );
                                        }}
                                        className={`w-full inline-flex items-center justify-between px-[0.9vw] py-[0.6vw] bg-theme-input border rounded-[0.8vw] text-[0.9vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary disabled:opacity-60 disabled:cursor-not-allowed ${
                                          !selectedConnection
                                            ? "border-[#ef4a45]"
                                            : "border-white/20 dark:border-white/10"
                                        }`}
                                      >
                                        <span className="truncate text-left">
                                          {(
                                            isStaticDropdown
                                              ? false
                                              : isLoadingThis
                                          )
                                            ? "Loading options..."
                                            : propOptions.length > 0
                                            ? currentLabel ||
                                              (isMultiSelect
                                                ? selectedValues.length > 0
                                                  ? `${selectedValues.length} selected`
                                                  : "Select options"
                                                : "Select option")
                                            : "No options"}
                                        </span>
                                        <ChevronDown
                                          size={16}
                                          className="text-theme-secondary ml-[0.5vw] h-[1vw] w-[1vw]"
                                         />
                                      </button>
                                      {openPropDropdown === propName ? (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() =>
                                              setOpenPropDropdown(null)
                                            }
                                            onWheel={(e) => {
                                              try {
                                                e.preventDefault();
                                                const el =
                                                  document.getElementById(
                                                    "step-settings-scroll"
                                                  );
                                                if (el)
                                                  el.scrollBy({
                                                    top: e.deltaY,
                                                    behavior: "auto",
                                                  });
                                              } catch {
                                                /* noop */
                                              }
                                            }}
                                            onTouchMove={(
                                              e: React.TouchEvent<HTMLDivElement>
                                            ) => {
                                              try {
                                                const touch =
                                                  e.changedTouches?.[0];
                                                if (!touch) return;
                                                const el =
                                                  document.getElementById(
                                                    "step-settings-container"
                                                  );
                                                if (el)
                                                  el.scrollBy({
                                                    top: 12,
                                                    behavior: "auto",
                                                  });
                                              } catch {
                                                /* noop */
                                              }
                                            }}
                                          />
                                          <div
                                            className="absolute z-20 mt-[0.5vw] w-full overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1vw] shadow-xl"
                                            style={{ maxHeight: 280 }}
                                          >
                                            <div className="py-[0.3vw] h-full overflow-y-auto pr-[0.3vw] [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]">
                                              {isLoadingThis ? (
                                                <div className="px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-secondary">
                                                  Loading options...
                                                </div>
                                              ) : propOptions.length === 0 ? (
                                                <div className="px-[0.9vw] py-[0.6vw] text-[0.9vw] text-theme-secondary">
                                                  No options available
                                                </div>
                                              ) : (
                                                propOptions.map((opt) => {
                                                  const isSelected = selectedValues.some(
                                                    (v) => v === opt.value
                                                  );
                                                  return (
                                                    <button
                                                      key={`${propName}::${opt.value}`}
                                                      type="button"
                                                      onClick={() => {
                                                        // Update selected value(s)
                                                        if (isMultiSelect) {
                                                          const nextVals = isSelected
                                                            ? selectedValues.filter((v) => v !== opt.value)
                                                            : [...selectedValues, String(opt.value)];
                                                          if (step) {
                                                            const prevCfg = (step.config as Record<string, unknown>) || {};
                                                            const prevInput = ((prevCfg["input"] as
                                                              | Record<string, unknown>
                                                              | undefined) || {}) as Record<string, unknown>;
                                                            onUpdateStep(step.id, {
                                                              config: {
                                                                ...prevCfg,
                                                                input: {
                                                                  ...prevInput,
                                                                  [propName]: nextVals,
                                                                },
                                                              },
                                                            });
                                                            queueUpdateActionInput({ [propName]: nextVals });
                                                            refetchDependentDropdowns(propName);
                                                          }
                                                        } else {
                                                          if (step) {
                                                            const prevCfg = (step.config as Record<string, unknown>) || {};
                                                            const prevInput = ((prevCfg["input"] as
                                                              | Record<string, unknown>
                                                              | undefined) || {}) as Record<string, unknown>;
                                                            onUpdateStep(step.id, {
                                                              config: {
                                                                ...prevCfg,
                                                                input: {
                                                                  ...prevInput,
                                                                  [propName]: opt.value,
                                                                },
                                                              },
                                                            });
                                                            queueUpdateActionInput({ [propName]: opt.value });
                                                            refetchDependentDropdowns(propName);
                                                          }
                                                        }
                                                        if (!isMultiSelect) setOpenPropDropdown(null);
      }}
                                                      className={`w-full px-[0.9vw] py-[0.6vw] text-left text-[0.9vw] transition-all duration-200 ${
                                                        isSelected
                                                          ? "bg-[#b3a1ff] text-[#222222]"
                                                          : "text-theme-primary hover:bg-theme-input-focus"
                                                      }`}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-theme-input/40 rounded-[0.8vw] border border-white/10 p-[1vw] shadow-sm">
            
                  <div className="space-y-[0.8vw]">
                    {step.type === "trigger" ? (
                      <div>
                        <label className="block text-[0.9vw] font-medium text-theme-primary mb-[0.5vw]">
                          Token
                        </label>
                        <input
                          type="text"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="secret-webhook-token"
                          className="w-full px-[0.9vw] py-[0.6vw] bg-theme-input border border-white/20 dark:border-white/10 rounded-[0.8vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[0.9vw] font-medium text-theme-primary mb-[0.5vw]">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter display name"
                          className="w-full px-[0.9vw] py-[0.6vw] bg-theme-input border border-white/20 dark:border-white/10 rounded-[0.8vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    )}
                    {step.type === "code" && (
                      <div>
                        <label className="block text-[0.9vw] font-medium text-theme-primary mb-[0.5vw]">
                          Source Code
                        </label>
                        <textarea
                          value={sourceCode}
                          onChange={(e) => setSourceCode(e.target.value)}
                          rows={12}
                          className="w-full px-[0.9vw] py-[0.6vw] bg-theme-input border border-white/20 dark:border-white/10 rounded-[0.8vw] focus:ring-[0.15vw] focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200 font-mono text-[0.75vw]"
                        />
                      </div>
                    )}
                    <div className="pt-[0.6vw]">
                      <button
                        disabled={
                          !step ||
                          (step.type === "trigger"
                            ? token.trim().length === 0
                            : step.type === "code"
                            ? displayName.trim() ===
                                (step.displayName || "").trim() &&
                              sourceCode.trim() ===
                                (
                                  getExistingSourceCode(step) ||
                                  "export const code = async (inputs) => {\n  return { success: true };\n};"
                                ).trim()
                            : displayName.trim() ===
                              (step.displayName || "").trim())
                        }
                        onClick={async () => {
                          if (!step) return;
                          try {
                            const stored =
                              sessionStorage.getItem("zw_current_flow");
                            const parsed = stored
                              ? (JSON.parse(stored) as { id?: string })
                              : undefined;
                            if (!parsed?.id) {
                              // toastError(
                              //   "No flow selected",
                              //   "Open a flow before saving"
                              // );
                              return;
                            }

                            if (step.type === "trigger") {
                              setToken("");
                              toastSuccess(
                                "Trigger configured",
                                "Trigger settings updated"
                              );
                            } else if (step.type === "code") {
                              // For code nodes, use UPDATE_ACTION API
                              const requestBody: Record<string, unknown> = {
                                type: "CODE",
                                name: step.name || "code_step_1",
                                valid: true,
                                settings: {
                                  input: {},
                                },
                              };

                              // Only include changed fields
                              if (
                                displayName.trim() !==
                                (step.displayName || "").trim()
                              ) {
                                requestBody.displayName = displayName;
                              } else {
                                requestBody.displayName =
                                  "Updated Process Data";
                              }

                              const existingCode =
                                getExistingSourceCode(step) ||
                                "export const code = async (inputs) => {\n  return { success: true };\n};";
                              if (sourceCode.trim() !== existingCode.trim()) {
                                (
                                  requestBody.settings as Record<
                                    string,
                                    unknown
                                  >
                                ).sourceCode = { code: sourceCode };
                              }

                              await updateAction(
                                parsed.id,
                                requestBody as Parameters<
                                  typeof updateAction
                                >[1]
                              );
                              onUpdateStep(step.id, {
                                displayName: displayName,
                                config: {
                                  ...step.config,
                                  sourceCode: { code: sourceCode },
                                },
                              });
                              toastSuccess(
                                "Code updated",
                                "Code has been updated successfully"
                              );
                            } else {
                              // For other nodes, use changeWorkflowName API
                              await changeWorkflowName(parsed.id, {
                                displayName,
                              });
                              onUpdateStep(step.id, { displayName });
                              toastSuccess(
                                "Name updated",
                                "Display name has been updated successfully"
                              );
                            }
                          } catch (e) {
                            console.error("Failed to save", e);
                            // toastError(
                            //   "Update failed",
                            //   "Could not save changes"
                            // );
                          }
                        }}
                        className="px-[0.9vw] py-[0.6vw] bg-theme-primary text-theme-inverse text-[0.75vw] font-medium rounded-[0.8vw] hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                    {step.config && Object.keys(step.config).length > 0 && (
                      <div>
                        <label className="block text-[0.9vw] font-medium text-theme-primary mb-[0.5vw]">
                          Configuration
                        </label>
                        <div className="bg-theme-input/50 p-[0.9vw] rounded-[0.8vw] border border-white/20 dark:border-white/10">
                          <pre className="text-[0.75vw] text-theme-secondary overflow-auto">
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
          <div
            className="h-1 !bg-[#e3e3e5] dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-row-resize flex items-center justify-center relative transition-all duration-200"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-8 bg-[#b8b8b8] rounded-full hover:bg-theme-primary transition-all duration-200"></div>
            </div>
          </div>
          <div
            className="flex flex-col min-h-0"
            style={{
              height: `${100 - topSectionHeight}%`,
              minHeight: 220,
            }}
          >
            <div className="flex-shrink-0 p-[1vw] border-b border-white/20 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.9vw] font-medium text-theme-primary">
                  Sample Data
                </h3>
                <div className="flex items-center gap-[0.5vw]">
                  <button
                    className="px-[0.9vw] py-[0.6vw] bg-theme-primary text-theme-inverse text-[0.75vw] font-medium rounded-[0.8vw] hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                    disabled={isGetSampleDisabled}
                    onClick={async () => {
                      if (!step || isGetSampleDisabled) return;
                      try {
                        let flowId: string | undefined;
                        const stored =
                          sessionStorage.getItem("zw_current_flow");
                        if (stored) {
                          const parsed = JSON.parse(stored) as { id?: string };
                          if (parsed?.id) flowId = parsed.id;
                        }
                        if (!flowId) {
                          const lastId = sessionStorage.getItem(
                            "zw_last_created_flow_id"
                          );
                          if (lastId) flowId = lastId;
                        }
                        if (!flowId) return;
                        const stepSegment =
                          step.type === "trigger"
                            ? "trigger"
                            : step.name || "trigger";
                        setIsLoadingSample(true);
                        const resp = await getSampleData(
                          flowId,
                          stepSegment,
                          "OUTPUT"
                        );
                        setSampleResponse(resp);
                      } catch (error) {
                        console.error("Failed to load sample data", error);
                        setSampleResponse({
                          error: "Could not load sample data",
                        });
                      } finally {
                        setIsLoadingSample(false);
                      }
                    }}
                  >
                    Get sample data
                  </button>
                  <button
                    className="px-[0.9vw] py-[0.6vw] bg-theme-primary text-theme-inverse text-[0.75vw] font-medium rounded-[0.8vw] hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                    onClick={async () => {
                      if (!step) return;
                      try {
                        let flowId: string | undefined;
                        const stored =
                          sessionStorage.getItem("zw_current_flow");
                        if (stored) {
                          const parsed = JSON.parse(stored) as { id?: string };
                          if (parsed?.id) flowId = parsed.id;
                        }
                        if (!flowId) {
                          const lastId = sessionStorage.getItem(
                            "zw_last_created_flow_id"
                          );
                          if (lastId) flowId = lastId;
                        }
                        if (!flowId) {
                          // toastError("No flow selected", "Open a flow before testing");
                          return;
                        }
                        const stepName = step.name || "send_email_1";
                        setIsLoadingSample(true);
                        let effectiveStepName = stepName;
                        try {
                          if (step.pieceName) {
                            const normalizedPieceName = step.pieceName.startsWith(
                              "@activepieces/piece-"
                            )
                              ? step.pieceName
                              : `@activepieces/piece-${step.pieceName}`;
                            const resolved = await resolveStepName(
                              flowId,
                              normalizedPieceName
                            );
                            if (resolved) effectiveStepName = resolved;
                          }
                        } catch {
                          /* noop */
                        }
                        let latestInput: Record<string, unknown> | undefined;
                        try {
                          if (step.pieceName) {
                            const normalizedPieceName = step.pieceName.startsWith(
                              "@activepieces/piece-"
                            )
                              ? step.pieceName
                              : `@activepieces/piece-${step.pieceName}`;
                            latestInput = await fetchLatestStepInput(
                              String(flowId),
                              normalizedPieceName
                            );
                          }
                        } catch {
                          /* noop */
                        }
                        const payload = {
                          testInput:
                            (latestInput && typeof latestInput === "object"
                              ? latestInput
                              : ({} as Record<string, unknown>)),
                          saveOutput: true,
                        };
                        const response = await testStep(
                          flowId,
                          effectiveStepName,
                          payload
                        );
                        setSampleResponse(response);
                        toastSuccess("Test executed", "Step test completed");
                      } catch (error) {
                        console.error("Test failed", error);
                        // toastError("Test failed", "Could not execute step test");
                      } finally {
                        setIsLoadingSample(false);
                      }
                    }}
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="p-[1vw] h-full overflow-y-auto [&::-webkit-scrollbar]:w-[0.25vw] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#c3c3c7] dark:[&::-webkit-scrollbar-thumb]:bg-[#606066] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#b0b0b4] dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#707077]">
                <div className="bg-theme-input/50 p-[0.9vw] rounded-[0.8vw] border border-white/20 dark:border-white/10">
                  {isLoadingSample ? (
                    <div className="text-[0.75vw] text-theme-secondary">
                      Loading sample data...
                    </div>
                  ) : (
                    <pre className="text-[0.75vw] text-theme-secondary overflow-auto">
                      {sampleResponse
                        ? JSON.stringify(sampleResponse, null, 2)
                        : "No sample data available"}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
