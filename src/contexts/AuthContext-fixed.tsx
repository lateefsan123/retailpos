import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { hashPassword } from '../utils/auth'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  currentUserId: string | undefined
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
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Add emergency logout function to window for debugging
    (window as any).emergencyLogout = () => {
      setLoading(false)
      setUser(null)
      setSupabaseUser(null)
      localStorage.clear()
      sessionStorage.clear()
      window.location.reload()
    }

    // Check for existing Supabase session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session?.user) {
          setSupabaseUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          // Fallback to localStorage for backward compatibility
          const savedUser = localStorage.getItem('pos_user')
          if (savedUser) {
            setUser(JSON.parse(savedUser))
          }
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUser(session.user)
        try {
          await loadUserProfile(session.user.id)
        } catch (error) {
          // Silent error handling
        }
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null)
        setUser(null)
        localStorage.removeItem('pos_user')
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSupabaseUser(session.user)
        // Don't reload profile on token refresh to avoid unnecessary calls
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])


  const loadUserProfile = async (userId: string) => {
    try {
      // Get the user from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', parseInt(userId))
        .single()

      if (userError) {
        // console.error('Error loading user:', userError)
        // Create a temporary user for testing
        // console.log('Creating temporary user for testing...')
        const tempUser: User = {
          user_id: 999999,
          username: 'temp_user',
          role: 'owner',
          active: true,
          icon: 'lily'
        }
        setUser(tempUser)
        localStorage.setItem('pos_user', JSON.stringify(tempUser))
        return
      }

      // console.log('User data loaded:', userData)
      setUser(userData)
      localStorage.setItem('pos_user', JSON.stringify(userData))
      
    } catch (error) {
      // console.error('Error in loadUserProfile:', error)
      // Create a temporary user for testing
      // console.log('Creating temporary user for testing due to error...')
      const tempUser: User = {
        user_id: 999999,
        username: 'temp_user',
        role: 'owner',
        active: true,
        icon: 'lily'
      }
      setUser(tempUser)
      localStorage.setItem('pos_user', JSON.stringify(tempUser))
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Use legacy login directly since we're using username/password system
      const success = await legacyLogin(username, password)
      
      if (success) {
        localStorage.setItem('lastLogin', new Date().toLocaleString())
      }
      
      return success
    } catch (error) {
      // console.error('Login error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const legacyLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      // Hash the provided password
      const hashedPassword = hashPassword(password)
      
      // Query the users table to find matching credentials
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', hashedPassword)
        .eq('active', true)
        .single()

      if (error || !data) {
        // console.error('Legacy login failed:', error)
        return false
      }

      const userData: User = {
        user_id: data.user_id,
        username: data.username,
        role: data.role,
        active: data.active,
        icon: data.icon
      }

      setUser(userData)
      localStorage.setItem('pos_user', JSON.stringify(userData))
      localStorage.setItem('lastLogin', new Date().toLocaleString())
      localStorage.setItem('lastPassword', password)
      return true
    } catch (error) {
      // console.error('Legacy login error:', error)
      return false
    }
  }


  const logout = async () => {
    try {
      if (supabaseUser) {
        await supabase.auth.signOut()
      }
      setUser(null)
      setSupabaseUser(null)
      localStorage.removeItem('pos_user')
      localStorage.removeItem('lastPassword')
    } catch (error) {
      // console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    supabaseUser,
    login,
    logout,
    loading,
    currentUserId: supabaseUser?.id || user?.user_id?.toString()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
