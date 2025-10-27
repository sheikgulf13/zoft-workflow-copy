import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User2, Eye, EyeOff } from "lucide-react";
import { toastError, toastSuccess } from "../../../../components/ui/Toast";
import { useNavigate } from "react-router-dom";
import { useSignUp } from "../../hooks/useSignUp";

const schema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    remember: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.input<typeof schema>;

export default function SignUpForm() {
  const navigate = useNavigate();
  const { doSignUp, isSubmitting, error } = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      remember: false,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const resp = await doSignUp({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      const fullName = `${resp.user.firstName} ${resp.user.lastName}`.trim();
      toastSuccess(
        "Account created",
        `Welcome, ${fullName}. Please verify your email to continue.`
      );
      navigate("/auth/send-verification");
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
        "Failed to sign up";
      toastError("Sign up failed", message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3"
      aria-live="polite"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">
            First Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <User2
                size={18}
                className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
              />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg !bg-white dark:bg-[#232b2b] px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-white dark:focus:bg-[#232b2b] focus:ring-2 focus:ring-[#a4f5a6] focus:border-[#a4f5a6] disabled:cursor-not-allowed disabled:opacity-60 text-base border border-gray-300 dark:border-gray-600"
              placeholder="John"
              autoComplete="given-name"
              {...register("firstName")}
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">
            Last Name
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <User2
                size={18}
                className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
              />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg !bg-white dark:bg-[#232b2b] px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-white dark:focus:bg-[#232b2b] focus:ring-2 focus:ring-[#a4f5a6] focus:border-[#a4f5a6] disabled:cursor-not-allowed disabled:opacity-60 text-base border border-gray-300 dark:border-gray-600"
              placeholder="Doe"
              autoComplete="family-name"
              {...register("lastName")}
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">
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
            className="block w-full rounded-lg !bg-white dark:bg-[#232b2b] px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-white dark:focus:bg-[#232b2b] focus:ring-2 focus:ring-[#a4f5a6] focus:border-[#a4f5a6] disabled:cursor-not-allowed disabled:opacity-60 text-base border border-gray-300 dark:border-gray-600"
            placeholder="Enter your email"
            autoComplete="email"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">
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
            className="block w-full rounded-lg !bg-white dark:bg-[#232b2b] px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-white dark:focus:bg-[#232b2b] focus:ring-2 focus:ring-[#a4f5a6] focus:border-[#a4f5a6] disabled:cursor-not-allowed disabled:opacity-60 text-base border !border-gray-300 dark:border-gray-600"
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
          <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">
          Confirm Password
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Lock
              size={18}
              className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
            />
          </div>
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="block w-full rounded-lg !bg-white dark:bg-[#232b2b] px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-white dark:focus:bg-[#232b2b] focus:ring-2 focus:ring-[#a4f5a6] focus:border-[#a4f5a6] disabled:cursor-not-allowed disabled:opacity-60 text-base border !border-gray-300 dark:border-gray-600"
            placeholder="Confirm your password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center">
        <label className="flex items-center gap-3 text-sm text-theme-secondary cursor-pointer group">
          <input
            type="checkbox"
            className="checkbox-custom checkbox-signup"
            {...register("remember")}
          />
          <span className="group-hover:text-theme-primary transition-colors">
            I agree to the Terms and Privacy Policy
          </span>
        </label>
      </div>

      <button
        className="w-full bg-[#a4f5a6] hover:bg-[#8dff8d] text-[#222222] font-semibold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-sm"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Creating account...
          </div>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}
