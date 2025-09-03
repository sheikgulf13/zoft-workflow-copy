import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import SendVerificationPage from './pages/auth/SendVerificationPage'

const SignInPage = lazy(() => import('./pages/auth/SignInPage'))
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'))
const ResetPasswordRequestPage = lazy(() => import('./pages/auth/ResetPasswordRequestPage.tsx'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.tsx'))
const AcceptInvitationPage = lazy(() => import('./pages/auth/AcceptInvitationPage'))
const AppLayout = lazy(() => import('./layouts/AppLayout'))
const HomePage = lazy(() => import('./pages/app/HomePage'))
const FlowsPage = lazy(() => import('./pages/app/FlowsPage'))
const FlowEditorPage = lazy(() => import('./pages/app/FlowEditorPage'))
const ConnectionsPage = lazy(() => import('./pages/app/ConnectionsPage'))

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<div className="container-page py-10">Loading...</div>}>
        <Routes>
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/auth/sign-up" element={<SignUpPage />} />
          <Route path="/auth/send-verification" element={<SendVerificationPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/reset-password-request" element={<ResetPasswordRequestPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<SendVerificationPage />} />
          <Route path="/" element={<AppLayout />}> 
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="flows/create" element={<FlowEditorPage />} />
            <Route path="agents" element={<div className="container-page py-6">Agents</div>} />
            <Route path="tables" element={<div className="container-page py-6">Tables</div>} />
            <Route path="mcp" element={<div className="container-page py-6">MCP</div>} />
            <Route path="todos" element={<div className="container-page py-6">Todos</div>} />
            <Route path="enter-platform-admin" element={<div className="container-page py-6">Enter Platform Admin</div>} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="tutorials" element={<div className="container-page py-6">Tutorials</div>} />
            <Route path="invite-user" element={<div className="container-page py-6">Invite User</div>} />
            <Route path="help-feedback" element={<div className="container-page py-6">Help & Feedback</div>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
