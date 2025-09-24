import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../../../app/store/auth";
import { useContextStore } from "../../../app/store/context";
import { login } from "../services/authService";
import type { LoginRequest, LoginResponse } from "../types/auth.types";
import { extractAxiosMessage } from "../utils/authUtils";

export function useSignIn() {
  const { signIn, restoreSession, isAuthenticated } = useAuthStore();
  const initializeFromLogin = useContextStore((s) => s.initializeFromLogin);
  const loadProjectsForCurrentPlatform = useContextStore(
    (s) => s.loadProjectsForCurrentPlatform
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const doLogin = useCallback(
    async (req: LoginRequest & { remember?: boolean }) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const data: LoginResponse = await login({
          email: req.email,
          password: req.password,
        });
        const fullName = `${data.user.firstName ?? ""} ${
          data.user.lastName ?? ""
        }`.trim();
        signIn({
          user: {
            id: data.user.email,
            name: fullName || data.user.email,
            email: data.user.email,
          },
          accessToken: data.token,
          remember: req.remember,
        });
        initializeFromLogin({
          currentPlatform: data.user.currentPlatform,
          currentProject: data.user.currentProject,
          platforms: data.user.platforms,
        });
        if (data.user.currentPlatform?.id) {
          try {
            await loadProjectsForCurrentPlatform();
          } catch {
            /* noop */
          }
        }
        if (data.user.currentProject?.id) {
          // caller can fetch details if needed
        }
        return data;
      } catch (e: unknown) {
        setError(extractAxiosMessage(e) || "Failed to sign in");
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [signIn, initializeFromLogin, loadProjectsForCurrentPlatform]
  );

  return { doLogin, isSubmitting, error, isAuthenticated };
}
