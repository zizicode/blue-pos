import { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

interface AuthRouteProps {
  children: ReactElement
}

export default function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/" replace /> : children
}
