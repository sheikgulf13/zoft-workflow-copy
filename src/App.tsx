import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import SendVerificationPage from "./features/auth/pages/SendVerificationPage";

const SignInPage = lazy(() => import("./features/auth/pages/SignInPage"));
const SignUpPage = lazy(() => import("./features/auth/pages/SignUpPage"));
const ResetPasswordRequestPage = lazy(
  () => import("./features/auth/pages/ResetPasswordRequestPage")
);
const ResetPasswordPage = lazy(
  () => import("./features/auth/pages/ResetPasswordPage")
);
const AcceptInvitationPage = lazy(
  () => import("./features/auth/pages/AcceptInvitationPage")
);
const AppLayout = lazy(
  () => import("./shared/components/layout/AppLayout/AppLayout")
);
const HomePage = lazy(() => import("./features/home/pages/HomePage"));
const FlowsPage = lazy(() => import("./features/flows/pages/FlowsPage"));
const FlowEditorPage = lazy(
  () => import("./features/flows/pages/FlowEditorPage")
);
const ConnectionsPage = lazy(
  () => import("./features/connections/pages/ConnectionsPage")
);
const OAuthCallbackPage = lazy(
  () => import("./features/connections/pages/OAuthCallbackPage")
);
const PlatformAdminLayout = lazy(
  () => import("./features/platform-admin/pages/PlatformAdminLayout")
);
const InvitationsPage = lazy(
  () => import("./features/platform-admin/pages/InvitationsPage")
);
const UsersPage = lazy(
  () => import("./features/platform-admin/pages/UsersPage")
);

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-theme-background">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-theme-secondary/20 border-t-[#b3a1ff] rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-[#b3a1ff]/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div className="text-theme-primary font-medium">Loading...</div>
            </div>
          </div>
        }
      >
        <Routes>
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/auth/sign-up" element={<SignUpPage />} />
          <Route
            path="/auth/send-verification"
            element={<SendVerificationPage />}
          />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route
            path="/reset-password-request"
            element={<ResetPasswordRequestPage />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<SendVerificationPage />} />
          <Route path="/oauth" element={<OAuthCallbackPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="flows/create" element={<FlowEditorPage />} />
            <Route
              path="agents"
              element={<div className="container-page py-6">Agents</div>}
            />
            <Route
              path="tables"
              element={<div className="container-page py-6">Tables</div>}
            />
            <Route
              path="mcp"
              element={<div className="container-page py-6">MCP</div>}
            />
            <Route
              path="todos"
              element={<div className="container-page py-6">Todos</div>}
            />
            <Route path="enter-platform-admin" element={<PlatformAdminLayout />}>
              <Route index element={<InvitationsPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="connections" element={<ConnectionsPage />} />
            <Route
              path="tutorials"
              element={<div className="container-page py-6">Tutorials</div>}
            />
            <Route
              path="invite-user"
              element={<div className="container-page py-6">Invite User</div>}
            />
            <Route
              path="help-feedback"
              element={
                <div className="container-page py-6">Help & Feedback</div>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
