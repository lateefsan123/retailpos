import React, { useState, useRef, useEffect } from 'react'
import styles from './ProductActionsDropdown.module.css'

interface ProductActionsDropdownProps {
  product: {
    product_id: string
    name: string
    barcode?: string | null
  }
  onPrintLabel: () => void
  onEdit: () => void
  onDelete: () => void
  canManageProducts: boolean
  onLilyMessage?: (message: string) => void
  onShowLilyMessage?: (show: boolean) => void
}

const ProductActionsDropdown: React.FC<ProductActionsDropdownProps> = ({
  product,
  onPrintLabel,
  onEdit,
  onDelete,
  canManageProducts,
  onLilyMessage,
  onShowLilyMessage
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  const handleMouseEnter = (message: string) => {
    if (onLilyMessage && onShowLilyMessage) {
      onLilyMessage(message)
      onShowLilyMessage(true)
    }
  }

  const handleMouseLeave = () => {
    if (onShowLilyMessage) {
      onShowLilyMessage(false)
    }
  }

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className={styles.triggerButton}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        onMouseEnter={() => handleMouseEnter(`Click to see actions for "${product.name}"`)}
        onMouseLeave={handleMouseLeave}
      >
        <i className="fa-solid fa-ellipsis-vertical"></i>
        <span className="sr-only">Open menu</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <button
            className={styles.dropdownItem}
            onClick={(e) => {
              e.stopPropagation()
              handleAction(onPrintLabel)
            }}
            onMouseEnter={() => handleMouseEnter(`Click to print a label for "${product.name}". This will open a print dialog with a formatted product label!`)}
            onMouseLeave={handleMouseLeave}
          >
            <i className="fa-solid fa-print" style={{ marginRight: '8px' }}></i>
            Print Label
          </button>

          <div className={styles.separator}></div>

          {canManageProducts && (
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation()
                handleAction(onEdit)
              }}
              onMouseEnter={() => handleMouseEnter(`Click to edit "${product.name}". You can update the price, stock quantity, reorder level, and other details!`)}
              onMouseLeave={handleMouseLeave}
            >
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '8px' }}></i>
              Edit Product
            </button>
          )}

          {canManageProducts && (
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation()
                handleAction(onDelete)
              }}
              onMouseEnter={() => handleMouseEnter(`Click to delete "${product.name}" from your inventory. This action cannot be undone.`)}
              onMouseLeave={handleMouseLeave}
            >
              <i className="fa-solid fa-trash-can" style={{ marginRight: '8px' }}></i>
              Delete Product
            </button>
          )}

          {product.barcode && (
            <>
              <div className={styles.separator}></div>
              <button
                className={styles.dropdownItem}
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(product.barcode!)
                  handleAction(() => {}) // Close dropdown without additional action
                }}
                onMouseEnter={() => handleMouseEnter(`Click to copy the barcode "${product.barcode}" to clipboard`)}
                onMouseLeave={handleMouseLeave}
              >
                <i className="fa-solid fa-copy" style={{ marginRight: '8px' }}></i>
                Copy Barcode
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductActionsDropdown
