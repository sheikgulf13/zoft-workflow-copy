import { http } from "../../../shared/api";

export type InvitationListItem = {
  id: string;
  email: string;
  status: "PENDING" | "EXPIRED" | "ACCEPTED" | "REJECTED";
  role?: "ADMIN" | "MEMBER";
  projectIds?: string[];
  createdAt?: string;
  expiresAt?: string | null;
};

export async function fetchPlatformInvitations(
  platformId: string,
  status?: "PENDING" | "EXPIRED" | "ACCEPTED" | "REJECTED"
): Promise<InvitationListItem[]> {
  const query = typeof status === "string" ? `?status=${status}` : "";
  const resp = await http.get(`/platforms/${platformId}/invitations${query}`);
  const list = (resp.data?.invitations ?? resp.data ?? []) as unknown[];
  return list as InvitationListItem[];
}

export async function revokePlatformInvitation(
  platformId: string,
  invitationId: string
): Promise<void> {
  await http.delete(`/platforms/${platformId}/invitations/${invitationId}`);
}


