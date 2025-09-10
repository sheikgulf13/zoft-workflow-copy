import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "../../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../../components/ui";
import { sendVerification, verifyEmailToken } from "../services/emailService";
import { extractAxiosMessage } from "../utils/authUtils";
import { toastError, toastSuccess } from "../../../components/ui/Toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type FormValues = z.input<typeof schema>;

export default function SendVerificationPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const [isSent, setIsSent] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token") || params.get("t") || "";
    if (!token) return;
    (async () => {
      try {
        await verifyEmailToken(token);
        toastSuccess(
          "Email verified",
          "Your email has been verified. Please sign in."
        );
        navigate("/auth/sign-in");
      } catch (error: unknown) {
        const message = extractAxiosMessage(error) || "Failed to verify email";
        toastError("Verification failed", message);
      }
    })();
  }, [location.search, navigate]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await sendVerification(values.email);
      setIsSent(true);
      toastSuccess(
        "Verification email sent",
        "Please check your inbox and follow the verification link"
      );
    } catch (error: unknown) {
      const message =
        extractAxiosMessage(error) || "Failed to send verification email";
      toastError("Verification failed", message);
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
                Verify Your
                <br />
                <span className="text-[#b3a1ff]">Email Address</span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                We'll send you a verification link to confirm your email
                address.
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
                Verify Email
              </h1>
            </div>
            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">
                Send Verification
              </h2>
              <p className="text-theme-secondary">
                Enter your email to receive a verification link
              </p>
            </div>
            {!isSent ? (
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
                        <Mail
                          size={18}
                          className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors"
                        />
                      </div>
                      <input
                        type="email"
                        className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                        placeholder="Enter your email address"
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
                      "Send Verification Email"
                    )}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <Link
                    to="/auth/sign-in"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#a4f5a6] rounded-full mb-4">
                    <Mail size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-primary mb-2">
                    Verification Email Sent!
                  </h3>
                  <p className="text-theme-secondary">
                    We've sent a verification link to your email address. Please
                    check your inbox.
                  </p>
                </div>
                <div className="space-y-3">
                  <Link
                    to="/auth/sign-in"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Sign In
                  </Link>
                  <button
                    onClick={() => setIsSent(false)}
                    className="block w-full text-sm font-semibold text-[#b3a1ff] hover:text-[#a08fff] transition-colors"
                  >
                    Send another verification email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
