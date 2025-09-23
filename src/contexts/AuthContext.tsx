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
  business_id: number | null
}

interface AdminCredentials {
  username: string
  password: string
  businessId: number
}

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  login: (email: string, password: string) => Promise<boolean>
  register: (username: string, password: string, businessName: string) => Promise<{ success: boolean; adminCredentials?: AdminCredentials }>
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
    // Add a timeout to prevent infinite loading (30 seconds)
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false)
      }
    }, 30000)

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
        // If there's an error, still set loading to false to prevent infinite loading
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
      clearTimeout(loadingTimeout)
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
        console.error('Error loading user:', userError)
        setUser(null)
        return
      }

      const userProfile: User = {
        user_id: userData.user_id,
        username: userData.username,
        role: userData.role,
        active: userData.active,
        icon: userData.icon,
        business_id: userData.business_id ?? null
      }

      setUser(userProfile)
      localStorage.setItem('pos_user', JSON.stringify(userProfile))
      
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
      setUser(null)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Use legacy login with email (which is now stored as username)
      const success = await legacyLogin(email, password)
      
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
        icon: data.icon,
        business_id: data.business_id ?? null
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

  const register = async (username: string, password: string, businessName: string): Promise<{ success: boolean; adminCredentials?: AdminCredentials }> => {
    try {
      setLoading(true)
      
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', username)
        .single()

      if (existingUser) {
        console.error('Username already exists')
        return { success: false }
      }

      // Check if business name already exists
      const { data: existingBusiness, error: businessCheckError } = await supabase
        .from('business_info')
        .select('business_id')
        .eq('name', businessName)
        .single()

      if (existingBusiness) {
        console.error('Business name already exists')
        return { success: false }
      }

      // Create business first
      const { data: businessData, error: businessError } = await supabase
        .from('business_info')
        .insert({
          name: businessName,  // This is the required NOT NULL field
          business_name: businessName,
          business_type: 'Retail Store',
          address: 'Default Address',  // This is also required NOT NULL
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('business_id')
        .single()

      if (businessError || !businessData) {
        console.error('Error creating business:', businessError)
        return { success: false }
      }

      // Create user with the business_id
      const hashedPassword = hashPassword(password)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: username,
          password_hash: hashedPassword,
          role: 'Owner',
          active: true,
          business_id: businessData.business_id,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (userError || !userData) {
        console.error('Error creating user:', userError)
        // Clean up business if user creation failed
        await supabase
          .from('business_info')
          .delete()
          .eq('business_id', businessData.business_id)
        return { success: false }
      }

      // Automatically create admin account for the business
      // Each business gets an admin account with username "admin_{business_id}" and password "admin123"
      try {
        const adminHashedPassword = hashPassword('admin123')
        const adminUsername = `admin_${businessData.business_id}` // Make username unique per business
        await supabase
          .from('users')
          .insert({
            username: adminUsername,
            password_hash: adminHashedPassword,
            role: 'Admin',
            active: true,
            business_id: businessData.business_id,
            created_at: new Date().toISOString()
          })
        console.log('Admin account created successfully for business:', businessData.business_id, 'with username:', adminUsername)
      } catch (adminError) {
        console.warn('Failed to create admin account:', adminError)
        // Don't fail the entire registration if admin creation fails
      }

      // Set the user as logged in
      const newUser: User = {
        user_id: userData.user_id,
        username: userData.username,
        role: userData.role,
        active: userData.active,
        icon: userData.icon,
        business_id: userData.business_id
      }

      setUser(newUser)
      localStorage.setItem('pos_user', JSON.stringify(newUser))
      localStorage.setItem('current_business_id', businessData.business_id.toString())
      localStorage.setItem('lastLogin', new Date().toLocaleString())
      
      // Return admin credentials for display
      const adminCredentials: AdminCredentials = {
        username: `admin_${businessData.business_id}`,
        password: 'admin123',
        businessId: businessData.business_id
      }
      
      return { success: true, adminCredentials }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false }
    } finally {
      setLoading(false)
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
      
      // Redirect to login page
      window.location.href = '/retailpos/login'
    } catch (error) {
      // console.error('Logout error:', error)
      // Even if there's an error, still redirect to login
      window.location.href = '/retailpos/login'
    }
  }

  const value = {
    user,
    supabaseUser,
    login,
    register,
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
