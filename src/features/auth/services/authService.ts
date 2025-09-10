import { http } from "../../../shared/api";
import { getBackendBaseUrl } from "../utils/authUtils";
import type {
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
} from "../types/auth.types";

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/auth/login`;
  const { data } = await http.post<LoginResponse>(url, req);
  return data;
}

export async function signup(req: SignUpRequest): Promise<SignUpResponse> {
  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/auth/signup`;
  const { data } = await http.post<SignUpResponse>(url, req);
  return data;
}
