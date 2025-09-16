import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    const success = await login(username, password)
    if (!success) {
      setError('Invalid username or password')
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
          backgroundImage: 'url(/images/backgrounds/appbg3.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay to reduce brightness */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          zIndex: 0
        }}></div>
      </div>

      {/* Login Form */}
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
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '8px', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Login</h2>
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
                                placeholder="Enter your username"
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
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                              />
                </div>
              </div>

              {/* Last Used Info */}
              <div className="text-center">
                {localStorage.getItem('pos_user') ? (
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
                    className="text-sm text-blue-300 hover:text-blue-200 underline transition-colors duration-200 disabled:opacity-50"
                  >
                    Last login: {localStorage.getItem('lastLogin') || 'Never'} (Click to auto-login)
                  </button>
                ) : (
                  <p className="text-sm text-white/70">
                    Last login: Never
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <div>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{
                              width: '100%',
                              padding: '16px 24px',
                              background: 'white',
                              color: '#1a1a1a',
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
                          >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <i className="fa-solid fa-spinner" style={{ color: '#1a1a1a', fontSize: '18px', marginRight: '8px', animation: 'spin 1s linear infinite' }}></i>
                      Signing in...
                    </div>
                  ) : (
                    'Log in'
                  )}
                </button>
              </div>


            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
