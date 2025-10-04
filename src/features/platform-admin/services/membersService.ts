import { http } from "../../../shared/api";

export type PlatformMember = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  joinedAt?: string;
};

export async function fetchPlatformMembers(
  platformId: string
): Promise<PlatformMember[]> {
  const resp = await http.get(`/platforms/${platformId}/members`);
  const list = (resp.data?.members ?? resp.data ?? []) as unknown[];
  return list as PlatformMember[];
}


