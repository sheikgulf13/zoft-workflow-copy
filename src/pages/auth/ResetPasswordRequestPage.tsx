import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { http } from "../../lib/http";
import { toastError, toastSuccess } from "../../components/ui/Toast";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../components/ui";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.input<typeof schema>;

export default function ResetPasswordRequestPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/email/request-password-reset`;
      await http.post(url, { email: values.email });
      toastSuccess("Email sent", "Please check your inbox for the reset link");
      reset();
    } catch (error: unknown) {
      const message = extractAxiosMessage(error) || "Failed to send reset email";
      toastError("Request failed", message);
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
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-16 xl:px-24">
          <div className="max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#b3a1ff] rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-4xl font-bold text-theme-primary mb-4 leading-tight">
                Reset
                <br />
                <span className="text-[#b3a1ff]">Your Password</span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Enter your email address and we will send you a link to reset your password.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:px-12 xl:px-16 max-h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#b3a1ff] rounded-xl mb-4">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary">Reset password</h1>
            </div>

            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">Request reset link</h2>
              <p className="text-theme-secondary">We'll email you a secure reset link</p>
            </div>

            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-live="polite">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Mail size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Enter your email"
                      autoComplete="email"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">{errors.email.message}</p>
                  )}
                </div>

                <button
                  className="w-full bg-[#b3a1ff] hover:bg-[#a08fff] text-[#222222] font-semibold py-2.5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-base"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Email"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/auth/sign-in" className="inline-flex items-center gap-2 text-sm font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors">
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


