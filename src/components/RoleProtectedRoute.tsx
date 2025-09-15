import { ReactNode } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useRole } from '../contexts/RoleContext'

interface RoleProtectedRouteProps {
  children: ReactNode
  requiredPermission?: keyof import('../contexts/RoleContext').RolePermissions
  fallbackRoute?: string
}

const RoleProtectedRoute = ({ 
  children, 
  requiredPermission,
  fallbackRoute = '/'
}: RoleProtectedRouteProps) => {
  const location = useLocation()
  const { canAccessRoute, hasPermission } = useRole()

  // Check if user can access the current route
  if (!canAccessRoute(location.pathname)) {
    return <Navigate to={fallbackRoute} replace />
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallbackRoute} replace />
  }

  return <>{children}</>
}

export default RoleProtectedRoute
