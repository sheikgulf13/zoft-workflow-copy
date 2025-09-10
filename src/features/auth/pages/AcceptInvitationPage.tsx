import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "../../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../../components/ui";
import { http } from "../../../shared/api";
import { getBackendBaseUrl, extractAxiosMessage } from "../utils/authUtils";
import { toastError, toastSuccess } from "../../../components/ui/Toast";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", password: "" },
  });

  useEffect(() => {
    if (!token) {
      toastError("Invalid link", "Invitation token is missing");
    }
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toastError("Missing token", "Invitation token is required");
      return;
    }
    try {
      const baseUrl = getBackendBaseUrl();
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/accept`;
      await http.post(url, {
        token,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
      });
      toastSuccess("Invitation accepted", "You can now sign in.");
      navigate("/auth/sign-in", { replace: true });
    } catch (error: unknown) {
      const message =
        extractAxiosMessage(error) || "Failed to accept invitation";
      toastError("Could not accept", message);
    }
  };

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
                Accept Invitation
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Set your account details to join your workspace.
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
              <h1 className="text-2xl font-bold text-theme-primary">
                Accept Invitation
              </h1>
            </div>
            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                aria-live="polite"
              >
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">
                    First Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <User
                        size={18}
                        className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
                      />
                    </div>
                    <input
                      type="text"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 text-base border-0"
                      placeholder="Enter your first name"
                      autoComplete="given-name"
                      {...register("firstName")}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">
                    Last Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <User
                        size={18}
                        className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
                      />
                    </div>
                    <input
                      type="text"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 text-base border-0"
                      placeholder="Enter your last name"
                      autoComplete="family-name"
                      {...register("lastName")}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-2 text-xs font-medium text-[#ef4a45]">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold text-theme-primary">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex itemscenter pl-4 pointer-events-none">
                      <Lock
                        size={18}
                        className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
                      />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 text-base border-0"
                      placeholder="Create a password"
                      autoComplete="new-password"
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
                <button
                  className="w-full bg-[#b3a1ff] hover:bg-[#a08fff] text-[#222222] font-semibold py-2.5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-base"
                  type="submit"
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Accepting...
                    </div>
                  ) : (
                    "Accept Invitation"
                  )}
                </button>
                {!token && (
                  <p className="text-xs text-[#ef4a45] mt-2">
                    Token is missing from the link.
                  </p>
                )}
              </form>
              <div className="mt-6 text-center">
                <p className="text-theme-secondary text-sm">
                  Already have an account?{" "}
                  <Link
                    to="/auth/sign-in"
                    className="font-semibold text-[#b3a1ff] hover:text-[#a08fff] transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
