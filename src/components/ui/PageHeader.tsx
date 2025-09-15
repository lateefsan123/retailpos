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
      padding: '24px 32px', 
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb'
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
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            {icon && (
              <i className={icon} style={{ marginRight: '12px', color: '#7d8d86' }}></i>
            )}
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
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
