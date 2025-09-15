import React, { useState } from 'react'
import { PartialPayment } from '../../types/sales'

interface PartialPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (partialPayment: PartialPayment) => void
  totalAmount: number
  currentAmountPaid: number
  currentAmountRemaining: number
  paymentMethod: 'cash' | 'card' | 'credit'
}

const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  currentAmountPaid,
  currentAmountRemaining,
  paymentMethod
}) => {
  const [amountPaid, setAmountPaid] = useState(currentAmountPaid.toString())
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethod)

  if (!isOpen) return null

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    if (numValue >= 0 && numValue <= totalAmount) {
      setAmountPaid(value)
    }
  }

  const handleConfirm = () => {
    const paidAmount = parseFloat(amountPaid) || 0
    const remainingAmount = totalAmount - paidAmount

    const partialPayment: PartialPayment = {
      isEnabled: true,
      amountPaid: paidAmount,
      amountRemaining: remainingAmount,
      paymentDate: new Date().toISOString(),
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      paymentMethod: selectedPaymentMethod
    }

    onConfirm(partialPayment)
    onClose()
  }

  const remainingAmount = totalAmount - (parseFloat(amountPaid) || 0)

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
        maxWidth: '500px',
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
            <i className="fa-solid fa-credit-card" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
            Partial Payment
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

        {/* Payment Summary */}
        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', color: '#6b7280' }}>Total Amount:</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              €{totalAmount.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', color: '#6b7280' }}>Amount to Pay Now:</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#7d8d86' }}>
              €{(parseFloat(amountPaid) || 0).toFixed(2)}
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Remaining:</span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: remainingAmount > 0 ? '#ef4444' : '#10b981'
            }}>
              €{remainingAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Amount to Pay Now (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={totalAmount}
            value={amountPaid}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
            onBlur={(e) => e.target.style.borderColor = '#6b7280'}
            placeholder={`Enter amount (max €${totalAmount.toFixed(2)})`}
          />
        </div>

        {/* Quick Amount Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Quick Amounts
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[totalAmount * 0.25, totalAmount * 0.5, totalAmount * 0.75, totalAmount].map((amount, index) => (
              <button
                key={index}
                onClick={() => setAmountPaid(amount.toFixed(2))}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                }}
              >
                {index === 3 ? 'Full' : `${(amount / totalAmount * 100).toFixed(0)}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Payment Method
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['cash', 'card', 'credit'].map(method => (
              <button
                key={method}
                onClick={() => setSelectedPaymentMethod(method as 'cash' | 'card' | 'credit')}
                style={{
                  background: selectedPaymentMethod === method ? '#7d8d86' : '#f3f4f6',
                  color: selectedPaymentMethod === method ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                  flex: 1
                }}
              >
                <i className={`fa-solid fa-${method === 'cash' ? 'money-bill' : method === 'card' ? 'credit-card' : 'hand-holding-dollar'}`} style={{ marginRight: '6px' }}></i>
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Due Date (Optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
            onBlur={(e) => e.target.style.borderColor = '#6b7280'}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this partial payment..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
            onBlur={(e) => e.target.style.borderColor = '#6b7280'}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={parseFloat(amountPaid) <= 0}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: parseFloat(amountPaid) <= 0 ? '#9ca3af' : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: parseFloat(amountPaid) <= 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: parseFloat(amountPaid) <= 0 ? 0.6 : 1
            }}
          >
            <i className="fa-solid fa-check" style={{ marginRight: '8px' }}></i>
            Confirm Partial Payment
          </button>
        </div>
      </div>
    </div>
  )
}

export default PartialPaymentModal
