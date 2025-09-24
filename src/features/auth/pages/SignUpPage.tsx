import { ThemeToggle } from "../../../components/ui/ThemeToggle";
import { SmudgyBackground } from "../../../components/ui";
import SignUpForm from "../components/SignUpForm";
import { Link } from "react-router-dom";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen bg-theme-background">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="dropdown" />
      </div>
      <SmudgyBackground colorHex={"#a4f5a6"} baseOpacity={0.15} zIndex={0} />
      <div className="relative z-10 flex min-h-screen max-h-screen overflow-hidden">
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-16 xl:px-24">
          <div className="max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#a4f5a6] rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-4xl font-bold text-theme-primary mb-4 leading-tight">
                Join the
                <br />
                <span className="text-[#a4f5a6]">Zoft Workflow</span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Create your account and start building powerful automations.
                Join thousands of users who trust Zoft for their workflow needs.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 py-6 lg:px-12 xl:px-16 max-h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#a4f5a6] rounded-xl mb-4">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Create account
              </h1>
            </div>
            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">
                Get started
              </h2>
              <p className="text-theme-secondary">
                Create your account to begin your automation journey
              </p>
            </div>
            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <SignUpForm />
            </div>
            <div className="mt-4 text-center text-sm text-theme-secondary">
              Already have an account? {""}
              <Link to="/auth/sign-in" className="text-theme-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
