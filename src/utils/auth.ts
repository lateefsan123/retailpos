import bcrypt from 'bcryptjs'

/**
 * Secure password hashing using bcrypt
 * This is the recommended approach for new users
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12 // High security
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against bcrypt hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

/**
 * @deprecated This function is deprecated and maintained only for backward compatibility with legacy users.
 * Simple password hashing function (in production, use bcrypt or similar)
 * This is a simple hash for demo purposes only.
 */
export const hashPasswordLegacy = (password: string): string => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Ensure we always return a string representation of the hash
  return hash.toString()
}

/**
 * @deprecated This function is deprecated and maintained only for backward compatibility with legacy users.
 * Alternative hash function that might match existing data.
 */
export const hashPasswordAlternative = (password: string): string => {
  let hash = 0
  if (password.length === 0) return hash.toString()
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate username format
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return {
      isValid: false,
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    }
  }
  
  return { isValid: true }
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    }
  }
  
  return { isValid: true }
}

// Generate a unique user ID
export const generateUserId = (): number => {
  return Math.floor(Math.random() * 1000000) + 1
}
