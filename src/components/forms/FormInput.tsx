import React from 'react'
import styles from './FormInput.module.css'

interface FormInputProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  min?: number
  max?: number
  step?: number
  className?: string
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  min,
  max,
  step,
  className = ''
}) => {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label className={styles.formLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`${styles.formInput} ${error ? styles.error : ''}`}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

export default FormInput
