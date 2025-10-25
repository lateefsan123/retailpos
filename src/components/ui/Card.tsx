import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  padding?: 'sm' | 'md' | 'lg'
  background?: 'white' | 'gray' | 'dark'
  hover?: boolean
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style = {},
  padding = 'md',
  background = 'white',
  hover = false
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '12px',
    transition: hover ? 'all 0.2s ease' : 'none',
    ...style
  }

  const backgroundStyles = {
    white: { background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: 'none' },
    gray: { background: 'var(--bg-container)', border: 'var(--border-subtle)', boxShadow: 'var(--shadow-card)' },
    dark: { 
      background: 'var(--bg-card)', 
      border: 'var(--border-primary)', 
      boxShadow: 'var(--shadow-card)'
    }
  }

  const paddingStyles = {
    sm: { padding: '12px' },
    md: { padding: '20px' },
    lg: { padding: '24px' }
  }

  const cardStyles: React.CSSProperties = {
    ...baseStyles,
    ...backgroundStyles[background],
    ...paddingStyles[padding]
  }

  return (
    <div
      className={className}
      style={cardStyles}
    >
      {children}
    </div>
  )
}

export { Card }
