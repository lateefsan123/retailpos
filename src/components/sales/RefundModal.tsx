import React, { useState, useEffect } from 'react'
import { RefundRequest } from '../../types/multitenant'

interface TransactionItem {
  sale_item_id: number
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product_name?: string
  product_category?: string
  weight?: number
}

interface Transaction {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  customer_id?: number
  cashier_id?: number
  customer_name?: string
  cashier_name?: string
  partial_payment?: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
}

interface RefundItem {
  sale_item_id: number
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product_name?: string
  product_category?: string
  product_image?: string | null
  weight?: number
  weight_unit?: string
  price_per_unit?: number
  is_weighted?: boolean
  refund_quantity: number // How much of this item to refund
  restock: boolean // Whether to restock this item back to inventory
}

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (refundRequests: RefundRequest[]) => void
  transaction: Transaction
  items: TransactionItem[]
  businessId: number
  branchId: number
  currentUserId?: number
}

const REFUND_REASONS = [
  'Customer request',
  'Wrong item',
  'Defective item',
  'Damaged item',
  'Expired item',
  'Not as described',
  'Change of mind',
  'Duplicate purchase',
  'Other'
]

const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  items,
  businessId,
  branchId,
  currentUserId
}) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundItems, setRefundItems] = useState<RefundItem[]>([])
  const [refundAmount, setRefundAmount] = useState(transaction.total_amount.toString())
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'store_credit' | 'gift_card'>('cash')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize refund items from transaction items
  useEffect(() => {
    const initialRefundItems: RefundItem[] = items.map(item => ({
      ...item,
      refund_quantity: item.quantity,
      restock: true // Default to restock enabled
    }))
    setRefundItems(initialRefundItems)
  }, [items])

  // Calculate refund amount based on selected items and quantities
  useEffect(() => {
    if (refundType === 'full') {
      setRefundAmount(transaction.total_amount.toString())
      // Set all items to full refund
      setRefundItems(items.map(item => ({
        ...item,
        refund_quantity: item.quantity,
        restock: true
      })))
    } else {
      // Calculate amount for selected items with their refund quantities
      const selectedAmount = refundItems.reduce((total, item) => {
        if (item.refund_quantity > 0) {
          const pricePerUnit = item.is_weighted && item.weight && item.price_per_unit 
            ? item.price_per_unit 
            : item.unit_price
          return total + (pricePerUnit * item.refund_quantity)
        }
        return total
      }, 0)
      setRefundAmount(selectedAmount.toString())
    }
  }, [refundType, refundItems, transaction.total_amount, items])

  if (!isOpen) return null

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    setRefundItems(prevItems => 
      prevItems.map(item => 
        item.sale_item_id === itemId 
          ? { ...item, refund_quantity: Math.max(0, Math.min(newQuantity, item.quantity)) }
          : item
      )
    )
  }

  const handleItemToggle = (itemId: number) => {
    setRefundItems(prevItems => 
      prevItems.map(item => 
        item.sale_item_id === itemId 
          ? { ...item, refund_quantity: item.refund_quantity > 0 ? 0 : item.quantity }
          : item
      )
    )
  }

  const handleRestockToggle = (itemId: number) => {
    setRefundItems(prevItems => 
      prevItems.map(item => 
        item.sale_item_id === itemId 
          ? { ...item, restock: !item.restock }
          : item
      )
    )
  }

  const handleConfirm = () => {
    const amount = parseFloat(refundAmount)
    if (amount <= 0) {
      alert('Please enter a valid refund amount')
      return
    }

    if (refundType === 'partial' && refundItems.every(item => item.refund_quantity === 0)) {
      alert('Please select items to refund')
      return
    }

    if (!reason.trim()) {
      alert('Please select a reason for the refund')
      return
    }

    // Create refund requests for each item with refund quantity > 0
    const refundRequests: RefundRequest[] = refundItems
      .filter(item => item.refund_quantity > 0)
      .map(item => ({
        original_sale_id: transaction.sale_id,
        sale_item_id: item.sale_item_id,
        customer_id: transaction.customer_id,
        cashier_id: currentUserId,
        refund_amount: item.is_weighted && item.weight && item.price_per_unit 
          ? item.price_per_unit * item.refund_quantity
          : item.unit_price * item.refund_quantity,
        refund_method: refundMethod,
        reason: reason,
        notes: notes.trim() || undefined,
        quantity_refunded: item.refund_quantity,
        restock: item.restock,
        business_id: businessId,
        branch_id: branchId
      }))

    onConfirm(refundRequests)
    onClose()
  }

  const canProcessRefund = () => {
    const amount = parseFloat(refundAmount)
    return amount > 0 && amount <= transaction.total_amount && reason.trim() !== ''
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        width: '95%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ 
            margin: '0', 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#1f2937'
          }}>
            <i className="fa-solid fa-undo" style={{ marginRight: '12px', color: '#ef4444' }}></i>
            Process Refund
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Transaction Info */}
        <div style={{ 
          background: '#f9fafb', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px' 
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Transaction #{transaction.sale_id}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
            Total Amount: €{transaction.total_amount.toFixed(2)} | 
            Date: {new Date(transaction.datetime).toLocaleDateString()} | 
            Payment: {transaction.payment_method}
          </p>
        </div>

        {/* Refund Type Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Refund Type
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setRefundType('full')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: refundType === 'full' ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                background: refundType === 'full' ? '#fef2f2' : '#ffffff',
                color: refundType === 'full' ? '#dc2626' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-receipt" style={{ marginRight: '8px' }}></i>
              Full Refund
            </button>
            <button
              onClick={() => setRefundType('partial')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: refundType === 'partial' ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                background: refundType === 'partial' ? '#fef2f2' : '#ffffff',
                color: refundType === 'partial' ? '#dc2626' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-list-check" style={{ marginRight: '8px' }}></i>
              Partial Refund
            </button>
          </div>
        </div>

        {/* Item Selection (for partial refunds) */}
        {refundType === 'partial' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Select Items and Quantities to Refund
            </label>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px' 
            }}>
              {refundItems.map((item) => {
                const isSelected = item.refund_quantity > 0
                return (
                  <div
                    key={item.sale_item_id}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f3f4f6',
                      background: isSelected ? '#fef2f2' : '#ffffff',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Product Image */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        background: item.product_image 
                          ? `url(${item.product_image})` 
                          : item.is_weighted ? '#f59e0b' : '#7d8d86',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '2px solid rgba(125, 141, 134, 0.2)',
                        flexShrink: 0
                      }}>
                        {!item.product_image && (
                          <>
                            {item.is_weighted && item.weight ? `${item.weight}${item.weight_unit}` : item.quantity}
                            {item.is_weighted && (
                              <div style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: '#f59e0b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: '#ffffff'
                              }}>
                                ⚖️
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Product Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                          {item.product_name || `Product ${item.product_id}`}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          {item.is_weighted && item.weight && item.price_per_unit && item.weight_unit
                            ? `${item.weight} ${item.weight_unit} × €${item.price_per_unit.toFixed(2)}/${item.weight_unit} = €${item.total_price.toFixed(2)}`
                            : `${item.quantity} × €${item.unit_price.toFixed(2)} = €${item.total_price.toFixed(2)}`
                          }
                        </div>
                        
                        {/* Quantity Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', color: '#374151', minWidth: '60px' }}>
                            Refund:
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleQuantityChange(item.sale_item_id, item.refund_quantity - 1)}
                              disabled={item.refund_quantity <= 0}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '2px solid #e5e7eb',
                                background: item.refund_quantity <= 0 ? '#f9fafb' : '#ffffff',
                                color: item.refund_quantity <= 0 ? '#9ca3af' : '#374151',
                                cursor: item.refund_quantity <= 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.refund_quantity}
                              onChange={(e) => handleQuantityChange(item.sale_item_id, parseInt(e.target.value) || 0)}
                              style={{
                                width: '60px',
                                padding: '6px 8px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}
                            />
                            <button
                              onClick={() => handleQuantityChange(item.sale_item_id, item.refund_quantity + 1)}
                              disabled={item.refund_quantity >= item.quantity}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '2px solid #e5e7eb',
                                background: item.refund_quantity >= item.quantity ? '#f9fafb' : '#ffffff',
                                color: item.refund_quantity >= item.quantity ? '#9ca3af' : '#374151',
                                cursor: item.refund_quantity >= item.quantity ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleItemToggle(item.sale_item_id)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: isSelected ? '#ef4444' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#374151',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            {isSelected ? 'Remove' : 'Add All'}
                          </button>
                        </div>
                        
                        {/* Restock Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <label style={{
                            fontSize: '14px',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <input
                              type="checkbox"
                              checked={item.restock}
                              onChange={() => handleRestockToggle(item.sale_item_id)}
                              style={{
                                width: '16px',
                                height: '16px',
                                accentColor: '#10b981'
                              }}
                            />
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                              Restock to inventory
                            </span>
                          </label>
                          {!item.restock && (
                            <span style={{
                              fontSize: '11px',
                              color: '#f59e0b',
                              fontStyle: 'italic'
                            }}>
                              (Item will not be restocked)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Refund Amount */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Refund Amount (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={transaction.total_amount}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              background: refundType === 'full' ? '#f9fafb' : '#ffffff',
              color: refundType === 'full' ? '#6b7280' : '#374151'
            }}
            disabled={refundType === 'full'}
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Maximum refund: €{transaction.total_amount.toFixed(2)}
          </p>
        </div>

        {/* Refund Method */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Refund Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { key: 'cash', label: 'Cash', icon: 'fa-money-bill' },
              { key: 'card', label: 'Card', icon: 'fa-credit-card' },
              { key: 'store_credit', label: 'Store Credit', icon: 'fa-gift' },
              { key: 'gift_card', label: 'Gift Card', icon: 'fa-credit-card' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setRefundMethod(key as any)}
                style={{
                  padding: '12px 16px',
                  border: refundMethod === key ? '2px solid #ef4444' : '2px solid #e5e7eb',
                  borderRadius: '8px',
                  background: refundMethod === key ? '#fef2f2' : '#ffffff',
                  color: refundMethod === key ? '#dc2626' : '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <i className={`fa-solid ${icon}`}></i>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Reason for Refund *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              background: '#ffffff'
            }}
          >
            <option value="">Select a reason...</option>
            {REFUND_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional details about this refund..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#374151',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canProcessRefund()}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: canProcessRefund() ? '#ef4444' : '#d1d5db',
              color: canProcessRefund() ? '#ffffff' : '#9ca3af',
              fontSize: '16px',
              fontWeight: '600',
              cursor: canProcessRefund() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-undo" style={{ marginRight: '8px' }}></i>
            Process Refund (€{parseFloat(refundAmount).toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  )
}

export default RefundModal
