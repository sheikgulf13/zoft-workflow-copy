import { http } from "../../../shared/api";
import { getBackendBaseUrl } from "../utils/authUtils";

export async function sendVerification(email: string): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  const url = `${
    baseUrl ? baseUrl.replace(/\/$/, "") : ""
  }/api/email/send-verification`;
  await http.post(url, { email });
}

export async function verifyEmailToken(token: string): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/email/verify`;
  await http.post(url, { token });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  const url = `${
    baseUrl ? baseUrl.replace(/\/$/, "") : ""
  }/api/email/request-password-reset`;
  await http.post(url, { email });
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const baseUrl = getBackendBaseUrl();
  const url = `${
    baseUrl ? baseUrl.replace(/\/$/, "") : ""
  }/api/email/reset-password`;
  await http.post(url, { token, newPassword });
}
