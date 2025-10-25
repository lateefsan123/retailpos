import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost'
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
      background: 'var(--primary-bg)',
      color: 'var(--primary-text)'
    },
    secondary: {
      background: 'var(--secondary-bg)',
      color: 'var(--secondary-text)',
      border: '1px solid var(--secondary-border)'
    },
    danger: {
      background: 'var(--danger-bg)',
      color: 'var(--danger-text)'
    },
    success: {
      background: 'var(--success-color)',
      color: '#ffffff'
    },
    outline: {
      background: 'transparent',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    ghost: {
      background: 'transparent',
      color: '#374151',
      border: 'none'
    }
  }

  const hoverStyles = {
    primary: { background: 'var(--primary-bg-hover)' },
    secondary: { background: 'var(--secondary-bg-hover)' },
    danger: { background: 'var(--danger-bg-hover)' },
    success: { background: '#059669' },
    outline: { background: '#f9fafb' },
    ghost: { background: '#f9fafb' }
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
