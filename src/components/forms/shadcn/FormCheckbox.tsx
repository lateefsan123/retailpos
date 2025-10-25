import React from 'react'
import { Checkbox } from '../../ui/checkbox'
import { Label } from '../../ui/label'
import { cn } from '../../../lib/utils'

interface FormCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  error?: string
  disabled?: boolean
  className?: string
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  checked,
  onChange,
  required = false,
  error,
  disabled = false,
  className
}) => {
  const id = label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className={cn(
            error && "border-destructive",
            className
          )}
        />
        <Label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
