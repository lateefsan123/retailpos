import React, { useState } from 'react'
import { Product } from '../../types/sales'
import styles from './StockAlertModal.module.css'

interface StockAlertModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  currentStock: number
  requestedQuantity: number
  onQuickRestock: (product: Product, newStock: number) => void
  onCancel: () => void
}

const StockAlertModal: React.FC<StockAlertModalProps> = ({
  isOpen,
  onClose,
  product,
  currentStock,
  requestedQuantity,
  onQuickRestock,
  onCancel
}) => {
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [isRestocking, setIsRestocking] = useState(false)

  if (!isOpen || !product) return null

  const handleQuickRestock = async () => {
    const stockAmount = parseFloat(newStock)
    if (isNaN(stockAmount) || stockAmount < 0) {
      alert('Please enter a valid stock amount')
      return
    }

    setIsRestocking(true)
    try {
      await onQuickRestock(product, stockAmount)
      onClose()
    } catch (error) {
      console.error('Error restocking:', error)
      alert('Failed to update stock. Please try again.')
    } finally {
      setIsRestocking(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onClose()
  }

  const canAddToOrder = parseFloat(newStock) >= requestedQuantity

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.iconContainer}>
              <i className={`fa-solid fa-exclamation-triangle ${styles.warningIcon}`}></i>
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.title}>
                Low Stock Alert
              </h2>
              <p className={styles.subtitle}>
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Alert Message */}
        <div className={styles.alertMessage}>
          <div className={styles.alertHeader}>
            <i className={`fa-solid fa-info-circle ${styles.infoIcon}`}></i>
            <span className={styles.alertTitle}>
              Insufficient Stock
            </span>
          </div>
          <div className={styles.alertText}>
            <p className={styles.alertParagraph}>
              Current stock: <span className={styles.strongText}>{currentStock}</span> units
            </p>
            <p className={styles.alertParagraph}>
              Requested quantity: <span className={styles.strongText}>{requestedQuantity}</span> units
            </p>
          </div>
        </div>

        {/* Quick Restock Section */}
        <div className={styles.restockSection}>
          <h3 className={styles.sectionTitle}>
            <i className={`fa-solid fa-boxes-stacked ${styles.boxesIcon}`}></i>
            Quick Restock
          </h3>
          
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              New Stock Quantity
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className={styles.stockInput}
            />
          </div>

          {canAddToOrder && (
            <div className={styles.successMessage}>
              <i className={`fa-solid fa-check-circle ${styles.checkIcon}`}></i>
              <span className={styles.successText}>
                Stock updated! You can now add this item to the order.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleQuickRestock}
            disabled={isRestocking || parseFloat(newStock) < 0}
            className={styles.updateButton}
          >
            {isRestocking ? 'Updating...' : 'Update Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StockAlertModal
