import { useCallback, useState } from "react";
import { signup } from "../services/authService";
import type { SignUpRequest, SignUpResponse } from "../types/auth.types";
import { extractAxiosMessage } from "../utils/authUtils";

export function useSignUp() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSignUp = useCallback(
    async (req: SignUpRequest): Promise<SignUpResponse> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const data = await signup(req);
        return data;
      } catch (e: unknown) {
        setError(extractAxiosMessage(e) || "Failed to sign up");
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { doSignUp, isSubmitting, error };
}
