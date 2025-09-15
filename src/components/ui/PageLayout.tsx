import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  maxWidth?: string
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = '1400px'
}) => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      fontFamily: 'Poppins, sans-serif',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth,
        margin: '0 auto',
        background: '#ffffff', 
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        {children}
      </div>
    </div>
  )
}

export default PageLayout
