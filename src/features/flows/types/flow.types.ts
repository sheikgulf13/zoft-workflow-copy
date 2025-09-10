export type FlowSummary = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status?: string;
};

export type FlowVersion = {
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
};

export type FlowDetail = {
  id: string;
  projectId?: string;
  externalId?: string;
  status?: string;
  publishedVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: FlowVersion[];
  _count?: { runs?: number };
};

export type CreateFlowRequest = { displayName: string; description?: string };
