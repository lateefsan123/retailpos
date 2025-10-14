import React from 'react'
import styles from './FormModal.module.css'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = ''
}) => {
  if (!isOpen) return null

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`}>
      <div className={`${styles.modal} ${className}`}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.formContent}>
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className={styles.modalFooter}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default FormModal
