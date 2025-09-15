import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { hashPassword, generateUserId } from '../utils/auth'

const Signup = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        setError('Username already exists')
        setLoading(false)
        return
      }

      // Create new business owner user
      const userId = generateUserId()
      const passwordHash = hashPassword(password)
      
      const userData: any = {
        user_id: userId,
        username,
        password_hash: passwordHash, // Hash the password
        active: true,
        icon: 'ryu' // Default icon
      }

      // Set role based on your schema enum values
      userData.role = 'Owner' // Business signup creates Owner role

      // Note: email and provider fields don't exist in users table schema

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (error) {
        console.error('Signup error:', error)
        setError(`Failed to create account: ${error.message || 'Please try again.'}`)
      } else {
        setSuccess('Account created successfully! Redirecting to login...')
        setUsername('')
        setPassword('')
        setConfirmPassword('')
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (error) {
      console.error('Signup error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div style={{ minHeight: '100vh', height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Custom Background Image */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/images/backgrounds/minimal.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Optional overlay for better text readability */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.2)' }}></div>
      </div>

      {/* Signup Form */}
      <div style={{ position: 'relative', zIndex: 10, height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {/* Glassmorphism Card */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            padding: '40px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
              {/* Logo */}
              <div style={{ marginBottom: '20px' }}>
                <img 
                  src="/images/backgrounds/logo1.png" 
                  alt="Company Logo" 
                  style={{
                    width: '200px',
                    height: 'auto'
                  }}
                />
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '8px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Sign Up</h2>
            </div>
        
            <form style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 }} onSubmit={handleSubmit}>
              {/* Username Field */}
              <div>
                <label htmlFor="username" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'white', marginBottom: '8px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}>
                    <i className="fa-solid fa-user" style={{ color: 'white', fontSize: '20px' }}></i>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      fontSize: '16px',
                      padding: '12px 40px 12px 0',
                      width: '100%',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.8)'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)'}
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'white', marginBottom: '8px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}>
                    <i className="fa-solid fa-lock" style={{ color: 'white', fontSize: '20px' }}></i>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      fontSize: '16px',
                      padding: '12px 40px 12px 0',
                      width: '100%',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.8)'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'white', marginBottom: '8px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}>
                    <i className="fa-solid fa-lock" style={{ color: 'white', fontSize: '20px' }}></i>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      fontSize: '16px',
                      padding: '12px 40px 12px 0',
                      width: '100%',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.8)'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.4)'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500/30 text-green-100 px-4 py-3 rounded-lg backdrop-blur-sm">
                  {success}
                </div>
              )}

              {/* Signup Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'white',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = '#f9fafb'
                      e.target.style.transform = 'translateY(-1px)'
                      e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = 'white'
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <i className="fa-solid fa-spinner" style={{ color: '#374151', fontSize: '18px', marginRight: '8px', animation: 'spin 1s linear infinite' }}></i>
                      Creating account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>


              {/* Login Link */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <p style={{ color: 'white', fontSize: '14px' }}>
                  Already have an account?{' '}
                  <a 
                    href="/login" 
                    style={{ 
                      color: '#60a5fa', 
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Sign in
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
