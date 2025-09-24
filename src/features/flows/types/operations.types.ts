export type FlowOperationType =
  | "UPDATE_TRIGGER"
  | "ADD_ACTION"
  | "UPDATE_ACTION"
  | "ADD_BRANCH"
  | "MOVE_ACTION"
  | "DUPLICATE_ACTION"
  | "DUPLICATE_BRANCH"
  | "MOVE_BRANCH"
  | "DELETE_BRANCH"
  | "SET_SKIP_ACTION"
  | "DELETE_ACTION"
  | "UPDATE_METADATA"
  | "SAVE_SAMPLE_DATA"
  | "CHANGE_FOLDER"
  | "IMPORT_FLOW"
  | "LOCK_AND_PUBLISH"
  | "CHANGE_STATUS"
  | "USE_AS_DRAFT"
  | "CHANGE_NAME";

export type WebhookTriggerSettings = {
  method: "POST" | "GET" | "PUT" | "DELETE";
  responseMode: "SYNC" | "ASYNC";
  authType?: "NONE" | "BEARER";
};

export type UpdateTriggerPayload = {
  type: "WEBHOOK" | "SCHEDULE" | "POLLING" | "PIECE";
  name: string;
  displayName: string;
  valid?: boolean;
  settings: WebhookTriggerSettings | Record<string, unknown>;
};

export type FlowOperationEnvelope<TRequest> = {
  type: FlowOperationType;
  request: TRequest;
};

export type ValidateWorkflowBody = {
  flowData: {
    trigger: {
      type: "WEBHOOK" | "SCHEDULE" | "POLLING";
      name: string;
      displayName: string;
      valid: boolean;
      settings: Record<string, unknown>;
    };
    nextAction: null;
  };
};

export type ValidateWorkflowResponse = {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
};

// Add Action (2nd API)
export type StepLocationRelativeToParent =
  | "AFTER"
  | "INSIDE_LOOP"
  | "INSIDE_BRANCH";

export type PieceActionSettings = {
  pieceName: string;
  pieceVersion?: string;
  actionName: string;
  input: Record<string, unknown>;
};

export type CodeActionSettings = {
  sourceCode: { code: string } | Record<string, string>;
  input: Record<string, unknown>;
};

export type LoopActionSettings = {
  items: string;
  loopIndexName: string;
  loopItemName: string;
};

export type BranchCondition = {
  left: string;
  operator: string;
  right: unknown;
};

export type RouterBranch = {
  branchName: string;
  branchType: "CONDITION" | "FALLBACK";
  conditions?: BranchCondition[][];
};

export type RouterActionSettings = {
  branches: RouterBranch[];
};

export type AddActionRequest = {
  parentStep: string;
  stepLocationRelativeToParent?: StepLocationRelativeToParent;
  branchIndex?: number;
  action: {
    type: "PIECE" | "CODE" | "ROUTER" | "LOOP_ON_ITEMS";
    name?: string;
    displayName: string;
    valid?: boolean;
    settings:
      | PieceActionSettings
      | CodeActionSettings
      | RouterActionSettings
      | LoopActionSettings;
  };
};

export type ImportFlowRequest = {
  displayName: string;
  trigger: {
    type: "SCHEDULE" | "WEBHOOK" | "POLLING";
    name: string;
    displayName: string;
    valid: boolean;
    settings: Record<string, unknown>;
  };
  schemaVersion: string;
};

// New shape to support webhook import request envelope with nested trigger
export type ImportFlowWebhookRequest = {
  displayName: string;
  trigger: {
    trigger: {
      type: "EMPTY" | "WEBHOOK" | "SCHEDULE" | "POLLING";
      name: string;
      displayName: string;
      valid: boolean;
      settings: Record<string, unknown>;
    };
    nextAction: null;
  };
};

export type UpdateActionPayload = {
  type: "PIECE" | "CODE";
  name?: string;
  displayName: string;
  valid?: boolean;
  settings?: Record<string, unknown>;
};

export type ChangeNameRequest = {
  displayName: string;
};

export type DuplicateActionRequest = {
  stepName: string;
};

export type DuplicateBranchRequest = {
  stepName: string;
  branchIndex: number;
};

export type DeleteActionRequest = {
  names: string[];
};

export type DeleteBranchRequest = {
  stepName: string;
  branchIndex: number;
};

export type UseAsDraftRequest = {
  versionId: string;
};

export type LockAndPublishRequest = {
  status: "ENABLED" | "DISABLED";
};

export type ChangeStatusRequest = {
  status: "ENABLED" | "DISABLED";
};
