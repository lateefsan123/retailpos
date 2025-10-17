import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: string
  children?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  children
}) => {
  return (
    <div style={{ 
      padding: '32px', 
      borderBottom: 'var(--border-subtle)',
      background: 'var(--bg-container)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: children ? '16px' : '0'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            {icon && (
              <i className={icon} style={{ marginRight: '12px', color: 'var(--text-secondary)' }}></i>
            )}
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: '0'
            }}>
              {subtitle}
            </p>
          )}
        </div>
        
        {children}
      </div>
    </div>
  )
}

export default PageHeader
