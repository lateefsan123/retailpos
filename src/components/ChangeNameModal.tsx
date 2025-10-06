import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface ChangeNameModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChangeNameModal: React.FC<ChangeNameModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth()
  const [newName, setNewName] = useState(user?.username || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newName.trim()) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: newName.trim() })
        .eq('user_id', user.user_id)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      await refreshUser()
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setNewName('')
      }, 1500)

    } catch (error) {
      console.error('Error updating username:', error)
      setError(error instanceof Error ? error.message : 'Failed to update username')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setSuccess(false)
    setNewName(user?.username || '')
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          transition: 'opacity 0.3s ease'
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#08080b',
          color: 'white',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h2 style={{
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            fontSize: '18px',
            letterSpacing: '0.1em',
            color: '#ffffff',
            margin: 0
          }}>
            CHANGE NAME
          </h2>
          <button
            onClick={handleClose}
            style={{
              color: 'white',
              fontFamily: 'Courier New, monospace',
              fontSize: '22px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#d1d5db'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'white'
            }}
          >
            [X]
          </button>
        </div>

        {/* Success/Error Messages */}
        {(success || error) && (
          <div style={{ marginBottom: '20px' }}>
            {success && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid #22c55e',
                color: '#4ade80',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '16px'
              }}>
                ✓ Username updated successfully!
              </div>
            )}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '16px'
              }}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#d1d5db',
              marginBottom: '10px',
              fontWeight: '500'
            }}>
              New Username
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new username"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#f3f4f6',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                backdropFilter: 'blur(8px)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7d8d86'
                e.target.style.boxShadow = '0 0 0 2px rgba(125, 141, 134, 0.4)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#e5e7eb',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '6px',
                background: isSubmitting || !newName.trim() ? '#6b7280' : '#7d8d86',
                color: 'black',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: isSubmitting || !newName.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && newName.trim()) {
                  e.currentTarget.style.background = '#90a297'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && newName.trim()) {
                  e.currentTarget.style.background = '#7d8d86'
                }
              }}
            >
              {isSubmitting ? 'Updating...' : 'Update Name'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default ChangeNameModal
