import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toastError, toastSuccess } from "../../../../components/ui/Toast";
import { useSignIn } from "../../hooks/useSignIn";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false),
});

type FormValues = z.input<typeof schema>;

export default function SignInForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { doLogin, isSubmitting, error, isAuthenticated } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  if (isAuthenticated) {
    const redirectTo = searchParams.get("redirect") || "/";
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await doLogin({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });
      toastSuccess("Login successful", "Welcome back");
      const redirectTo = searchParams.get("redirect") || "/";
      navigate(redirectTo);
    } catch (err: unknown) {
      const errObj = err as
        | { response?: { data?: { message?: string } } }
        | Error;
      const message =
        (typeof errObj === "object" &&
          "response" in errObj &&
          (errObj as { response?: { data?: { message?: string } } }).response
            ?.data?.message) ||
        (errObj instanceof Error ? errObj.message : null) ||
        error ||
        "Failed to sign in";
      toastError("Sign in failed", message);
    }
  };

  return (
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
            <Mail
              size={18}
              className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
            />
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
            <Lock
              size={18}
              className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
            />
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
          <span className="group-hover:text-theme-primary transition-colors">
            Remember me
          </span>
        </label>
        <Link
          to="/reset-password-request"
          className="text-sm font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-primary after:transition-all after:duration-200 hover:after:w-full"
        >
          Forgot password?
        </Link>
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
  );
}
