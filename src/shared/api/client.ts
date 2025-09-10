import axios from "axios";
import { attachInterceptors } from "./interceptors";

const env = import.meta.env as Record<string, string | undefined>;
const rawBackendUrl = env.VITE_BACKEND_API_URL || env.BACKEND_API_URL || "";
const resolvedBaseUrl = rawBackendUrl
  ? `${rawBackendUrl.replace(/\/$/, "")}/api`
  : "/api";

export const http = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 20_000,
});

attachInterceptors(http);
