import React from 'react'
import styles from './FormButton.module.css'

interface FormButtonProps {
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

const FormButton: React.FC<FormButtonProps> = ({
  type = 'button',
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  loading = false,
  children,
  className = '',
  icon
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {loading && (
        <span className={styles.spinner}>
          <i className="fa-solid fa-spinner fa-spin"></i>
        </span>
      )}
      {children}
    </button>
  )
}

export default FormButton
