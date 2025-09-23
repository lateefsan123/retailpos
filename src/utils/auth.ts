// Simple password hashing function (in production, use bcrypt or similar)
export const hashPassword = (password: string): string => {
  // This is a simple hash for demo purposes
  // In production, use a proper hashing library like bcrypt
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Ensure we always return a string representation of the hash
  return hash.toString()
}

// Alternative hash function that might match existing data
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

// Generate a unique user ID
export const generateUserId = (): number => {
  return Math.floor(Math.random() * 1000000) + 1
}
