import { Navigate } from 'react-router-dom'
import { getRole } from '../api/client'

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('gs_access')
  if (!token || token.startsWith('demo-access-')) return <Navigate to="/login" replace />

  if (requiredRole) {
    const role = getRole()
    if (role !== requiredRole) {
      return <Navigate to={role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />
    }
  }

  return children
}
