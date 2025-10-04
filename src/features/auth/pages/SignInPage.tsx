import { ThemeToggle } from "../../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../../components/ui";
import SignInForm from "../components/SignInForm";
import { Link } from "react-router-dom";

export default function SignInPage() {
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
                Welcome to
                <br />
                <span className="text-[#b3a1ff]">Zoft Workflow</span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Automate your workflows with our powerful, intuitive platform.
                Connect your favorite tools and build amazing automations.
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
                Welcome back
              </h1>
            </div>
            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">
                Sign in
              </h2>
              <p className="text-theme-secondary">
                Enter your credentials to access your workspace
              </p>
            </div>
            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <SignInForm />
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#222222] rounded-2xl py-2.5 px-6 font-medium shadow-sm hover:bg-white/90"
                >
                  <span className="w-5 h-5 rounded-full" />
                  <span>
                    Continue with <span className="font-semibold">Google</span>
                  </span>
                </button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-theme-secondary">
              Don't have an account? {""}
              <Link to="/auth/sign-up" className="text-theme-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
