import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "../../stores/authStore";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { http } from "../../lib/http";
import { toastError, toastSuccess } from "../../components/ui/Toast";
import { useContextStore } from "../../stores/contextStore";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useState } from "react";
import { SmudgyBackground } from "../../components/ui";

//import { http as axiosClient } from "../../lib/http";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false),
});

type FormValues = z.input<typeof schema>;

type LoginResponse = {
  message: string;
  token: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    currentPlatform?: { id: string; name: string; role: string };
    currentProject?: { id: string; name: string; description?: string };
    platforms?: Array<{
      id: string;
      name: string;
      role: string;
      projects?: Array<{ id: string; name: string; description?: string }>;
    }>;
  };
};

export default function SignInPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });
  const { isAuthenticated, signIn, restoreSession } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initializeFromLogin = useContextStore((s) => s.initializeFromLogin);
  const setPlatformProjects = useContextStore((s) => s.setPlatformProjects);
  const setProjectDetails = useContextStore((s) => s.setProjectDetails);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationLink, setShowVerificationLink] = useState(false);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isAuthenticated) {
    const redirectTo = searchParams.get('redirect') || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/auth/login`;
      const response = await http.post<LoginResponse>(url, {
        email: values.email,
        password: values.password,
      });
      const data = response.data;
      const fullName = `${data.user.firstName} ${data.user.lastName}`.trim();

      signIn({
        user: { id: data.user.email, name: fullName, email: data.user.email },
        accessToken: data.token,
        remember: values.remember,
      });

      // Initialize platform/project context globally
      initializeFromLogin({
        currentPlatform: data.user.currentPlatform,
        currentProject: data.user.currentProject,
        platforms: data.user.platforms,
      });

      // Fetch all projects for the current platform to populate dropdown
      if (data.user.currentPlatform?.id) {
        try {
          const baseUrl2 = getBackendBaseUrl();
          const listUrl = `${
            baseUrl2 ? baseUrl2.replace(/\/$/, "") : ""
          }/api/platforms/${data.user.currentPlatform.id}/projects`;
          const listResp = await http.get<{
            projects: Array<{ 
              id: string; 
              name: string; 
              description?: string;
              createdAt: string;
              users: Array<{ id: string; email: string; role: string }>;
            }>;
          }>(listUrl);
          setPlatformProjects(
            data.user.currentPlatform.id,
            listResp.data.projects
          );
        } catch (e) {
          // Non-blocking error, show gentle notice
          // ignore toast here to avoid noise on login; components can trigger when needed
          console.error(e);
        }
      }

      // Fetch current project details so app can use immediately
      if (data.user.currentProject?.id) {
        try {
          const baseUrl3 = getBackendBaseUrl();
          const detailsUrl = `${
            baseUrl3 ? baseUrl3.replace(/\/$/, "") : ""
          }/api/projects/${data.user.currentProject.id}`;
          const detailsResp = await http.get<{
            project: { 
              id: string; 
              name: string; 
              description?: string;
              createdAt: string;
              users: Array<{ id: string; email: string; role: string }>;
            };
          }>(detailsUrl);
          setProjectDetails(detailsResp.data.project);
        } catch (e) {
          // Non-blocking
          console.error(e);
        }
      }

      toastSuccess("Login successful", `Welcome back, ${data.user.firstName}`);
      const redirectTo = searchParams.get('redirect') || '/';
      navigate(redirectTo);
    } catch (error: unknown) {
      // Check if it's a 403 email verification error
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { status?: number; data?: { error?: string } } };
        if (err.response?.status === 403 && 
            err.response?.data?.error === "Please verify your email before logging in") {
          setShowVerificationLink(true);
          toastError("Email verification required", "Please verify your email before logging in");
          return;
        }
      }
      
      const message = extractAxiosMessage(error) || "Failed to sign in";
      toastError("Sign in failed", message);
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
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="dropdown" />
      </div>

      <SmudgyBackground
         colorHex={"#b3a1ff"}
         baseOpacity={0.15}
         zIndex={0} 
      />

      <div className="relative z-10 flex min-h-screen max-h-screen overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-16 xl:px-24">
          <div className="max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#b3a1ff] rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-4xl font-bold text-theme-primary mb-4 leading-tight">
                Welcome to
                <br />
                <span className="text-[#b3a1ff]">
                  Zoft Workflow
                </span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Automate your workflows with our powerful, intuitive platform. 
                Connect your favorite tools and build amazing automations.
              </p>
            </div>
            
            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#a4f5a6] rounded-full"></div>
                <span className="text-theme-secondary">Visual workflow builder</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#8dff8d] rounded-full"></div>
                <span className="text-theme-secondary">500+ app integrations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#b3a1ff] rounded-full"></div>
                <span className="text-theme-secondary">Enterprise-grade security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:px-12 xl:px-16 max-h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#b3a1ff] rounded-xl mb-4">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary">Welcome back</h1>
            </div>

            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">Sign in</h2>
              <p className="text-theme-secondary">Enter your credentials to access your workspace</p>
            </div>

            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                aria-live="polite"
              >
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">
                    Email Address
                  </label>
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
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-theme-tertiary hover:text-theme-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm text-theme-secondary cursor-pointer group">
                    <input
                      type="checkbox"
                      className="checkbox-custom checkbox-signin"
                      {...register("remember")}
                    />
                    <span className="group-hover:text-theme-primary transition-colors">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-primary after:transition-all after:duration-200 hover:after:w-full"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  className="w-full bg-[#b3a1ff] hover:bg-[#a08fff] text-[#222222] font-semibold py-2.5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-base"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-theme-secondary">
                  Don't have an account?{" "}
                  <Link
                    to="/auth/sign-up"
                    className="font-semibold text-[#b3a1ff] hover:text-[#a08fff] transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#b3a1ff] after:transition-all after:duration-200 hover:after:w-full"
                  >
                    Create account
                  </Link>
                </p>
                {showVerificationLink && (
                  <div className="mt-4 pt-4 border-t border-theme-tertiary/20">
                    <p className="text-theme-secondary text-sm mb-2">
                      Need to verify your email?
                    </p>
                    <Link
                      to="/auth/send-verification"
                      className="font-semibold text-[#b3a1ff] hover:text-[#a08fff] transition-colors text-sm"
                    >
                      Send verification email
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
