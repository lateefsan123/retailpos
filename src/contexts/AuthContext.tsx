import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hashPassword, hashPasswordLegacy, verifyPassword, validatePassword, validateUsername, validateEmail } from '../utils/auth'
import { generateJWT, verifyJWT } from '../utils/jwt'
import { DEFAULT_ICON_NAME } from '../constants/userIcons'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
  business_id: number | null
  last_used?: string
  pin?: string
  pin_hash?: string
  email?: string
  full_name?: string
  private_preview?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, password: string, businessName: string, firstName?: string, lastName?: string, email?: string, businessType?: string, businessDescription?: string, businessAddress?: string, businessPhone?: string, currency?: string, website?: string, vatNumber?: string, openTime?: string, closeTime?: string, iconName?: string) => Promise<{ success: boolean; error?: string }>
  switchUser: (targetUserId: number, password: string, usePin?: boolean) => Promise<boolean>
  refreshUser: () => Promise<void>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on app load
    const checkExistingSession = async () => {
      try {
        // Check for JWT token
        const token = localStorage.getItem('auth_token')
        if (token) {
          const payload = await verifyJWT(token)
          if (payload) {
            // Token is valid, load user data
            await loadUserProfile(payload.userId.toString())
            return
          } else {
            // Token expired or invalid, clean up
            localStorage.removeItem('auth_token')
            localStorage.removeItem('pos_user')
          }
        }

        // Fallback to localStorage for backward compatibility
        const savedUser = localStorage.getItem('pos_user')
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false)
      }
    }

    checkExistingSession()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', parseInt(userId))
        .eq('active', true)
        .single()

      if (userError || !userData) {
        setUser(null)
        localStorage.removeItem('pos_user')
        localStorage.removeItem('auth_token')
        return
      }

      const userProfile: User = {
        user_id: userData.user_id,
        username: userData.username,
        role: userData.role,
        active: userData.active,
        icon: userData.icon,
        business_id: userData.business_id ?? null,
        last_used: userData.last_used,
        pin: userData.pin,
        pin_hash: userData.pin_hash,
        email: userData.email,
        full_name: userData.full_name,
        private_preview: userData.private_preview
      }

      setUser(userProfile)
      localStorage.setItem('pos_user', JSON.stringify(userProfile))
      
    } catch (error) {
      setUser(null)
      localStorage.removeItem('pos_user')
      localStorage.removeItem('auth_token')
    }
  }

  const register = async (
    username: string, 
    password: string, 
    businessName: string,
    firstName?: string,
    lastName?: string,
    email?: string,
    businessType?: string,
    businessDescription?: string,
    businessAddress?: string,
    businessPhone?: string,
    currency?: string,
    website?: string,
    vatNumber?: string,
    openTime?: string,
    closeTime?: string,
    iconName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      // 1. Password strength validation
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors.join(', ') }
      }
      
      // 2. Username validation
      const usernameValidation = validateUsername(username)
      if (!usernameValidation.isValid) {
        return { success: false, error: usernameValidation.error }
      }
      
      // 3. Email validation (if provided)
      if (email) {
        const emailValidation = validateEmail(email)
        if (!emailValidation.isValid) {
          return { success: false, error: emailValidation.error }
        }
      }
      
      // 4. Username uniqueness check removed - usernames no longer need to be unique
      
      // 5. Check for existing email (if provided)
      if (email) {
        const { data: existingEmail } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .maybeSingle()
          
        if (existingEmail) {
          return { success: false, error: 'Email address is already registered' }
        }
      }

      // 6. Hash password with bcrypt
      const hashedPassword = await hashPassword(password)
      
      // 7. Create business
      const businessHours = openTime && closeTime ? `${openTime} - ${closeTime}` : null
      
      const { data: businessData, error: businessError } = await supabase
        .from('business_info')
        .insert({
          name: businessName,
          business_name: businessName,
          business_type: businessType || 'Retail Store',
          description: businessDescription || null,
          address: businessAddress || 'Default Address',
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
        console.error('Business creation error:', businessError)
        return { success: false, error: 'Failed to create business. Please try again.' }
      }

      // 8. Create default branch
      await supabase
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
      
      // Continue even if branch creation fails
      
      // 9. Create user with secure password hash
      const iconToSave = iconName || DEFAULT_ICON_NAME
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: username,
          password_hash: hashedPassword,
          email: email || null,
          full_name: fullName,
          role: 'owner',
          active: true,
          business_id: businessData.business_id,
          icon: iconToSave,
          email_verified: true, // Skip email verification for now
          private_preview: false, // New signups need manual approval
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (userError || !userData) {
        console.error('User creation error:', userError)
        return { success: false, error: 'Failed to create account. Please try again.' }
      }

      // 10. Registration successful - redirect to login
      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // 1. Rate limiting check (simple in-memory implementation)
      const loginAttempts = JSON.parse(localStorage.getItem('login_attempts') || '[]')
      const now = Date.now()
      const recentAttempts = loginAttempts.filter((attempt: number) => now - attempt < 5 * 60 * 1000) // 5 minutes
      
      if (recentAttempts.length >= 5) {
        return { success: false, error: 'Too many login attempts. Please try again later.' }
      }

      // 2. Find user by email or username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${email},username.eq.${email}`)
        .eq('active', true)
        .maybeSingle()

      if (userError || !userData) {
        // Record failed attempt
        recentAttempts.push(now)
        localStorage.setItem('login_attempts', JSON.stringify(recentAttempts))
        return { success: false, error: 'Invalid email or password' }
      }

      // 3. Verify password (try bcrypt first, then legacy)
      let isPasswordValid = false
      
      try {
        // Try bcrypt verification first
        isPasswordValid = await verifyPassword(password, userData.password_hash)
      } catch (bcryptError) {
        // If bcrypt fails, try legacy hash for backward compatibility
        const legacyHash = hashPasswordLegacy(password)
        isPasswordValid = userData.password_hash === legacyHash || userData.password_hash === legacyHash.toString()
        
        // Auto-migrate: If legacy password is valid, update to bcrypt hash
        if (isPasswordValid) {
          try {
            const newBcryptHash = await hashPassword(password)
            await supabase
              .from('users')
              .update({ password_hash: newBcryptHash })
              .eq('user_id', userData.user_id)
          } catch (migrationError) {
            // Don't fail login if migration fails
          }
        }
      }
      
      if (!isPasswordValid) {
        // Record failed attempt
        recentAttempts.push(now)
        localStorage.setItem('login_attempts', JSON.stringify(recentAttempts))
        return { success: false, error: 'Invalid email or password' }
      }

      // 4. Clear failed attempts on successful login
      localStorage.removeItem('login_attempts')

      // 5. Generate new JWT token
      const token = await generateJWT({
        userId: userData.user_id,
        username: userData.username,
        role: userData.role,
        businessId: userData.business_id
      })

      // 6. Update last_used timestamp
      await supabase
        .from('users')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', userData.user_id)

      // 7. Check private preview access for owner/admin roles
      if ((userData.role === 'owner' || userData.role === 'admin') && userData.private_preview === false) {
        // Record failed attempt for rate limiting
        recentAttempts.push(now)
        localStorage.setItem('login_attempts', JSON.stringify(recentAttempts))
        return { success: false, error: 'Your account is pending approval. Please wait for access to be granted.' }
      }

      // 8. Set user session
      const userProfile: User = {
        user_id: userData.user_id,
        username: userData.username,
        role: userData.role,
        active: userData.active,
        icon: userData.icon,
        business_id: userData.business_id ?? null,
        email: userData.email,
        full_name: userData.full_name,
        private_preview: userData.private_preview
      }

      setUser(userProfile)
      localStorage.setItem('pos_user', JSON.stringify(userProfile))
      localStorage.setItem('auth_token', token)
      localStorage.setItem('lastLogin', new Date().toLocaleString())

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const switchUser = async (targetUserId: number, password: string, usePin: boolean = false): Promise<boolean> => {
    try {
      setLoading(true)
      
      let data, error
      
      if (usePin) {
        // For PIN authentication, verify against hashed PIN
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('active', true)
          .single()
        
        if (userDataError || !userData) {
          return false
        }
        
        // Verify PIN (try hashed first, then legacy plaintext for backward compatibility)
        let isPinValid = false
        
        if (userData.pin_hash) {
          // Use bcrypt to verify hashed PIN
          try {
            isPinValid = await verifyPassword(password, userData.pin_hash)
          } catch (error) {
            console.error('Error verifying hashed PIN:', error)
            isPinValid = false
          }
        } else if (userData.pin) {
          // Legacy: plaintext PIN comparison (for backward compatibility)
          isPinValid = userData.pin === password
          
          // Auto-migrate: hash the PIN for next time
          if (isPinValid) {
            try {
              const hashedPin = await hashPassword(password)
              await supabase
                .from('users')
                .update({ pin_hash: hashedPin })
                .eq('user_id', targetUserId)
              console.log('PIN auto-migrated to secure hash for user:', targetUserId)
            } catch (error) {
              console.error('Failed to auto-migrate PIN:', error)
              // Don't fail authentication if migration fails
            }
          }
        }
        
        if (!isPinValid) {
          return false
        }
        
        data = userData
        error = null
      } else {
        // For password authentication, try bcrypt first, then legacy
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('password_hash, username')
          .eq('user_id', targetUserId)
          .single()
        
        if (userDataError || !userData) {
          return false
        }
        
        // Try bcrypt verification first
        let isPasswordValid = false
        try {
          isPasswordValid = await verifyPassword(password, userData.password_hash)
        } catch {
          // If bcrypt fails, try legacy hash
          const legacyHash = hashPasswordLegacy(password)
          isPasswordValid = userData.password_hash === legacyHash || userData.password_hash === legacyHash.toString()
        }
        
        if (!isPasswordValid) {
          return false
        }
        
        // Get full user data
        const result = await supabase
          .from('users')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('active', true)
          .single()
        
        data = result.data
        error = result.error
      }

      if (error || !data) {
        return false
      }

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
        pin: data.pin,
        email: data.email,
        full_name: data.full_name,
        private_preview: data.private_preview
      }

      // Generate new JWT token
      const token = await generateJWT({
        userId: data.user_id,
        username: data.username,
        role: data.role,
        businessId: data.business_id
      })

      // Update the current user state
      setUser(newUserData)
      localStorage.setItem('pos_user', JSON.stringify(newUserData))
      localStorage.setItem('auth_token', token)
      localStorage.setItem('lastLogin', new Date().toLocaleString())
      if (!usePin) {
        localStorage.setItem('lastPassword', password)
      }
      
      return true
    } catch (error) {
      return false
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (user?.user_id) {
      await loadUserProfile(user.user_id.toString())
    }
  }

  const logout = async () => {
    try {
      setUser(null)
      localStorage.removeItem('pos_user')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('lastPassword')
      
      // Redirect to login page
      window.location.href = '/retailpos/login'
    } catch (error) {
      // Even if there's an error, still redirect to login
      window.location.href = '/retailpos/login'
    }
  }

  const value = {
    user,
    login,
    register,
    switchUser,
    refreshUser,
    logout,
    loading,
    currentUserId: user?.user_id?.toString()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
