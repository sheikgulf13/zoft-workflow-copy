import { http } from "../../../shared/api";

export type OAuthAuthUrlResponse = {
  authUrl: string;
  pieceName: string;
  redirectUri: string;
};

export async function createOAuthAuthUrl(
  pieceName: string
): Promise<OAuthAuthUrlResponse> {
  const resp = await http.post("/oauth/auth-url", { pieceName });
  return resp.data as OAuthAuthUrlResponse;
}


