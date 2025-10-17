import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  maxWidth?: string
  background?: 'light' | 'dark'
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = '1400px',
  background = 'light'
}) => {
  const backgroundStyles = {
    light: {
      outer: '#f8fafc',
      inner: '#ffffff',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      border: 'none'
    },
    dark: {
      outer: '#1a1a1a',
      inner: 'var(--bg-container)',
      shadow: 'var(--shadow-card)',
      border: 'var(--border-primary)'
    }
  }

  const styles = backgroundStyles[background]

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: styles.outer,
      fontFamily: 'Poppins, sans-serif',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth,
        margin: '0 auto',
        background: styles.inner, 
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: styles.shadow,
        border: styles.border
      }}>
        {children}
      </div>
    </div>
  )
}

export default PageLayout
