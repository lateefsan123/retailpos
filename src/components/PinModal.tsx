import React, { useState, useEffect, useRef } from 'react'
import { usePin } from '../contexts/PinContext'

interface PinModalProps {
  isOpen: boolean
  onClose?: () => void
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { validatePin } = usePin()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const isValid = await validatePin(pin)
      if (isValid) {
        setPin('')
        if (onClose) onClose()
      } else {
        setError('Invalid PIN. Please try again.')
        setPin('')
      }
    } catch (error) {
      setError('Error validating PIN. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose()
        }
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center'
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#7d8d86',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '24px'
          }}>
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            Enter Access PIN
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            Please enter the PIN to access the system
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError('')
              }}
              placeholder="Enter PIN"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                textAlign: 'center',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                letterSpacing: '4px',
                fontFamily: 'monospace'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#7d8d86'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
              }}
              maxLength={10}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            style={{
              width: '100%',
              background: isSubmitting || pin.length < 4 ? '#d1d5db' : '#7d8d86',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting || pin.length < 4 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Validating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-unlock"></i>
                Access System
              </>
            )}
          </button>
        </form>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#374151'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </div>
    </div>
  )
}

export default PinModal
