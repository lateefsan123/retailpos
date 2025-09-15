import React, { useState, useEffect } from 'react'
import { Order, PaymentInfo, PartialPayment } from '../../types/sales'
import PartialPaymentModal from './PartialPaymentModal'
import { usePartialPayment } from '../../hooks/usePartialPayment'

interface SalesSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  onProcessSale: (paymentInfo: PaymentInfo, partialPayment?: PartialPayment) => void
  order: Order
  user: any
}

const SalesSummaryModal: React.FC<SalesSummaryModalProps> = ({
  isOpen,
  onClose,
  onProcessSale,
  order,
  user
}) => {
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash')
  const [amountEntered, setAmountEntered] = useState('')
  const [change, setChange] = useState(0)
  const [receiptNotes, setReceiptNotes] = useState('')
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false)
  const [partialPayment, setPartialPayment] = useState<PartialPayment | null>(null)

  const {
    isPartialPaymentEnabled,
    amountPaid,
    amountRemaining,
    enablePartialPayment,
    disablePartialPayment,
    setPartialAmount,
    getPaymentSummary,
    resetPartialPayment
  } = usePartialPayment(order.total)

  // Auto-set amount entered to total when order changes
  useEffect(() => {
    setAmountEntered(order.total.toString())
  }, [order.total])

  // Calculate change for cash payments
  useEffect(() => {
    if (paymentMethod === 'cash') {
      const amount = parseFloat(amountEntered) || 0
      const totalToPay = isPartialPaymentEnabled ? amountPaid : order.total
      const calculatedChange = amount - totalToPay
      setChange(calculatedChange > 0 ? calculatedChange : 0)
    }
  }, [amountEntered, order.total, paymentMethod, isPartialPaymentEnabled, amountPaid])

  const handlePartialPaymentConfirm = (partial: PartialPayment) => {
    setPartialPayment(partial)
    setPartialAmount(partial.amountPaid)
    setAmountEntered(partial.amountPaid.toString())
  }

  const handleProcessSale = () => {
    const paymentInfo: PaymentInfo = {
      method: paymentMethod,
      amountEntered: isPartialPaymentEnabled ? amountPaid.toString() : amountEntered,
      change: paymentMethod === 'cash' ? change : 0,
      customerName,
      receiptNotes,
      allowPartialPayment: isPartialPaymentEnabled,
      partialAmount: isPartialPaymentEnabled ? amountPaid.toString() : undefined,
      remainingAmount: isPartialPaymentEnabled ? amountRemaining : undefined
    }

    onProcessSale(paymentInfo, partialPayment || undefined)
  }

  const canProcessPayment = () => {
    if (paymentMethod === 'cash') {
      const amount = parseFloat(amountEntered) || 0
      const totalToPay = isPartialPaymentEnabled ? amountPaid : order.total
      return amount >= totalToPay
    }
    return true
  }

  const getTotalToPay = () => {
    return isPartialPaymentEnabled ? amountPaid : order.total
  }

  if (!isOpen) return null

  return (
    <>
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
          padding: '20px',
          width: '95%',
          maxWidth: '700px',
          maxHeight: '95vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{ 
              margin: '0', 
              fontSize: '24px', 
              fontWeight: '600',
              color: '#1f2937'
            }}>
              <i className="fa-solid fa-receipt" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
              Sales Summary
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Customer Info */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 12px 0'
            }}>
              Customer Information
            </h3>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name (optional)"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #6b7280',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                marginBottom: '16px'
              }}
            />
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 12px 0'
            }}>
              Payment Method
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['cash', 'card', 'credit'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as 'cash' | 'card' | 'credit')}
                  style={{
                    background: paymentMethod === method ? '#7d8d86' : '#f3f4f6',
                    color: paymentMethod === method ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={`fa-solid fa-${method === 'cash' ? 'money-bill' : method === 'card' ? 'credit-card' : 'hand-holding-dollar'}`} style={{ marginRight: '6px' }}></i>
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0'
              }}>
                Payment Options
              </h3>
              <button
                onClick={() => {
                  if (isPartialPaymentEnabled) {
                    disablePartialPayment()
                    setPartialPayment(null)
                  } else {
                    setShowPartialPaymentModal(true)
                  }
                }}
                style={{
                  background: isPartialPaymentEnabled ? '#ef4444' : '#7d8d86',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid fa-${isPartialPaymentEnabled ? 'times' : 'credit-card'}`} style={{ fontSize: '12px' }}></i>
                {isPartialPaymentEnabled ? 'Disable Partial' : 'Enable Partial Payment'}
              </button>
            </div>

            {isPartialPaymentEnabled && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <i className="fa-solid fa-info-circle" style={{ color: '#f59e0b' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#92400e' }}>
                    Partial Payment Enabled
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#92400e' }}>
                  <div>Amount to pay now: <strong>€{amountPaid.toFixed(2)}</strong></div>
                  <div>Remaining amount: <strong>€{amountRemaining.toFixed(2)}</strong></div>
                  {partialPayment?.dueDate && (
                    <div>Due date: <strong>{new Date(partialPayment.dueDate).toLocaleDateString()}</strong></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount Entered */}
          {paymentMethod === 'cash' && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 12px 0'
              }}>
                Amount Received
              </h3>
              
              {/* Quick Amount Button */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => setAmountEntered(getTotalToPay().toFixed(2))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#f9fafb'}
                  onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = '#ffffff'}
                >
                  Set Exact Amount (€{getTotalToPay().toFixed(2)})
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                value={amountEntered}
                onChange={(e) => setAmountEntered(e.target.value)}
                placeholder={`Enter amount: €${getTotalToPay().toFixed(2)}`}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  margin: '0 auto',
                  display: 'block',
                  padding: '12px 16px',
                  border: '1px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '500',
                  outline: 'none',
                  background: '#ffffff',
                  textAlign: 'center'
                }}
              />
              
              {change > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  color: '#0c4a6e',
                  fontSize: '16px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  <i className="fa-solid fa-coins" style={{ marginRight: '8px' }}></i>
                  Change: €{change.toFixed(2)}
                </div>
              )}
              {amountEntered && parseFloat(amountEntered) < getTotalToPay() && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '16px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  Need €{(getTotalToPay() - parseFloat(amountEntered)).toFixed(2)} more
                </div>
              )}
            </div>
          )}

          {/* Receipt Notes */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 12px 0'
            }}>
              Receipt Notes (Optional)
            </h3>
            <textarea
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
              placeholder="Add notes for receipt (e.g., partial payment, special instructions, etc.)"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '60px',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              margin: '8px 0 0 0' 
            }}>
              These notes will appear on the printed receipt
            </p>
          </div>

          {/* Payment Summary */}
          <div style={{ 
            background: '#f9fafb',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Payment Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', color: '#6b7280' }}>Subtotal</span>
                <span style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                  €{order.subtotal.toFixed(2)}
                </span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', color: '#6b7280' }}>Discount</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                    €{order.discount.toFixed(2)}
                  </span>
                </div>
              )}
              {isPartialPaymentEnabled && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '16px', color: '#6b7280' }}>Amount to Pay Now</span>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#7d8d86' }}>
                      €{amountPaid.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '16px', color: '#6b7280' }}>Remaining Amount</span>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#ef4444' }}>
                      €{amountRemaining.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #d1d5db',
                marginTop: '8px'
              }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                  {isPartialPaymentEnabled ? 'Total Order' : 'Total'}
                </span>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#7d8d86' }}>
                  €{order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {/* View Receipt functionality */}}
                style={{
                  background: '#ffffff',
                  color: '#3e3f29',
                  border: '1px solid #3e3f29',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-eye"></i>
                View Receipt
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSale}
                disabled={!canProcessPayment()}
                style={{
                  background: !canProcessPayment() ? '#9ca3af' : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: !canProcessPayment() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: !canProcessPayment() ? 0.6 : 1
                }}
              >
                <i className="fa-solid fa-credit-card"></i>
                {isPartialPaymentEnabled ? 'Process Partial Payment' : 'Process Sale'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partial Payment Modal */}
      <PartialPaymentModal
        isOpen={showPartialPaymentModal}
        onClose={() => setShowPartialPaymentModal(false)}
        onConfirm={handlePartialPaymentConfirm}
        totalAmount={order.total}
        currentAmountPaid={amountPaid}
        currentAmountRemaining={amountRemaining}
        paymentMethod={paymentMethod}
      />
    </>
  )
}

export default SalesSummaryModal
