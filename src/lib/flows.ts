import { http } from './http'
import { useContextStore } from '../stores/contextStore'

export type FlowSummary = {
  id: string
  name: string
  description?: string
  createdAt: string
  status?: string
}

export type CreateFlowRequest = {
  displayName: string
  description?: string
}

export type CreateFlowResponse = {
  flow: FlowSummary
}

function getProjectId(): string {
  const projectId = useContextStore.getState().currentProject?.id
  if (!projectId) throw new Error('No current project selected')
  return projectId
}

type CreateFlowApiResponse = unknown
type ListFlowsApiResponse = unknown
type CountApiResponse = unknown

function mapBackendFlowToSummary(flow: unknown): FlowSummary {
  if (!flow || typeof flow !== 'object') {
    return {
      id: '',
      name: 'Untitled Flow',
      createdAt: new Date().toISOString(),
    }
  }

  const obj = flow as Record<string, unknown>

  let nameCandidate: string | undefined
  const versionsVal = obj['versions']
  if (Array.isArray(versionsVal) && versionsVal.length > 0) {
    const v0 = versionsVal[0]
    if (v0 && typeof v0 === 'object') {
      const v0rec = v0 as Record<string, unknown>
      if (typeof v0rec['displayName'] === 'string') nameCandidate = v0rec['displayName'] as string
    }
  }
  if (!nameCandidate && typeof obj['displayName'] === 'string') nameCandidate = obj['displayName'] as string
  if (!nameCandidate && typeof obj['name'] === 'string') nameCandidate = obj['name'] as string

  const idVal = obj['id']
  const createdAtVal = obj['createdAt']
  const statusVal = obj['status']
  const descriptionVal = obj['description']

  return {
    id: typeof idVal === 'string' ? idVal : String(idVal ?? ''),
    name: nameCandidate ?? 'Untitled Flow',
    description: typeof descriptionVal === 'string' ? descriptionVal : undefined,
    createdAt: typeof createdAtVal === 'string' ? createdAtVal : new Date().toISOString(),
    status: typeof statusVal === 'string' ? statusVal : undefined,
  }
}

export async function createFlow(payload: CreateFlowRequest): Promise<FlowSummary> {
  const projectId = getProjectId()
  const url = `/projects/${projectId}/flows`
  const resp = await http.post<CreateFlowApiResponse>(url, payload)
  const data = resp.data as unknown
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>
    if ('flow' in rec && rec['flow'] && typeof rec['flow'] === 'object') return mapBackendFlowToSummary(rec['flow'])
    if ('data' in rec && rec['data'] && typeof rec['data'] === 'object') return mapBackendFlowToSummary(rec['data'])
  }
  return mapBackendFlowToSummary(data)
}

// Detailed Flow types for editor usage
export type FlowVersion = {
  id: string
  flowId: string
  displayName: string
  trigger?: {
    name?: string
    type?: string
    valid?: boolean
    settings?: Record<string, unknown>
    displayName?: string
  }
  connectionIds: string[]
  valid?: boolean
  state?: string
  createdAt: string
  updatedAt: string
}

export type FlowDetail = {
  id: string
  projectId?: string
  externalId?: string
  status?: string
  publishedVersionId?: string | null
  createdAt: string
  updatedAt: string
  versions: FlowVersion[]
  _count?: { runs?: number }
}

