import { http } from "../../../shared/api";
import { useContextStore } from "../../../app/store/context";
import type {
  FlowOperationEnvelope,
  UpdateTriggerPayload,
  ValidateWorkflowBody,
  ValidateWorkflowResponse,
  AddActionRequest,
  StepLocationRelativeToParent,
  ImportFlowRequest,
  ImportFlowWebhookRequest,
  UpdateActionPayload,
  ChangeNameRequest,
  DuplicateActionRequest,
  DeleteActionRequest,
  DuplicateBranchRequest,
  UseAsDraftRequest,
  LockAndPublishRequest,
  ChangeStatusRequest,
} from "../types/operations.types";
import type { DeleteBranchRequest } from "../types/operations.types";

export type FlowSummary = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status?: string;
};

export type CreateFlowRequest = { displayName: string; description?: string };
export type FlowDetail = {
  id: string;
  projectId?: string;
  externalId?: string;
  status?: string;
  publishedVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    flowId: string;
    displayName: string;
    trigger?: {
      name?: string;
      type?: string;
      valid?: boolean;
      settings?: Record<string, unknown>;
      displayName?: string;
    };
    connectionIds: string[];
    valid?: boolean;
    state?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  _count?: { runs?: number };
};

function getProjectId(): string {
  const projectId = useContextStore.getState().currentProject?.id;
  if (projectId) return projectId;
  // Fallback: derive from currently opened flow in session storage
  try {
    const stored = sessionStorage.getItem("zw_current_flow");
    if (stored) {
      const parsed = JSON.parse(stored) as { projectId?: string };
      if (parsed?.projectId) return parsed.projectId;
    }
  } catch {
    /* noop */
  }
  throw new Error("No current project selected");
}

function mapBackendFlowToSummary(flow: unknown): FlowSummary {
  if (!flow || typeof flow !== "object") {
    return {
      id: "",
      name: "Untitled Flow",
      createdAt: new Date().toISOString(),
    };
  }
  const obj = flow as Record<string, unknown>;
  let nameCandidate: string | undefined;
  const versionsVal = obj["versions"];
  if (Array.isArray(versionsVal) && versionsVal.length > 0) {
    const v0 = versionsVal[0];
    if (v0 && typeof v0 === "object") {
      const v0rec = v0 as Record<string, unknown>;
      if (typeof v0rec["displayName"] === "string")
        nameCandidate = v0rec["displayName"] as string;
    }
  }
  if (!nameCandidate && typeof obj["displayName"] === "string")
    nameCandidate = obj["displayName"] as string;
  if (!nameCandidate && typeof obj["name"] === "string")
    nameCandidate = obj["name"] as string;
  const idVal = obj["id"];
  const createdAtVal = obj["createdAt"];
  const statusVal = obj["status"];
  const descriptionVal = obj["description"];
  return {
    id: typeof idVal === "string" ? idVal : String(idVal ?? ""),
    name: nameCandidate ?? "Untitled Flow",
    description:
      typeof descriptionVal === "string" ? descriptionVal : undefined,
    createdAt:
      typeof createdAtVal === "string"
        ? createdAtVal
        : new Date().toISOString(),
    status: typeof statusVal === "string" ? statusVal : undefined,
  };
}

export async function createFlow(
  payload: CreateFlowRequest
): Promise<FlowSummary> {
  const projectId = getProjectId();
  const resp = await http.post(`/projects/${projectId}/flows`, payload);
  const data = resp.data as unknown;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if ("flow" in rec && rec["flow"] && typeof rec["flow"] === "object")
      return mapBackendFlowToSummary(rec["flow"]);
    if ("data" in rec && rec["data"] && typeof rec["data"] === "object")
      return mapBackendFlowToSummary(rec["data"]);
  }
  return mapBackendFlowToSummary(data);
}

