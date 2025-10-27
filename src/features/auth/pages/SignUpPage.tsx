import { ThemeToggle } from "../../../components/ui/ThemeToggle";
import SignUpForm from "../components/SignUpForm";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left side - Form */}
      <div className="w-[45%] flex flex-col justify-center px-6 py-4 lg:px-12 xl:px-16 !bg-[#ebebeb] dark:!bg-[#0e1111]">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle variant="dropdown" />
        </div>
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-4 lg:hidden">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-[#a4f5a6] rounded-lg mb-3">
              <span className="text-base font-bold text-white">Z</span>
            </div>
            <h1 className="text-xl font-bold text-theme-primary">
              Create account
            </h1>
          </div>
          <div className="hidden lg:block mb-4">
            <h2 className="text-2xl font-bold text-theme-primary mb-1">
              Get started
            </h2>
            <p className="text-sm text-theme-secondary">
              Create your account to begin your automation journey
            </p>
          </div>
          <div className="p-4">
            <SignUpForm />
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t !border-gray-400 dark:!border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 !bg-[#ebebeb] dark:!bg-[#0e1111] text-gray-500 dark:text-gray-400">or</span>
              </div>
            </div>
            <div>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#222222] rounded-lg py-2 px-6 font-medium shadow-sm hover:bg-white/90 text-sm"
              >
                <span className="w-4 h-4 rounded-full" />
                <span>
                  Continue with <span className="font-semibold">Google</span>
                </span>
              </button>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-theme-secondary">
            Already have an account? {""}
            <Link to="/auth/sign-in" className="text-theme-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      
      {/* Right side - Background color only */}
      <div className="hidden lg:flex w-[55%] bg-[#a4f5a6]"></div>
    </div>
  );
}
