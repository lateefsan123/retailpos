import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  padding?: 'sm' | 'md' | 'lg'
  background?: 'white' | 'gray'
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
    border: '1px solid #e5e7eb',
    transition: hover ? 'all 0.2s ease' : 'none',
    ...style
  }

  const backgroundStyles = {
    white: { background: '#ffffff' },
    gray: { background: '#f9fafb' }
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
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {children}
    </div>
  )
}

export default Card