export async function getFlow(flowId: string): Promise<FlowDetail> {
  const projectId = getProjectId();
  const resp = await http.get(`/projects/${projectId}/flows/${flowId}`);
  const root = resp.data as unknown;
  if (root && typeof root === "object") {
    const rec = root as Record<string, unknown>;
    const flow = rec["flow"] ?? rec["data"];
    if (flow && typeof flow === "object") {
      const obj = flow as Record<string, unknown>;
      const versionsRaw = obj["versions"];
      const versions = Array.isArray(versionsRaw)
        ? versionsRaw.map((v) => {
            const vv =
              v && typeof v === "object" ? (v as Record<string, unknown>) : {};
            const flowDataVal = vv["flowData"];
            const flowData =
              flowDataVal && typeof flowDataVal === "object"
                ? (flowDataVal as Record<string, unknown>)
                : undefined;
            const trigger =
              flowData && typeof flowData === "object"
                ? ((flowData["trigger"] as Record<string, unknown>) ||
                  undefined)
                : undefined;
            return {
              id: String(vv["id"] ?? ""),
              flowId: String(vv["flowId"] ?? ""),
              displayName: (vv["displayName"] as string) || "Untitled",
              trigger: trigger
                ? {
                    name: (trigger["name"] as string) || undefined,
                    type: (trigger["type"] as string) || undefined,
                    valid: (trigger["valid"] as boolean) || undefined,
                    settings:
                      (trigger["settings"] as Record<string, unknown>) ||
                      undefined,
                    displayName:
                      (trigger["displayName"] as string) || undefined,
                  }
                : undefined,
              connectionIds: Array.isArray(vv["connectionIds"])
                ? (vv["connectionIds"] as unknown[]).map(String)
                : [],
              valid: (vv["valid"] as boolean) || undefined,
              state: (vv["state"] as string) || undefined,
              createdAt:
                (vv["createdAt"] as string) || new Date().toISOString(),
              updatedAt:
                (vv["updatedAt"] as string) || new Date().toISOString(),
            };
          })
        : [];
      const countVal = (obj["_count"] as Record<string, unknown> | undefined)?.[
        "runs"
      ];
      return {
        id: String(obj["id"] ?? ""),
        projectId: (obj["projectId"] as string) || undefined,
        externalId: (obj["externalId"] as string) || undefined,
        status: (obj["status"] as string) || undefined,
        publishedVersionId:
          (obj["publishedVersionId"] as string | null) ?? undefined,
        createdAt: (obj["createdAt"] as string) || new Date().toISOString(),
        updatedAt: (obj["updatedAt"] as string) || new Date().toISOString(),
        versions,
        _count: typeof countVal === "number" ? { runs: countVal } : undefined,
      };
    }
  }
  return {
    id: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [],
  };
}

export async function deleteFlow(flowId: string): Promise<void> {
  const projectId = getProjectId();
  await http.delete(`/projects/${projectId}/flows/${flowId}`);
}

export async function listFlows(): Promise<FlowSummary[]> {
  const projectId = getProjectId();
  const resp = await http.get(`/projects/${projectId}/flows`);
  const data = resp.data as unknown;
  if (Array.isArray(data)) return data.map(mapBackendFlowToSummary);
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const flowsVal = rec["flows"];
    if (Array.isArray(flowsVal)) return flowsVal.map(mapBackendFlowToSummary);
    const itemsVal = rec["items"];
    if (Array.isArray(itemsVal)) return itemsVal.map(mapBackendFlowToSummary);
    const innerVal = rec["data"];
    if (innerVal && typeof innerVal === "object") {
      const innerRec = innerVal as Record<string, unknown>;
      const innerFlows = innerRec["flows"];
      if (Array.isArray(innerFlows))
        return innerFlows.map(mapBackendFlowToSummary);
      const innerItems = innerRec["items"];
      if (Array.isArray(innerItems))
        return innerItems.map(mapBackendFlowToSummary);
    }
  }
  return [];
}

export async function countFlows(): Promise<number> {
  const projectId = getProjectId();
  const resp = await http.get(`/projects/${projectId}/flows/count`);
  const data = resp.data as unknown;
  if (typeof data === "number") return data;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const countVal = rec["count"];
    if (typeof countVal === "number") return countVal;
    const totalVal = rec["total"];
    if (typeof totalVal === "number") return totalVal;
    const innerVal = rec["data"];
    if (innerVal && typeof innerVal === "object") {
      const innerRec = innerVal as Record<string, unknown>;
      const innerCount = innerRec["count"];
      if (typeof innerCount === "number") return innerCount;
      const innerTotal = innerRec["total"];
      if (typeof innerTotal === "number") return innerTotal;
    }
  }
  return 0;
}

export async function listFlowVersions(
  flowId: string,
  limit: number = 10
): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.get(
    `/projects/${projectId}/flows/${flowId}/versions`,
    { params: { limit } }
  );
  return resp.data as unknown;
}

