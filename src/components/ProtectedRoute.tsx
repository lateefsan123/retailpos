import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Login from '../pages/Login'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 mb-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return <>{children}</>
}

export default ProtectedRoute
