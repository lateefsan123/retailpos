import React from 'react'
import { cn } from '../../../lib/utils'

interface FormGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

export const FormGrid: React.FC<FormGridProps> = ({
  children,
  columns = 2,
  gap = 'medium',
  className
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  const gapSize = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6'
  }

  return (
    <div
      className={cn(
        'grid',
        gridCols[columns],
        gapSize[gap],
        className
      )}
    >
      {children}
    </div>
  )
}
