import React from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
  className = ''
}) => {
  return (
    <div className={`${styles.pageHeader} ${className}`}>
      <div className={styles.headerContent}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {children && (
        <div className={styles.headerActions}>
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader
