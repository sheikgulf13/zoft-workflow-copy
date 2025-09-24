import { http } from "../../../shared/api";

export async function listConnections(projectId: string) {
  const url = `/projects/${projectId}/connections`;
  const resp = await http.get(url);
  const connections = resp.data?.connections ?? resp.data ?? [];
  return Array.isArray(connections) ? connections : [];
}

export async function deleteConnection(
  projectId: string,
  connectionId: string
): Promise<void> {
  await http.delete(`/projects/${projectId}/connections/${connectionId}`);
}
