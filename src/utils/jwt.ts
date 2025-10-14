import * as jose from 'jose'

// Get JWT secret from environment variable
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'dev-fallback-secret-change-in-production'

// Warn if using fallback secret
if (!import.meta.env.VITE_JWT_SECRET) {
  console.warn('⚠️ WARNING: Using fallback JWT secret. Set VITE_JWT_SECRET in .env for production!')
}

// Convert secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET)

interface JWTPayload {
  userId: number
  username: string
  role: string
  businessId: number
}

/**
 * Generate a secure JWT token with HMAC SHA256 signature
 * Uses jose library for browser compatibility
 * @param payload User data to encode in the token
 * @returns Signed JWT token string
 */
export const generateJWT = async (payload: JWTPayload): Promise<string> => {
  try {
    const jwt = await new jose.SignJWT({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      businessId: payload.businessId
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('tillpoint-pos')
      .setAudience('tillpoint-users')
      .setExpirationTime('24h')
      .sign(secret)
    
    return jwt
  } catch (error) {
    console.error('Error generating JWT:', error)
    throw new Error('Failed to generate authentication token')
  }
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string to verify
 * @returns Decoded payload if valid, null if invalid/expired
 */
export const verifyJWT = async (token: string): Promise<(JWTPayload & { iat: number; exp: number }) | null> => {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: 'tillpoint-pos',
      audience: 'tillpoint-users'
    })
    
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      role: payload.role as string,
      businessId: payload.businessId as number,
      iat: payload.iat as number,
      exp: payload.exp as number
    }
  } catch (error) {
    // Token is invalid, expired, or tampered with
    if (error instanceof jose.errors.JWTExpired) {
      console.debug('JWT token expired')
    } else if (error instanceof jose.errors.JWTInvalid) {
      console.debug('Invalid JWT token')
    }
    return null
  }
}

/**
 * Validate the authentication token from localStorage
 * @returns true if token is valid and not expired
 */
export const validateAuthToken = async (): Promise<boolean> => {
  const token = localStorage.getItem('auth_token')
  if (!token) return false
  
  const payload = await verifyJWT(token)
  if (!payload) {
    // Token invalid or expired, clean up
    localStorage.removeItem('auth_token')
    localStorage.removeItem('pos_user')
    return false
  }
  
  return true
}

/**
 * Get the current user data from the stored JWT token
 * @returns User payload if token is valid, null otherwise
 */
export const getCurrentUserFromToken = async (): Promise<(JWTPayload & { iat: number; exp: number }) | null> => {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  
  return await verifyJWT(token)
}

/**
 * Decode a JWT token without verifying (for debugging only)
 * WARNING: Do not use for authentication - this does not verify the signature!
 * @param token JWT token string
 * @returns Decoded payload or null
 */
export const decodeJWTUnsafe = (token: string): any => {
  try {
    return jose.decodeJwt(token)
  } catch {
    return null
  }
}

export type { JWTPayload }
