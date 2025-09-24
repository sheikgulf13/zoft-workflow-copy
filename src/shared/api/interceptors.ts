import Cookies from "js-cookie";
import type { AxiosInstance } from "axios";

const ACCESS_COOKIE = "zw_access";

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const url = config.url ?? "";
    if (url.includes("/api/auth/")) return config;
    const token = Cookies.get(ACCESS_COOKIE);
    if (token) {
      config.headers = config.headers ?? {};
      // Respect per-request Authorization if already provided
      if (!config.headers["Authorization"]) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      config.headers["ngrok-skip-browser-warning"] = "true";
    }
    return config;
  });

  client.interceptors.response.use(
    (resp) => resp,
    (error) => Promise.reject(error)
  );
}
