import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
  business_id: number | null
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  login: (email: string, password: string) => Promise<boolean>
  register: (username: string, password: string, businessName: string) => Promise<{ success: boolean }>
  logout: () => void
  loading: boolean
  currentUserId: string | undefined
  switchToStaff: (staffData: User) => void
  getCurrentUser: () => User | null
  setLoggedInUser: (userData: User) => void
}


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Demo user data
  const demoUser: User = {
    user_id: 1,
    username: 'demo@example.com',
    role: 'Admin',
    active: true,
    icon: 'lily',
    business_id: 1
  }

  const [user, setUser] = useState<User | null>(demoUser)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-login with demo data
  useEffect(() => {
    setUser(demoUser)
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(demoUser)
    setLoading(false)
    return true
  }

  const register = async (username: string, password: string, businessName: string): Promise<{ success: boolean }> => {
    setLoading(true)
    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setUser(demoUser)
    setLoading(false)
    return { 
      success: true
    }
  }

  const logout = () => {
    setUser(null)
    setSupabaseUser(null)
  }

  const switchToStaff = (staffData: User) => {
    setUser(staffData)
  }

  const getCurrentUser = () => {
    return user
  }

  const setLoggedInUser = (userData: User) => {
    setUser(userData)
  }

  const value: AuthContextType = {
    user,
    supabaseUser,
    login,
    register,
    logout,
    loading,
    currentUserId: user?.user_id?.toString(),
    switchToStaff,
    getCurrentUser,
    setLoggedInUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