function mapBackendFlowToDetail(value: unknown): FlowDetail {
  if (!value || typeof value !== 'object') {
    return {
      id: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [],
    }
  }
  const obj = value as Record<string, unknown>
  const versionsRaw = obj['versions']
  const versions: FlowVersion[] = Array.isArray(versionsRaw)
    ? versionsRaw.map((v): FlowVersion => {
        const vv = (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
        const triggerVal = vv['trigger']
        const trigger = triggerVal && typeof triggerVal === 'object'
          ? (triggerVal as Record<string, unknown>)
          : undefined
        return {
          id: typeof vv['id'] === 'string' ? vv['id'] as string : String(vv['id'] ?? ''),
          flowId: typeof vv['flowId'] === 'string' ? vv['flowId'] as string : String(vv['flowId'] ?? ''),
          displayName: typeof vv['displayName'] === 'string' ? vv['displayName'] as string : 'Untitled',
          trigger: trigger
            ? {
                name: typeof trigger['name'] === 'string' ? (trigger['name'] as string) : undefined,
                type: typeof trigger['type'] === 'string' ? (trigger['type'] as string) : undefined,
                valid: typeof trigger['valid'] === 'boolean' ? (trigger['valid'] as boolean) : undefined,
                settings: typeof trigger['settings'] === 'object' && trigger['settings'] !== null ? (trigger['settings'] as Record<string, unknown>) : undefined,
                displayName: typeof trigger['displayName'] === 'string' ? (trigger['displayName'] as string) : undefined,
              }
            : undefined,
          connectionIds: Array.isArray(vv['connectionIds']) ? (vv['connectionIds'] as unknown[]).map(String) : [],
          valid: typeof vv['valid'] === 'boolean' ? (vv['valid'] as boolean) : undefined,
          state: typeof vv['state'] === 'string' ? (vv['state'] as string) : undefined,
          createdAt: typeof vv['createdAt'] === 'string' ? (vv['createdAt'] as string) : new Date().toISOString(),
          updatedAt: typeof vv['updatedAt'] === 'string' ? (vv['updatedAt'] as string) : new Date().toISOString(),
        }
      })
    : []

  const countVal = obj['_count']
  const runs = countVal && typeof countVal === 'object' ? (countVal as Record<string, unknown>)['runs'] : undefined

  return {
    id: typeof obj['id'] === 'string' ? (obj['id'] as string) : String(obj['id'] ?? ''),
    projectId: typeof obj['projectId'] === 'string' ? (obj['projectId'] as string) : undefined,
    externalId: typeof obj['externalId'] === 'string' ? (obj['externalId'] as string) : undefined,
    status: typeof obj['status'] === 'string' ? (obj['status'] as string) : undefined,
    publishedVersionId:
      typeof obj['publishedVersionId'] === 'string' || obj['publishedVersionId'] === null
        ? (obj['publishedVersionId'] as string | null)
        : undefined,
    createdAt: typeof obj['createdAt'] === 'string' ? (obj['createdAt'] as string) : new Date().toISOString(),
    updatedAt: typeof obj['updatedAt'] === 'string' ? (obj['updatedAt'] as string) : new Date().toISOString(),
    versions,
    _count: typeof runs === 'number' ? { runs } : undefined,
  }
}

export async function getFlow(flowId: string): Promise<FlowDetail> {
  const projectId = getProjectId()
  const url = `/projects/${projectId}/flows/${flowId}`
  const resp = await http.get<unknown>(url)
  const root = resp.data as unknown
  if (root && typeof root === 'object') {
    const rec = root as Record<string, unknown>
    if (rec['flow'] && typeof rec['flow'] === 'object') return mapBackendFlowToDetail(rec['flow'])
    if (rec['data'] && typeof rec['data'] === 'object') return mapBackendFlowToDetail(rec['data'])
  }
  return mapBackendFlowToDetail(root)
}

export async function deleteFlow(flowId: string): Promise<void> {
  const projectId = getProjectId()
  const url = `/projects/${projectId}/flows/${flowId}`
  await http.delete(url)
}

export async function listFlows(): Promise<FlowSummary[]> {
  const projectId = getProjectId()
  const url = `/projects/${projectId}/flows`
  const resp = await http.get<ListFlowsApiResponse>(url)
  const data = resp.data as unknown
  if (Array.isArray(data)) return data.map(mapBackendFlowToSummary)
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>
    const flowsVal = rec['flows']
    if (Array.isArray(flowsVal)) return flowsVal.map(mapBackendFlowToSummary)
    const itemsVal = rec['items']
    if (Array.isArray(itemsVal)) return itemsVal.map(mapBackendFlowToSummary)
    const innerVal = rec['data']
    if (innerVal && typeof innerVal === 'object') {
      const innerRec = innerVal as Record<string, unknown>
      const innerFlows = innerRec['flows']
      if (Array.isArray(innerFlows)) return innerFlows.map(mapBackendFlowToSummary)
      const innerItems = innerRec['items']
      if (Array.isArray(innerItems)) return innerItems.map(mapBackendFlowToSummary)
    }
  }
  return []
}

export async function countFlows(): Promise<number> {
  const projectId = getProjectId()
  const url = `/projects/${projectId}/flows/count`
  const resp = await http.get<CountApiResponse>(url)
  const data = resp.data as unknown
  if (typeof data === 'number') return data
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>
    const countVal = rec['count']
    if (typeof countVal === 'number') return countVal
    const totalVal = rec['total']
    if (typeof totalVal === 'number') return totalVal
    const innerVal = rec['data']
    if (innerVal && typeof innerVal === 'object') {
      const innerRec = innerVal as Record<string, unknown>
      const innerCount = innerRec['count']
      if (typeof innerCount === 'number') return innerCount
      const innerTotal = innerRec['total']
      if (typeof innerTotal === 'number') return innerTotal
    }
  }
  return 0
}


