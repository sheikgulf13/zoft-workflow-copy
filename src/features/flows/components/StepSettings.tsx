import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
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
  const [isLoadingOptionsByProp, setIsLoadingOptionsByProp] = useState<Record<string, boolean>>({});
  const [optionsByProp, setOptionsByProp] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [discoveredOptionProps, setDiscoveredOptionProps] = useState<string[]>([]);
  const [optionPropsRequiredByName, setOptionPropsRequiredByName] = useState<Record<string, boolean>>({});
  const [optionPropTypesByName, setOptionPropTypesByName] = useState<Record<string, string>>({});
  const [optionPropRefreshersByName, setOptionPropRefreshersByName] = useState<Record<string, string[]>>({});
  const fetchedOptionKeysRef = useRef<Set<string>>(new Set());
  const optionsRequestGuardRef = useRef<Set<string>>(new Set());
  const prevOptionsBaseRef = useRef<string | null>(null);
  // Track focused input and caret to support data selector insertion
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusedPropName, setFocusedPropName] = useState<string | null>(null);
  const focusedCaretRef = useRef<number | null>(null);
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

  // Helper: get current flowId from session
  const getCurrentFlowId = useCallback((): string | undefined => {
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

  // Helper: send UPDATE_ACTION with changed input props; keeps other inputs intact
  const postUpdateActionInput = useCallback(async (changed: Record<string, unknown>) => {
    if (!step || step.type !== "action" || !step.actionName || !step.pieceName) return;
    const flowId = getCurrentFlowId();
    if (!flowId || !currentProject?.id) return;
    const normalizedPieceName = step.pieceName.startsWith("@activepieces/piece-")
      ? step.pieceName
      : `@activepieces/piece-${step.pieceName}`;
    const cfg = (step.config ?? {}) as Record<string, unknown>;
    const pieceVersion = typeof cfg.pieceVersion === "string" ? (cfg.pieceVersion as string) : "latest";
    // Build input by merging discovered props from current config and the change
    const input: Record<string, unknown> = {};
    try {
      discoveredOptionProps.forEach((p) => {
        const v = (cfg as Record<string, unknown>)[p];
        if (v !== undefined) input[p] = v as unknown;
      });
    } catch { /* noop */ }
    Object.assign(input, changed);
    // Include auth (connectionId) if available
    const auth = typeof cfg.connectionId === "string" && cfg.connectionId ? cfg.connectionId : (selectedConnection || undefined);
    const effectiveStepName = await resolveStepName(flowId, normalizedPieceName);
    const body = {
      type: "UPDATE_ACTION",
      request: {
        name: effectiveStepName || step.name,
        type: "PIECE",
        displayName: step.displayName,
        settings: {
          auth,
          pieceName: normalizedPieceName,
          pieceVersion,
          actionName: step.actionName,
          input,
        },
      },
    } as const;
    try {
      await http.post(`/projects/${currentProject.id}/flows/${flowId}`, body);
    } catch { /* best-effort */ }
  }, [step, selectedConnection, currentProject?.id, discoveredOptionProps, getCurrentFlowId, resolveStepName]);

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
    if (step?.config && typeof step.config === "object") {
      const cfg = step.config as Record<string, unknown>;
      const cid = typeof cfg.connectionId === "string" ? cfg.connectionId : "";
      if (cid) setSelectedConnection(cid);
      const props = Array.isArray(
        (cfg as Record<string, unknown>)["optionProps"]
      )
        ? ((cfg as Record<string, unknown>)[
            "optionProps"
          ] as unknown[] as string[])
        : [];
      if (Array.isArray(props) && props.length > 0) {
        setDiscoveredOptionProps(props);
      }
    }
  }, [step]);

  useEffect(() => {
    if (isOpen && step?.pieceName) {
      loadConnections();
    }
  }, [isOpen, step?.pieceName, loadConnections, step]);
  useEffect(() => {
    setDisplayName(step?.displayName || "");
    setIsConnDropdownOpen(false);
  }, [step]);
  useEffect(() => {
    if (step?.type === "code") {
      // Initialize source code from config or use default
      const defaultCode =
        "export const code = async (inputs) => {\n  return { success: true };\n};";
      const existingCode = getExistingSourceCode(step) || defaultCode;
      setSourceCode(existingCode);
    }
  }, [step]);

  // Removed metadata fetch

  // Load sample data for bottom panel when opening StepSettings
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !step) return;
      let flowId: string | undefined;
      try {
        const stored = sessionStorage.getItem("zw_current_flow");
        if (stored) {
          const parsed = JSON.parse(stored) as { id?: string };
          if (parsed?.id) flowId = parsed.id;
        }
      } catch {
        /* noop */
      }
      if (!flowId) {
        const lastId = sessionStorage.getItem("zw_last_created_flow_id");
        if (lastId) flowId = lastId;
      }
      if (!flowId) return;
    try {
      setIsLoadingSample(true);
        const stepSegment =
          step.type === "trigger" ? "trigger" : step.name || "trigger";
      const resp = await getSampleData(flowId, stepSegment, "OUTPUT");
      setSampleResponse(resp);
      } catch (error) {
        console.error("Failed to load sample data", error);
        setSampleResponse({ error: "Could not load sample data" });
      } finally {
        setIsLoadingSample(false);
      }
    };
    run();
  }, [isOpen, step, currentProject?.id]);

  const handleConnectionSelect = async (connectionId: string) => {
    const prevSelected = selectedConnection;
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
      const pieceVersion = typeof cfg.pieceVersion === "string" ? (cfg.pieceVersion as string) : "latest";
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
        const effectiveStepName = await resolveStepName(flowId, normalizedPieceName);
        const input = typeof cfg.input === "object" && cfg.input !== null ? (cfg.input as Record<string, unknown>) : {};
        const body = {
          type: "UPDATE_ACTION",
          request: {
            name: effectiveStepName || step.name,
            type: "PIECE",
            displayName: step.displayName,
            settings: {
              auth: connectionId,
              pieceName: normalizedPieceName,
              pieceVersion,
              actionName: step.actionName,
              input,
            },
          },
        } as const;
        await http.post(`/projects/${currentProject.id}/flows/${flowId}`, body);
      }

      // Options load handled by guarded effect after selectedConnection changes
    } catch {
      // Revert optimistic state on failure
      setSelectedConnection(prevSelected);
      if (step) onUpdateStep(step.id, { config: prevConfig });
    }
  };

  // Helper: fetch piece action props from cloud API
  const fetchActionPropNames = useCallback(async (): Promise<{ names: string[]; requiredByName: Record<string, boolean>; typesByName: Record<string, string>; refreshersByName: Record<string, string[]> }> => {
    if (!step?.pieceName || (!step?.actionName && !step?.triggerName)) return { names: [], requiredByName: {}, typesByName: {}, refreshersByName: {} };
    const normalizedPieceName = step.pieceName.startsWith("@activepieces/piece-")
      ? step.pieceName
      : `@activepieces/piece-${step.pieceName}`;
    try {
      const resp = await fetch(`https://cloud.activepieces.com/api/v1/pieces/${normalizedPieceName}`);
      if (!resp.ok) return { names: [], requiredByName: {}, typesByName: {}, refreshersByName: {} };
      const schema = (await resp.json()) as Record<string, unknown>;
      if (step.type === "trigger" && step.triggerName) {
        const triggers = (schema["triggers"] as Record<string, unknown>) || {};
        const trigSchema = (triggers[step.triggerName] as Record<string, unknown>) || {};
        const props = (trigSchema["props"] as Record<string, unknown>) || {};
        const requiredByName: Record<string, boolean> = {};
        const typesByName: Record<string, string> = {};
        const refreshersByName: Record<string, string[]> = {};
        Object.entries(props).forEach(([k, v]) => {
          const p = (v as Record<string, unknown>) || {};
          requiredByName[k] = Boolean(p["required"]);
          typesByName[k] = String(p["type"] || "");
          const refArr = Array.isArray(p["refreshers"]) ? (p["refreshers"] as unknown[]) : [];
          refreshersByName[k] = refArr.map((r) => String(r));
        });
        return { names: Object.keys(props), requiredByName, typesByName, refreshersByName };
      }
      const actions = (schema["actions"] as Record<string, unknown>) || {};
      const actionSchema = (actions[step.actionName as string] as Record<string, unknown>) || {};
      const props = (actionSchema["props"] as Record<string, unknown>) || {};
      const requiredByName: Record<string, boolean> = {};
      const typesByName: Record<string, string> = {};
      const refreshersByName: Record<string, string[]> = {};
      Object.entries(props).forEach(([k, v]) => {
        const p = (v as Record<string, unknown>) || {};
        requiredByName[k] = Boolean(p["required"]);
        typesByName[k] = String(p["type"] || "");
        const refArr = Array.isArray(p["refreshers"]) ? (p["refreshers"] as unknown[]) : [];
        refreshersByName[k] = refArr.map((r) => String(r));
      });
      return { names: Object.keys(props), requiredByName, typesByName, refreshersByName };
    } catch {
      return { names: [], requiredByName: {}, typesByName: {}, refreshersByName: {} };
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
            const cacheKey = `${connectionId}::${
              effectiveStepName || step.name
            }::${propertyName}`;
            if (fetchedOptionKeysRef.current.has(cacheKey)) continue;
            setIsLoadingOptionsByProp((prev) => ({ ...prev, [propertyName]: true }));
            // Build currentValues with refreshers
            const refreshers = optionPropRefreshersByName[propertyName] || [];
            const currentValues: Record<string, unknown> = { connectionId };
            refreshers
              .filter((r) => r !== "auth")
              .forEach((r) => {
                const v = (step.config as Record<string, unknown> | undefined)?.[r];
                if (v !== undefined && v !== null && String(v) !== "") {
                  currentValues[r] = v as unknown;
                }
              });
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
            setIsLoadingOptionsByProp((prev) => ({ ...prev, [propertyName]: false }));
          }
        }
      } finally {
        // noop
      }
    },
    [currentProject?.id, step, discoveredOptionProps, resolveStepName, optionPropRefreshersByName]
  );

  // Discover props when opening or step changes (actions and piece triggers)
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.type === "trigger" && !step.pieceName) return; // skip webhook trigger
    (async () => {
      const { names, requiredByName, typesByName, refreshersByName } = await fetchActionPropNames();
      if (names.length > 0) {
        const prev = discoveredOptionProps;
        const same = prev.length === names.length && prev.every((p, i) => p === names[i]);
        if (!same) setDiscoveredOptionProps(names);
        setOptionPropsRequiredByName(requiredByName);
        setOptionPropTypesByName(typesByName);
        setOptionPropRefreshersByName(refreshersByName);
      } else {
        setDiscoveredOptionProps([]);
        setOptionPropsRequiredByName({});
        setOptionPropTypesByName({});
        setOptionPropRefreshersByName({});
      }
    })();
  }, [isOpen, step, fetchActionPropNames, discoveredOptionProps]);

  // Listen for data selector token insertions and apply to currently focused input
  useEffect(() => {
    const handler = (e: CustomEvent<{ token?: string }>) => {
      const tokenStr = e?.detail?.token || "";
      if (!tokenStr || !focusedPropName) return;
      const el = inputRefs.current[focusedPropName];
      if (!el) return;
      const start = el.selectionStart ?? focusedCaretRef.current ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const next = `${before}${tokenStr}${after}`;
      el.value = next;
      // Update step config and backend
      if (step) {
        onUpdateStep(step.id, { config: { ...step.config, [focusedPropName]: next } });
        void postUpdateActionInput({ [focusedPropName]: next });
      }
      try {
        const newCaret = start + tokenStr.length;
        el.setSelectionRange(newCaret, newCaret);
        el.focus();
      } catch { /* noop */ }
    };
    window.addEventListener("zw:insert-data-token", handler as EventListener);
    return () => {
      window.removeEventListener("zw:insert-data-token", handler as EventListener);
    };
  }, [focusedPropName, onUpdateStep, postUpdateActionInput, step]);

  // Guarded options load: once per [connection + step + propsSig] (actions and piece triggers)
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.type === "trigger" && !step.pieceName) return; // skip webhook trigger
    if (!selectedConnection) return;
    if (discoveredOptionProps.length === 0) return;
    const dropdownProps = discoveredOptionProps.filter((p) => (optionPropTypesByName[p] || "").toUpperCase() === "DROPDOWN");
    if (dropdownProps.length === 0) return;
    // Refreshers gating
    const satisfiableProps = dropdownProps.filter((p) => {
      const refreshers = optionPropRefreshersByName[p] || [];      const extra = refreshers.filter((r) => r !== "auth");
      if (extra.length === 0) return true;
      return extra.every((r) => {
        const v = (step?.config as Record<string, unknown> | undefined)?.[r];
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
    const propsSig = satisfiableProps
      .map((p) => {
        const refreshers = optionPropRefreshersByName[p] || [];
        const kv = refreshers
          .map((r) => `${r}:${String(((step?.config as Record<string, unknown> | undefined)?.[r] as string | number | undefined) ?? "")}`)
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
    step,
    selectedConnection,
    discoveredOptionProps,
    optionPropTypesByName,
    optionPropRefreshersByName,
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
      <div className="h-full w-full bg-theme-form/95 backdrop-blur-md flex flex-col">
        <div
          id="step-settings-container"
          className={`flex-1 flex flex-col min-h-0 ${
            isDragging ? "cursor-row-resize" : ""
          }`}
        >
          <div
            className="flex flex-col min-h-0 border-b border-white/20 dark:border-white/10"
            style={{ height: `${Math.max(20, Math.min(90, topSectionHeight))}%` }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center gap-3">
                {step.logoUrl && (
                  <img
                    src={step.logoUrl}
                    alt={step.displayName}
                    className="w-8 h-8 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/32x32?text=?";
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
            <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
              <div className="p-4 pb-16 space-y-6">
                {((step.type !== "trigger") || (step.type === "trigger" && Boolean(step.pieceName))) && (
                  <div>
                    <h3 className="text-sm font-medium text-theme-primary mb-2">
                      Connection <span className="text-[#ef4a45]">*</span>
                      </h3>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={isLoadingConnections}
                        onClick={() => setIsConnDropdownOpen((v) => !v)}
                        className={`w-full inline-flex items-center justify-between px-3 py-2 bg-theme-input border rounded-xl text-sm focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary disabled:opacity-60 disabled:cursor-not-allowed ${
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
                        <ChevronDown
                          size={16}
                          className="text-theme-secondary ml-2"
                        />
                      </button>
                      {!selectedConnection && (
                        <div className="mt-1 text-xs text-[#ef4a45]">
                          Connection is required
                    </div>
                      )}

                      {isConnDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsConnDropdownOpen(false)}
                          />
                          <div className="absolute z-20 mt-2 w-full overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl">
                            <div className="py-1 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                        <button
                                type="button"
                                onClick={() => {
                                  setIsConnDropdownOpen(false);
                                  handleCreateConnection();
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-theme-primary hover:bg-theme-input-focus transition-all duration-200"
                        >
                          Create Connection
                        </button>
                              <div className="my-1 h-px bg-white/10" />
                              {isLoadingConnections ? (
                                <div className="px-3 py-2 text-sm text-theme-secondary">
                                  Loading connections...
                                </div>
                              ) : connections.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-theme-secondary">
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
                                    className={`w-full px-3 py-2 text-left flex items-center gap-3 text-sm transition-all duration-200 ${
                              selectedConnection === connection.id
                                        ? "bg-[#b3a1ff] text-[#222222]"
                                        : "text-theme-primary hover:bg-theme-input-focus"
                            }`}
                          >
                              {connection.metadata?.pieceLogoUrl && (
                                <img
                                  src={connection.metadata.pieceLogoUrl}
                                  alt={connection.displayName}
                                        className="w-5 h-5 rounded object-cover flex-shrink-0"
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
                    {/* Dynamic options dropdowns per prop */}
                    <div className="mt-4 space-y-3">
                      <h3 className="text-sm font-medium text-theme-primary">Options</h3>
                      {discoveredOptionProps.length === 0 ? (
                        <div className="text-xs text-theme-secondary">No dynamic options</div>
                      ) : (
                        discoveredOptionProps.map((propName) => {
                          const propOptions = optionsByProp[propName] || [];
                          const currentValue = String(
                            ((step.config as Record<string, unknown> | undefined)?.[propName] as string | number | undefined) ?? ""
                          );
                          const currentLabel =
                            propOptions.find((o) => o.value === currentValue)?.label || currentValue;
                          const isLoadingThis = Boolean(isLoadingOptionsByProp[propName]);
                          const isDropdown = (optionPropTypesByName[propName] || "").toUpperCase() === "DROPDOWN";
                          const isRequired = Boolean(optionPropsRequiredByName[propName]);
                          const needsAttention = isRequired && !currentValue;
                          return (
                            <div key={propName}>
                              <div className="text-xs text-theme-secondary mb-1">
                                {propName}
                                {isRequired && <span className="text-[#ef4a45] ml-1">*</span>}
                            </div>
                              <div className="relative">
                                {!isDropdown ? (
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onFocus={() => {
                                      if (propName !== "displayName" && typeof onOpenDataSelector === "function") onOpenDataSelector();
                                      setFocusedPropName(propName);
                                      try {
                                        const el = inputRefs.current[propName];
                                        focusedCaretRef.current = el?.selectionStart ?? null;
                                      } catch { /* noop */ }
                                    }}
                                    onMouseDown={() => {
                                      if (propName !== "displayName" && typeof onOpenDataSelector === "function") onOpenDataSelector();
                                      setFocusedPropName(propName);
                                    }}
                                    onChange={(e) => {
                                      if (!step) return;
                                      const nextVal = e.target.value;
                                      onUpdateStep(step.id, {
                                        config: {
                                          ...step.config,
                                          [propName]: nextVal,
                                        },
                                      });
                                      // Fire UPDATE_ACTION for changed input prop (non-blocking)
                                      void postUpdateActionInput({ [propName]: nextVal });
                                    }}
                                    placeholder="Enter value"
                                    className={`w-full px-3 py-2 bg-theme-input border rounded-xl text-sm text-theme-primary placeholder-theme-secondary focus:ring-2 focus:ring-theme-primary/20 ${
                                      needsAttention ? "border-[#ef4a45]" : "border-white/20 dark:border-white/10"
                                    }`}
                                    ref={(el) => { inputRefs.current[propName] = el; }}
                                  />
                                ) : (
                                  <>
                                <button
                                    type="button"
                                    disabled={!selectedConnection || isLoadingThis}
                                  onClick={() => {
                                    // If refreshers not satisfied, warn and skip opening
                                    const refreshers = optionPropRefreshersByName[propName] || [];
                                    const extra = refreshers.filter((r) => r !== "auth");
                                    const missing = extra.filter((r) => {
                                      const v = (step?.config as Record<string, unknown> | undefined)?.[r];
                                      return v === undefined || v === null || String(v) === "";
                                    });
                                    if (missing.length > 0) {
                                      const msg = `Select ${missing.join(", ")} to load ${propName} options`;
                                      try { toastWarning("More info required", msg); } catch { /* noop */ }
                                      return;
                                    }
                                    setOpenPropDropdown((v) => (v === propName ? null : propName));
                                  }}
                                    className={`w-full inline-flex items-center justify-between px-3 py-2 bg-theme-input border rounded-xl text-sm focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary disabled:opacity-60 disabled:cursor-not-allowed ${
                                      !selectedConnection
                                        ? "border-white/20 dark:border-white/10 opacity-60"
                                        : needsAttention
                                        ? "border-[#ef4a45]"
                                        : "border-white/20 dark:border-white/10"
                                    }`}
                                  >
                                    <span className="truncate text-left">
                                      {isLoadingThis
                                        ? "Loading options..."
                                        : propOptions.length > 0
                                        ? currentLabel || "Select option"
                                        : "No options"}
                                    </span>
                                    <ChevronDown size={16} className="text-theme-secondary ml-2" />
                          </button>
                                  {openPropDropdown === propName ? (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setOpenPropDropdown(null)} />
                                      <div className="absolute z-20 mt-2 w-full overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl">
                                        <div className="py-1 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                                          {isLoadingThis ? (
                                            <div className="px-3 py-2 text-sm text-theme-secondary">Loading options...</div>
                                          ) : propOptions.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-theme-secondary">No options available</div>
                                          ) : (
                                            propOptions.map((opt) => (
                                              <button
                                                key={`${propName}::${opt.value}`}
                                                type="button"
                                                onClick={() => {
                                                  setOpenPropDropdown(null);
                                                  if (step) {
                                                    onUpdateStep(step.id, {
                                                      config: {
                                                        ...step.config,
                                                        [propName]: opt.value,
                                                      },
                                                    });
                                                  }
                                                  // Fire UPDATE_ACTION for changed dropdown
                                                  void postUpdateActionInput({ [propName]: opt.value });
                                                }}
                                                className={`w-full px-3 py-2 text-left text-sm transition-all duration-200 ${
                                                  String(((step.config as Record<string, unknown> | undefined)?.[propName] as string | number | undefined) ?? "") === opt.value
                                                    ? "bg-[#b3a1ff] text-[#222222]"
                                                    : "text-theme-primary hover:bg-theme-input-focus"
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            ))
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
                )}
                <div>
                  <h3 className="text-sm font-medium text-theme-primary mb-3">
                    Configuration
                  </h3>
                  <div className="space-y-3">
                    {step.type === "trigger" ? (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Token
                        </label>
                        <input
                          type="text"
                          value={token}
                          onFocus={() => { if (typeof onOpenDataSelector === "function") onOpenDataSelector(); }}
                          onMouseDown={() => { if (typeof onOpenDataSelector === "function") onOpenDataSelector(); }}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="secret-webhook-token"
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200"
                        />
                      </div>
                    )}
                    {step.type === "code" && (
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-1">
                          Source Code
                        </label>
                        <textarea
                          value={sourceCode}
                          onChange={(e) => setSourceCode(e.target.value)}
                          className="w-full px-3 py-2 bg-theme-input border border-white/20 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary text-theme-primary placeholder-theme-secondary transition-all duration-200 font-mono text-xs"
                          rows={8}
                          placeholder="export const code = async (inputs) => {&#10;  return { success: true };&#10;};"
                        />
                      </div>
                    )}
                    <div className="pt-2">
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
                        className="px-3 py-2 bg-theme-primary text-theme-inverse text-xs font-medium rounded-xl hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
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
          <div
            className="h-1 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 cursor-row-resize flex items-center justify-center relative transition-all duration-200"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-8 bg-theme-primary/50 rounded-full hover:bg-theme-primary transition-all duration-200"></div>
            </div>
          </div>
          <div
            className="flex flex-col min-h-0"
            style={{
              height: `${100 - topSectionHeight}%`,
              minHeight: 220,
            }}
          >
            <div className="flex-shrink-0 p-4 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-theme-primary">
                  Sample Data
                </h3>
                <button
                  className="px-3 py-2 bg-theme-primary text-theme-inverse text-xs font-medium rounded-xl hover:bg-[#a08fff] transition-colors disabled:opacity-50"
                  onClick={async () => {
                    if (!step) return;
                    try {
                      let flowId: string | undefined;
                      const stored = sessionStorage.getItem("zw_current_flow");
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
                      const pieceNameLc = (step.pieceName || "").toLowerCase();
                      let payload: {
                        testInput: Record<string, unknown>;
                        saveOutput: boolean;
                      };
                      if (pieceNameLc.includes("whatsapp")) {
                        payload = {
                          testInput: {
                            to: "917867997197",
                            text: "Order successful",
                          },
                          saveOutput: true,
                        };
                      } else if (pieceNameLc.includes("gmail")) {
                        payload = {
                          testInput: {
                            body: "Hi umang, Your order with orderid {{trigger.body.orderId}} is confirmed!! You will receive a order tracking link on WhatsApp soon!!",
                            subject: "Order Confirmed!!",
                            receiver: ["sheikgulf01@gmail.com"],
                          },
                          saveOutput: true,
                        };
                      } else {
                        payload = {
                          testInput: {},
                          saveOutput: true,
                        };
                      }
                      const response = await testStep(
                        flowId,
                        stepName,
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
            <div className="flex-1 overflow-hidden">
              <div className="p-4 h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                <div className="bg-theme-input/50 p-3 rounded-xl border border-white/20 dark:border-white/10">
                  {isLoadingSample ? (
                    <div className="text-sm text-theme-secondary">
                      Loading sample data...
                    </div>
                  ) : (
                    <pre className="text-xs text-theme-secondary overflow-auto">
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
