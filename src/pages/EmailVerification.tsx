import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const EmailVerification: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    } else {
      setStatus('error')
      setMessage('Invalid verification link')
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus('verifying')
      setMessage('Verifying your email address...')

      // Check if token exists and is not expired
      const { data: tokenData, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('token', verificationToken)
        .eq('used', false)
        .single()

      if (tokenError || !tokenData) {
        setStatus('error')
        setMessage('Invalid or expired verification token')
        return
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      if (now > expiresAt) {
        setStatus('expired')
        setMessage('Verification token has expired. Please request a new one.')
        return
      }

      // Update user as verified and active
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          active: true,
          email_verification_token: null,
          verification_token_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', tokenData.user_id)

      if (updateError) {
        console.error('Error updating user:', updateError)
        setStatus('error')
        setMessage('Failed to verify email. Please try again.')
        return
      }

      // Mark token as used
      await supabase
        .from('email_verification_tokens')
        .update({ used: true })
        .eq('id', tokenData.id)

      setStatus('success')
      setMessage('Email verified successfully! You can now log in to your account.')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)

    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage('An error occurred during verification. Please try again.')
    }
  }

  const resendVerificationEmail = async () => {
    if (!token) return

    setIsResending(true)
    try {
      // Get user info from token
      const { data: tokenData, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('user_id, users(email, business_id, business_info(name))')
        .eq('token', token)
        .single()

      if (tokenError || !tokenData) {
        setMessage('Unable to resend verification email')
        return
      }

      // Generate new token
      const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Update user with new token
      await supabase
        .from('users')
        .update({
          email_verification_token: newToken,
          verification_token_expires: tokenExpires.toISOString()
        })
        .eq('user_id', tokenData.user_id)

      // Store new token
      await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: tokenData.user_id,
          token: newToken,
          expires_at: tokenExpires.toISOString()
        })

      // Mark old token as used
      await supabase
        .from('email_verification_tokens')
        .update({ used: true })
        .eq('token', token)

      setMessage('A new verification email has been sent to your email address.')
    } catch (error) {
      console.error('Error resending verification:', error)
      setMessage('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return '⏳'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'expired':
        return '⏰'
      default:
        return '❓'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return '#3b82f6'
      case 'success':
        return '#10b981'
      case 'error':
        return '#ef4444'
      case 'expired':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '20px'
        }}>
          {getStatusIcon()}
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '16px'
        }}>
          Email Verification
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          {message}
        </p>

        {status === 'verifying' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ color: '#6b7280' }}>Verifying...</span>
          </div>
        )}

        {status === 'success' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{
              color: '#166534',
              fontSize: '14px',
              margin: '0'
            }}>
              You will be redirected to the login page in a few seconds...
            </p>
          </div>
        )}

        {(status === 'error' || status === 'expired') && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{
              color: '#dc2626',
              fontSize: '14px',
              margin: '0 0 10px 0'
            }}>
              {status === 'expired' ? 'Your verification link has expired.' : 'There was an error verifying your email.'}
            </p>
            <button
              onClick={resendVerificationEmail}
              disabled={isResending}
              style={{
                background: isResending ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isResending ? 'not-allowed' : 'pointer'
              }}
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#f3f4f6',
              color: '#1a1a1a',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
          
          {status === 'success' && (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Continue to Login
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default EmailVerification
