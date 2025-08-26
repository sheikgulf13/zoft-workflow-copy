import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

type Props = { children: React.ReactElement }

export default function GuardedRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />
  }
  return children
}



