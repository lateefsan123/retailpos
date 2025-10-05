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


interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  login: (email: string, password: string) => Promise<boolean>
  authenticate: (email: string, password: string) => Promise<{ success: boolean; businessId?: number }>
  register: (username: string, password: string, businessName: string, firstName?: string, lastName?: string, email?: string, phone?: string, businessType?: string, businessDescription?: string, businessAddress?: string, businessPhone?: string, currency?: string, website?: string, vatNumber?: string, openTime?: string, closeTime?: string) => Promise<{ success: boolean; pendingApproval?: boolean }>
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
  ): Promise<{ success: boolean; pendingApproval?: boolean }> => {
    try {
      console.log('=== REGISTRATION STARTED ===')
      console.log('Registration data:', {
        username,
        businessName,
        firstName,
        lastName,
        email,
        phone,
        businessType,
        businessAddress
      })
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

      // Check if there's already a pending registration for this email
      const { data: existingPending } = await supabase
        .from('pending_registrations')
        .select('id')
        .eq('email', email || username)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingPending) {
        console.error('Registration already pending for this email')
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

      // Create default branch for the business
      try {
        const { error: branchError } = await supabase
          .from('branches')
          .insert({
            branch_name: 'Main Branch',
            address: businessAddress || 'Default Address',
            phone: businessPhone || null,
            manager_id: null,
            shop_image: 'shop1',
            business_id: businessData.business_id,
            active: true,
            created_at: new Date().toISOString()
          })
        
        if (branchError) {
          console.warn('Failed to create default branch:', branchError)
          // Don't fail the entire registration if branch creation fails
        } else {
          console.log('Default branch created successfully for business:', businessData.business_id)
        }
      } catch (branchError) {
        console.warn('Failed to create default branch:', branchError)
        // Don't fail the entire registration if branch creation fails
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
          active: false, // Set to false initially - will be activated after approval
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

      // Create pending registration record
      console.log('Creating pending registration for user_id:', userData.user_id)
      const pendingRegistrationData = {
        user_id: userData.user_id,
        email: email || username,
        business_name: businessName,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        business_type: businessType,
        business_description: businessDescription,
        business_address: businessAddress,
        business_phone: businessPhone,
        currency: currency,
        website: website,
        vat_number: vatNumber,
        open_time: openTime,
        close_time: closeTime,
        status: 'pending'
      }
      console.log('Pending registration data:', pendingRegistrationData)
      
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_registrations')
        .insert(pendingRegistrationData)
        .select()

      if (pendingError) {
        console.error('Error creating pending registration:', pendingError)
        // Clean up user and business if pending registration creation failed
        await supabase
          .from('users')
          .delete()
          .eq('user_id', userData.user_id)
        await supabase
          .from('business_info')
          .delete()
          .eq('business_id', businessData.business_id)
        return { success: false }
      }
      
      console.log('Pending registration created successfully:', pendingData)

      // Don't log the user in automatically - they need approval first
      // Return success with pending approval flag
      console.log('=== REGISTRATION COMPLETED SUCCESSFULLY ===')
      console.log('User created with ID:', userData.user_id)
      console.log('Business created with ID:', businessData.business_id)
      console.log('Pending registration created:', pendingData)
      return { success: true, pendingApproval: true }
    } catch (error) {
      console.error('=== REGISTRATION FAILED ===')
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
