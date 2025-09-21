import React from 'react'

interface AdminCredentials {
  username: string
  password: string
  businessId: number
}

interface AdminCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  credentials: AdminCredentials
}

const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({ 
  isOpen, 
  onClose, 
  credentials 
}) => {
  if (!isOpen) return null

  const handleContinue = () => {
    onClose()
    // Redirect to dashboard after user acknowledges the credentials
    window.location.href = '/'
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      alert('Copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Copied to clipboard!')
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(125, 141, 134, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <i className="fa-solid fa-user-shield" style={{
              fontSize: '24px',
              color: 'white'
            }}></i>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            Admin Account Created
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#7d8d86',
            margin: 0
          }}>
            Your business admin account has been automatically created
          </p>
        </div>

        {/* Credentials Display */}
        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{
            marginBottom: '16px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'block'
            }}>
              Admin Username:
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <code style={{
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a',
                border: '1px solid #d1d5db',
                flex: 1,
                fontFamily: 'monospace'
              }}>
                {credentials.username}
              </code>
              <button
                onClick={() => copyToClipboard(credentials.username)}
                style={{
                  background: '#7d8d86',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title="Copy to clipboard"
              >
                <i className="fa-solid fa-copy"></i>
              </button>
            </div>
          </div>

          <div style={{
            marginBottom: '16px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'block'
            }}>
              Admin Password:
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <code style={{
                background: '#ffffff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a',
                border: '1px solid #d1d5db',
                flex: 1,
                fontFamily: 'monospace'
              }}>
                {credentials.password}
              </code>
              <button
                onClick={() => copyToClipboard(credentials.password)}
                style={{
                  background: '#7d8d86',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title="Copy to clipboard"
              >
                <i className="fa-solid fa-copy"></i>
              </button>
            </div>
          </div>

          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <i className="fa-solid fa-exclamation-triangle" style={{
                color: '#f59e0b',
                fontSize: '14px'
              }}></i>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#92400e'
              }}>
                Important:
              </span>
            </div>
            <p style={{
              fontSize: '13px',
              color: '#92400e',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Please save these credentials securely. You'll need them to access admin functions for your business. 
              The admin account has full system permissions.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleContinue}
            style={{
              background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-check"></i>
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminCredentialsModal
