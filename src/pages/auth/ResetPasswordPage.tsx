import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { http } from "../../lib/http";
import { toastError, toastSuccess } from "../../components/ui/Toast";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../components/ui";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.input<typeof schema>;

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") || params.get("t") || "";
  }, [location.search]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      toastError("Invalid link", "Reset token is missing or invalid");
    }
  }, [token]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!token) return;
    try {
      setIsSubmitting(true);
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/email/reset-password`;
      await http.post(url, { token, newPassword: values.password });
      toastSuccess("Password updated", "You can now sign in with your new password");
      reset();
      navigate("/auth/sign-in");
    } catch (error: unknown) {
      const message = extractAxiosMessage(error) || "Failed to reset password";
      toastError("Reset failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  function getBackendBaseUrl(): string {
    const env = import.meta.env as Record<string, string | undefined>;
    return env.VITE_BACKEND_API_URL ?? "";
  }

  function extractAxiosMessage(error: unknown): string | null {
    if (typeof error === "object" && error && "response" in error) {
      const err = error as { response?: { data?: { message?: string } } };
      return err.response?.data?.message ?? null;
    }
    if (error instanceof Error) return error.message;
    return null;
  }

  return (
    <div className="relative min-h-screen bg-theme-background">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="dropdown" />
      </div>

      <SmudgyBackground colorHex={"#b3a1ff"} baseOpacity={0.15} zIndex={0} />

      <div className="relative z-10 flex min-h-screen max-h-screen overflow-hidden">
        <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:px-12 xl:px-16 max-h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">Create new password</h2>
              <p className="text-theme-secondary">Enter a strong password for your account</p>
            </div>

            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-live="polite">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">New Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type="password"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type="password"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  className="w-full bg-[#b3a1ff] hover:bg-[#a08fff] text-[#222222] font-semibold py-2.5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-base"
                  type="submit"
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


