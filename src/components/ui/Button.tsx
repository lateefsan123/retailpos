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
      background: '#6b7280',
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
    danger: { background: '#4b5563' },
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
    >
      {children}
    </button>
  )
}

export { Button }
export type { ButtonProps }
