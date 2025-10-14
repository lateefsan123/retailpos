import React from 'react'
import styles from './FormInput.module.css'

interface FormCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`${styles.checkboxGroup} ${className}`}>
      <input
        type="checkbox"
        id={`checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={styles.checkboxInput}
      />
      <label 
        htmlFor={`checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`}
        className={styles.checkboxLabel}
      >
        {label}
      </label>
    </div>
  )
}

export default FormCheckbox