// Fetch raw flow with full version graph (unmapped) for canvas reconstruction
export async function getFlowVersionGraph(flowId: string): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.get(`/projects/${projectId}/flows/${flowId}`);
  return resp.data as unknown;
}

export async function getWebhookTrigger(flowId: string): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.get(
    `/projects/${projectId}/flows/${flowId}/webhook-trigger`
  );
  return resp.data as unknown;
}

export async function createWebhookTrigger(
  flowId: string,
  token: string
): Promise<unknown> {
  const projectId = getProjectId();
  const body = {
    method: "POST",
    authType: "BEARER",
    authConfig: { token },
    responseMode: "SYNC",
    rateLimitPerMin: 60,
    allowedIPs: [] as string[],
    allowedDomains: [] as string[],
  };
  const resp = await http.post(
    `/projects/${projectId}/flows/${flowId}/webhook-trigger`,
    body
  );
  return resp.data as unknown;
}

export async function saveSampleData(
  flowId: string,
  stepName: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const projectId = getProjectId();
  const body: FlowOperationEnvelope<{
    stepName: string;
    payload: Record<string, unknown>;
    type: "INPUT" | "OUTPUT";
  }> = {
    type: "SAVE_SAMPLE_DATA",
    request: { stepName, payload, type: "INPUT" },
  };
  const resp = await http.post(`/projects/${projectId}/flows/${flowId}`, body);
  return resp.data as unknown;
}

export async function getSampleData(
  flowId: string,
  stepName: string,
  type: "INPUT" | "OUTPUT" = "OUTPUT"
): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.get(
    `/projects/${projectId}/flows/${flowId}/sample-data/${encodeURIComponent(
      stepName
    )}`,
    { params: { type } }
  );
  return resp.data as unknown;
}

// Resolve a concrete piece version (never returns 'latest').
export async function resolvePieceVersion(
  pieceName: string,
  providedVersion?: string
): Promise<string> {
  const isConcrete = (v?: string) =>
    typeof v === "string" && v.length > 0 && !/latest/i.test(v);
  if (isConcrete(providedVersion)) return providedVersion as string;
  const normalizedPieceName = pieceName.startsWith("@activepieces/piece-")
    ? pieceName
    : `@activepieces/piece-${pieceName}`;
  try {
    const encoded = normalizedPieceName.replace(/\//g, "%2F");
    const resp = await http.get(`/pods/${encoded}`);
    const root = resp.data as unknown;
    const meta = (root && typeof root === "object" && (root as Record<string, unknown>)["data"])
      ? ((root as Record<string, unknown>)["data"] as Record<string, unknown>)
      : ((root as Record<string, unknown>) || {});
    const candidate =
      (meta["version"] as string | undefined) ||
      (meta["latestVersion"] as string | undefined) ||
      (meta["release"] as string | undefined) ||
      undefined;
    if (isConcrete(candidate)) return candidate as string;
  } catch {
    // noop: fall through to error below
  }
  // As a last resort, if providedVersion is set and not 'latest', return it; otherwise throw
  if (isConcrete(providedVersion)) return providedVersion as string;
  throw new Error(`Could not resolve piece version for ${normalizedPieceName}`);
}

// Operations
export async function postFlowOperation<TRequest>(
  flowId: string,
  body: FlowOperationEnvelope<TRequest>
): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.post(`/projects/${projectId}/flows/${flowId}`, body);
  return resp.data as unknown;
}

export async function updateWebhookTrigger(flowId: string): Promise<unknown> {
  const body: FlowOperationEnvelope<UpdateTriggerPayload> = {
    type: "UPDATE_TRIGGER",
    request: {
      type: "WEBHOOK",
      name: "trigger",
      displayName: "Webhook Trigger Test Water 01",
      settings: {
        method: "POST",
        authType: "NONE",
        responseMode: "SYNC",
      } as unknown as Record<string, unknown>,
    } as UpdateTriggerPayload,
  };
  try {
    console.debug("[updateWebhookTrigger] flowId", flowId, "body", body);
  } catch {
    /* noop */
  }
  const resp = await postFlowOperation(flowId, body);
  try {
    console.debug("[updateWebhookTrigger] success for flowId", flowId);
  } catch {
    /* noop */
  }
  return resp;
}

