import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  style = {}
}) => {
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '500',
    ...style
  }

  const variantStyles = {
    primary: {
      background: '#7d8d86',
      color: '#ffffff'
    },
    secondary: {
      background: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    danger: {
      background: '#ef4444',
      color: '#ffffff'
    },
    success: {
      background: '#10b981',
      color: '#ffffff'
    }
  }

  const hoverStyles = {
    primary: { background: '#6a7a73' },
    secondary: { background: '#e5e7eb' },
    danger: { background: '#dc2626' },
    success: { background: '#059669' }
  }

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' }
  }

  const buttonStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    opacity: disabled ? 0.6 : 1
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={buttonStyles}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, hoverStyles[variant])
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, variantStyles[variant])
        }
      }}
    >
      {children}
    </button>
  )
}

export default Button
