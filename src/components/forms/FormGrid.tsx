import React from 'react'
import styles from './FormGrid.module.css'

interface FormGridProps {
  columns?: 1 | 2 | 3 | 4
  gap?: 'small' | 'medium' | 'large'
  children: React.ReactNode
  className?: string
}

const FormGrid: React.FC<FormGridProps> = ({
  columns = 2,
  gap = 'medium',
  children,
  className = ''
}) => {
  const gridClasses = [
    styles.grid,
    styles[`columns-${columns}`],
    styles[`gap-${gap}`],
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

export default FormGrid