type UpdatePieceTriggerOptions = {
  name: string;
  displayName: string;
  pieceName: string;
  pieceVersion?: string;
  triggerName: string;
  input?: Record<string, unknown>;
  auth?: Record<string, unknown>;
};

export async function updatePieceTrigger(
  flowId: string,
  opts: UpdatePieceTriggerOptions
): Promise<unknown> {
  const resolvedVersion = await resolvePieceVersion(
    opts.pieceName,
    opts.pieceVersion
  );
  const body: FlowOperationEnvelope<UpdateTriggerPayload> = {
    type: "UPDATE_TRIGGER",
    request: {
      type: "PIECE",
      name: opts.name,
      displayName: opts.displayName,
      valid: true,
      settings: {
        auth: opts.auth,
        pieceName: opts.pieceName,
        pieceVersion: resolvedVersion,
        triggerName: opts.triggerName,
        input: opts.input ?? {},
      } as unknown as Record<string, unknown>,
    },
  };
  try {
    console.debug("[updatePieceTrigger] flowId", flowId, "body", body);
  } catch {
    /* noop */
  }
  const resp = await postFlowOperation(flowId, body);
  try {
    console.debug("[updatePieceTrigger] success for flowId", flowId);
  } catch {
    /* noop */
  }
  return resp;
}

export async function validateWorkflow(
  body: ValidateWorkflowBody
): Promise<ValidateWorkflowResponse> {
  // basic client-side log for debugging
  try {
    console.debug("[validateWorkflow] request", body);
  } catch {
    /* noop */
  }
  const resp = await http.post(`/workflows/validate`, body);
  try {
    console.debug("[validateWorkflow] response", resp.status, resp.data);
  } catch {
    /* noop */
  }
  const data = resp.data as unknown;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const valid =
      typeof rec["valid"] === "boolean"
        ? (rec["valid"] as boolean)
        : false;
    const errors = Array.isArray(rec["errors"])
      ? (rec["errors"] as Array<{ path: string; message: string }>)
      : undefined;
    try {
      console.debug("[validateWorkflow] computed", {
        valid,
        errorsCount: errors?.length ?? 0,
      });
    } catch {
      /* noop */
    }
    return { valid, errors };
  }
  return { valid: false, errors: [{ path: "unknown", message: "Invalid response" }] };
}

// Add action helpers
export async function addActionUnderTrigger(
  flowId: string,
  action: AddActionRequest["action"]
): Promise<unknown> {
  const body: FlowOperationEnvelope<AddActionRequest> = {
    type: "ADD_ACTION",
    request: {
      parentStep: "trigger",
      stepLocationRelativeToParent: "AFTER",
      action,
      branchIndex: 0,
    },
  };
  try {
    console.debug("[addActionUnderTrigger] body", body);
  } catch {
    /* noop */
  }
  return await postFlowOperation(flowId, body);
}

export async function addActionAfter(
  flowId: string,
  parentStep: string,
  location: StepLocationRelativeToParent,
  action: AddActionRequest["action"]
): Promise<unknown> {
  const body: FlowOperationEnvelope<AddActionRequest> = {
    type: "ADD_ACTION",
    request: {
      parentStep,
      stepLocationRelativeToParent: location,
      action,
      branchIndex: 0,
    },
  };
  try {
    console.debug("[addActionAfter] body", body);
  } catch {
    /* noop */
  }
  return await postFlowOperation(flowId, body);
}

