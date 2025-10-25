import React from 'react'
import { Button, ButtonProps } from '../../ui/Button'
import { cn } from '../../../lib/utils'

interface FormButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  loading?: boolean
  children: React.ReactNode
}

export const FormButton: React.FC<FormButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  className,
  ...props
}) => {
  // Map custom variants to shadcn variants
  const shadcnVariant = variant === 'primary' ? 'default' : variant

  return (
    <Button
      variant={shadcnVariant as any}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </Button>
  )
}
