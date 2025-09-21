import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ProfessionalSignupForm from '../components/ProfessionalSignupForm'

const Login = () => {
  const [username, setUsername] = useState('')  // Changed from email to username
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!username || !password) {  // Changed from email to username
      setError('Please enter both username and password')  // Updated error message
      return
    }

    // Removed email validation completely

    const success = await login(username, password)  // Changed from email to username
    if (!success) {
      setError('Invalid username or password')  // Updated error message
    }
  }

  const handleProfessionalSignupSuccess = (message: string) => {
    setSuccessMessage(message)
    setIsRegisterMode(false)
  }

  const handleProfessionalSignupError = (error: string) => {
    setError(error)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      width: '100%', 
      display: 'flex',
      fontFamily: 'Quicksand, Comfortaa, sans-serif'
    }}>
      {/* Left Column - Login Form */}
      <div style={{
        flex: '0 0 45%',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{ 
          marginBottom: '40px',
          maxWidth: '320px',
          margin: '0 auto 40px auto'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#1a1a1a',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <i className="fa-solid fa-bolt" style={{ color: '#ffffff', fontSize: '20px' }}></i>
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#1a1a1a', 
            marginBottom: '8px',
            lineHeight: '1.2'
          }}>
            {isRegisterMode ? 'Create Your Business Account' : 'Welcome back!'}
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#6b7280', 
            margin: 0,
            lineHeight: '1.5'
          }}>
            {isRegisterMode 
              ? 'Set up your professional POS system with complete business information.' 
              : 'Your business, your team, your flow — all in one place.'
            }
          </p>
        </div>
        
        {/* Login Form or Professional Signup */}
        {isRegisterMode ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <ProfessionalSignupForm
              onSuccess={handleProfessionalSignupSuccess}
              onError={handleProfessionalSignupError}
            />
          </div>
        ) : (
          <form style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            maxWidth: '320px',
            margin: '0 auto',
            width: '100%'
          }} onSubmit={handleSubmit}>
          {/* Username Field */}
          <div>
            <label htmlFor="username" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '8px' 
            }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#1a1a1a',
                background: '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6'
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '8px' 
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: '#1a1a1a',
                  background: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  right: '12px', 
                  transform: 'translateY(-50%)', 
                  cursor: 'pointer' 
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                <i 
                  className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} 
                  style={{ color: '#6b7280', fontSize: '16px' }}
                ></i>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {successMessage}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              boxSizing: 'border-box'
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-spinner" style={{ 
                  color: '#ffffff', 
                  fontSize: '16px', 
                  marginRight: '8px', 
                  animation: 'spin 1s linear infinite' 
                }}></i>
                {isRegisterMode ? 'Creating Account...' : 'Signing in...'}
              </div>
            ) : (
              isRegisterMode ? 'Create Account' : 'Log In'
            )}
          </button>

          {/* Toggle between Login and Register */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegisterMode 
                ? 'Already have an account? Log in' 
                : "Don't have an account? Create one"
              }
            </button>
          </div>

          {/* Last Used Info */}
          {localStorage.getItem('pos_user') && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={async () => {
                  const storedUser = JSON.parse(localStorage.getItem('pos_user') || '{}')
                  const storedPassword = localStorage.getItem('lastPassword')
                  if (storedUser.username && storedPassword) {
                    const success = await login(storedUser.username, storedPassword)
                    if (!success) {
                      setError('Auto-login failed. Please enter credentials manually.')
                    }
                  } else {
                    setError('No stored credentials found.')
                  }
                }}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Last login: {localStorage.getItem('lastLogin') || 'Never'} (Click to auto-login)
              </button>
            </div>
          )}
          </form>
        )}

      </div>

      {/* Right Column - Background Image */}
        <div style={{
          flex: '0 0 50%',
          background: '#f8fafc',
          backgroundImage: 'url(/retailpos/images/backgrounds/login_bg.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
        
      </div>

    </div>
  )
}

export default Login