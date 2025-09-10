export function getBackendBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_BACKEND_API_URL ?? env.BACKEND_API_URL ?? "";
}

export function extractAxiosMessage(error: unknown): string | null {
  if (typeof error === "object" && error && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message ?? null;
  }
  if (error instanceof Error) return error.message;
  return null;
}
