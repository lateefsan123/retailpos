import React from 'react'
import styles from './FormInput.module.css'

interface FormTextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  rows?: number
  className?: string
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  rows = 3,
  className = ''
}) => {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      <label className={styles.formLabel}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`${styles.formInput} ${styles.formTextarea} ${error ? styles.error : ''}`}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

export default FormTextarea
