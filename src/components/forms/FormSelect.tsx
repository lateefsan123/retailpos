import React from 'react'
import styles from './FormInput.module.css'

interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = ''
}) => {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label className={styles.formLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`${styles.formInput} ${error ? styles.error : ''}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

export default FormSelect
