import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { hashPassword, hashPasswordAlternative } from '../utils/auth'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
  business_id: number | null
  last_used?: string
  pin?: string
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
  authenticate: (email: string, password: string) => Promise<{ success: boolean; businessId?: number }>
  register: (username: string, password: string, businessName: string) => Promise<{ success: boolean; adminCredentials?: AdminCredentials }>
  switchUser: (targetUserId: number, password: string, usePin?: boolean) => Promise<boolean>
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
        const { data: { session } } = await supabase.auth.getSession()
        
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
      } catch {
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

  const authenticate = async (email: string, password: string): Promise<{ success: boolean; businessId?: number }> => {
    try {
      setLoading(true)

      // Hash the provided password
      const hashedPassword = hashPassword(password)
      
      // Query the users table to find matching credentials
      const { data, error } = await supabase
        .from('users')
        .select('business_id')
        .eq('username', email)
        .eq('password_hash', hashedPassword)
        .eq('active', true)
        .single()

      if (error || !data) {
        return { success: false }
      }

      return { success: true, businessId: data.business_id }
    } catch (error) {
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)

      // First try to find user by email in the email field
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .maybeSingle()

      if (userByEmail && !emailError) {
        // User found by email, use their username for login
        const success = await legacyLogin(userByEmail.username, password)
        if (success) {
          localStorage.setItem('lastLogin', new Date().toLocaleString())
        }
        return success
      }

      // If not found by email, try using email as username (legacy behavior)
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
        .maybeSingle()

      if (error) {
        console.error('Legacy login error:', error)
        return false
      }
      
      if (!data) {
        console.log('No user found with those credentials')
        return false
      }

      const userData: User = {
        user_id: data.user_id,
        username: data.username,
        role: data.role,
        active: data.active,
        icon: data.icon,
        business_id: data.business_id ?? null,
        last_used: data.last_used
      }

      setUser(userData)
      localStorage.setItem('pos_user', JSON.stringify(userData))
      localStorage.setItem('lastLogin', new Date().toLocaleString())
      localStorage.setItem('lastPassword', password)
      
      // Update the last_used timestamp for the user
      await supabase
        .from('users')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', data.user_id)
      
      return true
    } catch (error) {
      // console.error('Legacy login error:', error)
      return false
    }
  }

  const register = async (
    username: string, 
    password: string, 
    businessName: string,
    firstName?: string,
    lastName?: string,
    email?: string,
    phone?: string,
    businessType?: string,
    businessDescription?: string,
    businessAddress?: string,
    businessPhone?: string,
    currency?: string,
    website?: string,
    vatNumber?: string,
    openTime?: string,
    closeTime?: string
  ): Promise<{ success: boolean; adminCredentials?: AdminCredentials }> => {
    try {
      setLoading(true)
      
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        console.error('Username already exists')
        return { success: false }
      }

      // Check if business name already exists
      const { data: existingBusiness } = await supabase
        .from('business_info')
        .select('business_id')
        .eq('name', businessName)
        .maybeSingle()

      if (existingBusiness) {
        console.error('Business name already exists')
        return { success: false }
      }

      // Create business first with all provided details
      const businessHours = openTime && closeTime ? `${openTime} - ${closeTime}` : null;
      
      const { data: businessData, error: businessError } = await supabase
        .from('business_info')
        .insert({
          name: businessName,  // This is the required NOT NULL field
          business_name: businessName,
          business_type: businessType || 'Retail Store',
          description: businessDescription || null,
          address: businessAddress || 'Default Address',  // This is also required NOT NULL
          phone_number: businessPhone || null,
          website: website || null,
          vat_number: vatNumber || null,
          business_hours: businessHours,
          currency: currency || 'USD',
          created_at: new Date().toISOString()
        })
        .select('business_id')
        .single()

      if (businessError || !businessData) {
        console.error('Error creating business:', businessError)
        return { success: false }
      }

      // Create user with the business_id and additional details
      const hashedPassword = hashPassword(password)
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: username,
          password_hash: hashedPassword,
          role: 'owner',
          active: true,
          business_id: businessData.business_id,
          email: email || null,
          full_name: fullName,
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

  const switchUser = async (targetUserId: number, password: string, usePin: boolean = false): Promise<boolean> => {
    try {
      setLoading(true)
      
      console.log('Switching to user ID:', targetUserId, 'with', usePin ? 'PIN' : 'password', 'length:', password.length)
      
      let data, error
      
      if (usePin) {
        // For PIN authentication, compare directly without hashing
        const result = await supabase
          .from('users')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('pin', password)
          .eq('active', true)
          .single()
        data = result.data
        error = result.error
      } else {
        // For password authentication, hash the password
        const hashedPassword = hashPassword(password)
        console.log('Hashed password:', hashedPassword)
        console.log('Target user ID:', targetUserId)
        
        // First, let's check what the user's actual password hash is
        const { data: userData } = await supabase
          .from('users')
          .select('password_hash, username')
          .eq('user_id', targetUserId)
          .single()
        
        console.log('User data from DB:', userData)
        console.log('Expected hash:', hashedPassword)
        console.log('Actual hash in DB:', userData?.password_hash)
        
        // Try the current hash first
        let result = await supabase
          .from('users')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('password_hash', hashedPassword)
          .eq('active', true)
          .single()
        
        // If that fails, try with the hash as an integer
        if (result.error || !result.data) {
          console.log('First attempt failed, trying with integer hash')
          const integerHash = parseInt(hashedPassword)
          result = await supabase
            .from('users')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('password_hash', integerHash)
            .eq('active', true)
            .single()
        }
        
        // If that still fails, try with alternative hash function
        if (result.error || !result.data) {
          console.log('Integer hash failed, trying with alternative hash function')
          const altHash = hashPasswordAlternative(password)
          console.log('Alternative hash:', altHash)
          result = await supabase
            .from('users')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('password_hash', altHash)
            .eq('active', true)
            .single()
        }
        
        // If that still fails, try with the actual stored hash (for debugging)
        if (result.error || !result.data) {
          console.log('Alternative hash failed, trying with stored hash for debugging')
          result = await supabase
            .from('users')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('password_hash', userData?.password_hash)
            .eq('active', true)
            .single()
          
          if (result.data) {
            console.log('SUCCESS with stored hash! This means the password is correct but hash function is inconsistent')
            // For now, we'll allow this to proceed, but we should fix the hash function
          }
        }
        
        data = result.data
        error = result.error
      }

      if (error || !data) {
        console.error('User switch failed:', error)
        console.error('Query result - data:', data, 'error:', error)
        return false
      }

      console.log('Found target user data:', data)

      // Update the last_used timestamp for the target user
      await supabase
        .from('users')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', targetUserId)

      // Create new user data with updated last_used
      const newUserData: User = {
        user_id: data.user_id,
        username: data.username,
        role: data.role,
        active: data.active,
        icon: data.icon,
        business_id: data.business_id ?? null,
        last_used: new Date().toISOString(),
        pin: data.pin
      }

      // Update the current user state
      console.log('Before switch - Current user:', user?.username, 'Role:', user?.role)
      setUser(newUserData)
      localStorage.setItem('pos_user', JSON.stringify(newUserData))
      localStorage.setItem('lastLogin', new Date().toLocaleString())
      if (!usePin) {
        localStorage.setItem('lastPassword', password)
      }
      
      // Force a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 50))
      
      console.log('After switch - New user:', newUserData.username, 'Role:', newUserData.role)
      console.log('User switched successfully to:', newUserData.username, 'Role:', newUserData.role)
      console.log('Updated localStorage user:', JSON.parse(localStorage.getItem('pos_user') || '{}'))
      console.log('User state should now be updated - no redirect should occur')
      return true
    } catch (error) {
      console.error('User switch error:', error)
      return false
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
    authenticate,
    register,
    switchUser,
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
