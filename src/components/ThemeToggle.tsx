import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'button' | 'icon' | 'switch'
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  showLabel = false, 
  variant = 'button' 
}) => {
  const { theme, toggleTheme } = useTheme()

  const sizeClasses = {
    sm: { icon: '16px', padding: '6px 8px', fontSize: '12px' },
    md: { icon: '18px', padding: '8px 12px', fontSize: '14px' },
    lg: { icon: '20px', padding: '10px 16px', fontSize: '16px' }
  }

  const currentSize = sizeClasses[size]

  if (variant === 'switch') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i 
          className="fa-solid fa-sun" 
          style={{ 
            fontSize: currentSize.icon, 
            color: theme === 'light' ? '#f59e0b' : '#9ca3af',
            transition: 'color 0.3s ease'
          }} 
        />
        <label style={{ 
          position: 'relative', 
          display: 'inline-block', 
          width: '48px', 
          height: '24px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#d1d5db',
            borderRadius: '24px',
            transition: 'background-color 0.3s ease',
            '&:before': {
              position: 'absolute',
              content: '""',
              height: '18px',
              width: '18px',
              left: '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'transform 0.3s ease',
              transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)'
            }
          }}>
            <span style={{
              position: 'absolute',
              height: '18px',
              width: '18px',
              left: '3px',
              bottom: '3px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'transform 0.3s ease',
              transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </span>
        </label>
        <i 
          className="fa-solid fa-moon" 
          style={{ 
            fontSize: currentSize.icon, 
            color: theme === 'dark' ? '#3b82f6' : '#9ca3af',
            transition: 'color 0.3s ease'
          }} 
        />
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          color: theme === 'light' ? '#1a1a1a' : '#f1f0e4'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme === 'light' ? '#f3f4f6' : '#374151'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        <i 
          className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} 
          style={{ 
            fontSize: currentSize.icon,
            transition: 'all 0.3s ease'
          }} 
        />
      </button>
    )
  }

  // Default button variant
  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'light' ? '#ffffff' : '#1a1a1a',
        border: `2px solid ${theme === 'light' ? '#d1d5db' : '#374151'}`,
        borderRadius: '8px',
        padding: currentSize.padding,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        color: theme === 'light' ? '#1a1a1a' : '#f1f0e4',
        fontSize: currentSize.fontSize,
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <i 
        className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} 
        style={{ 
          fontSize: currentSize.icon,
          transition: 'all 0.3s ease'
        }} 
      />
      {showLabel && (
        <span>
          {theme === 'light' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  )
}

export default ThemeToggle