export async function importFlow(
  flowId: string,
  payload: ImportFlowRequest | ImportFlowWebhookRequest
): Promise<void> {
  const body: FlowOperationEnvelope<
    ImportFlowRequest | ImportFlowWebhookRequest
  > = {
    type: "IMPORT_FLOW",
    request: payload,
  };
  try {
    console.debug("[importFlow] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function updateAction(
  flowId: string,
  payload: UpdateActionPayload
): Promise<void> {
  // Ensure pieceVersion is present for PIECE actions
  let request: UpdateActionPayload = payload;
  if (payload.type === "PIECE") {
    const settings = ((payload.settings as unknown) || {}) as Record<string, unknown>;
    const rawPieceName = String(settings["pieceName"] ?? "");
    const pieceName = rawPieceName
      ? (rawPieceName.startsWith("@activepieces/piece-") ? rawPieceName : `@activepieces/piece-${rawPieceName}`)
      : "";
    let pieceVersion = (settings["pieceVersion"] as string | undefined) || undefined;
    if (pieceName && (!pieceVersion || /latest/i.test(pieceVersion))) {
      try {
        pieceVersion = await resolvePieceVersion(pieceName, pieceVersion);
      } catch {
        // best-effort; keep existing or empty string below
      }
    }
    // Always include the field so backend consistently receives it
    request = {
      ...payload,
      settings: { ...settings, pieceVersion: pieceVersion ?? "" } as unknown as Record<string, unknown>,
    };
  }
  const body: FlowOperationEnvelope<UpdateActionPayload> = {
    type: "UPDATE_ACTION",
    request,
  };
  try {
    console.debug("[updateAction] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function changeWorkflowName(
  flowId: string,
  payload: ChangeNameRequest
): Promise<void> {
  const body: FlowOperationEnvelope<ChangeNameRequest> = {
    type: "CHANGE_NAME",
    request: payload,
  };
  try {
    console.debug("[changeWorkflowName] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function duplicateAction(
  flowId: string,
  payload: DuplicateActionRequest
): Promise<void> {
  const body: FlowOperationEnvelope<DuplicateActionRequest> = {
    type: "DUPLICATE_ACTION",
    request: payload,
  };
  try {
    console.debug("[duplicateAction] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function deleteAction(
  flowId: string,
  payload: DeleteActionRequest
): Promise<void> {
  const body: FlowOperationEnvelope<DeleteActionRequest> = {
    type: "DELETE_ACTION",
    request: payload,
  };
  try {
    console.debug("[deleteAction] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function duplicateBranch(
  flowId: string,
  payload: DuplicateBranchRequest
): Promise<void> {
  const body: FlowOperationEnvelope<DuplicateBranchRequest> = {
    type: "DUPLICATE_BRANCH",
    request: payload,
  };
  try {
    console.debug("[duplicateBranch] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function deleteBranch(
  flowId: string,
  payload: DeleteBranchRequest
): Promise<void> {
  const body: FlowOperationEnvelope<DeleteBranchRequest> = {
    type: "DELETE_BRANCH",
    request: payload,
  };
  try {
    console.debug("[deleteBranch] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function markVersionAsDraft(
  flowId: string,
  payload: UseAsDraftRequest
): Promise<void> {
  const body: FlowOperationEnvelope<UseAsDraftRequest> = {
    type: "USE_AS_DRAFT",
    request: payload,
  };
  try {
    console.debug("[markVersionAsDraft] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function lockAndPublish(
  flowId: string,
  payload: LockAndPublishRequest
): Promise<void> {
  const body: FlowOperationEnvelope<LockAndPublishRequest> = {
    type: "LOCK_AND_PUBLISH",
    request: payload,
  };
  try {
    console.debug("[lockAndPublish] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

export async function changeStatus(
  flowId: string,
  payload: ChangeStatusRequest
): Promise<void> {
  const body: FlowOperationEnvelope<ChangeStatusRequest> = {
    type: "CHANGE_STATUS",
    request: payload,
  };
  try {
    console.debug("[changeStatus] body", body);
  } catch {
    /* noop */
  }
  await postFlowOperation(flowId, body);
}

// Test a specific step with provided test input and optionally save its output
export type TestStepBody = {
  testInput: Record<string, unknown>;
  saveOutput: boolean;
};

export async function testStep(
  flowId: string,
  stepName: string,
  body: TestStepBody
): Promise<unknown> {
  const projectId = getProjectId();
  const resp = await http.post(
    `/projects/${projectId}/flows/${flowId}/steps/${encodeURIComponent(stepName)}/test`,
    body
  );
  return resp.data as unknown;
}

export type TestWebhookBody = {
  test: boolean;
  event: string;
  message: string;
  timestamp: string;
  data: {
    userId: string;
    action: string;
    environment: string;
    flowId: string;
  };
};

export async function testFlowWebhook(
  flowId: string,
  body: TestWebhookBody
): Promise<unknown> {
  const resp = await http.post(`/webhooks/${flowId}/test`, body);
  return resp.data as unknown;
}

// Trigger the flow via its public webhook endpoint
export async function runFlowWebhook(
  flowId: string,
  body?: unknown,
  Authorization?: string
): Promise<unknown> {
  const config = Authorization ? { headers: { Authorization } } : undefined;
  const resp = await http.post(`/webhooks/${flowId}`, body ?? {}, config);
  return resp.data as unknown;
}
