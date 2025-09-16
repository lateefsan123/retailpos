import React from 'react'
import { Transaction } from '../../hooks/useTransactions'
import Button from '../ui/Button'

interface TransactionCardProps {
  transaction: Transaction
  onTransactionClick: (saleId: number) => void
  onDeleteTransaction: (saleId: number) => void
  onResolvePartialPayment?: (saleId: number) => void
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onTransactionClick,
  onDeleteTransaction,
  onResolvePartialPayment
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'fa-solid fa-money-bill'
      case 'card':
        return 'fa-solid fa-credit-card'
      case 'mobile_money':
        return 'fa-solid fa-mobile'
      default:
        return 'fa-solid fa-money-bill'
    }
  }

  return (
    <div 
      className="transaction-card"
      onClick={() => onTransactionClick(transaction.sale_id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: transaction.partial_payment ? '#f1f0e4' : '#ffffff',
        borderRadius: '8px',
        border: '3px solid #7d8d86',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        marginBottom: '12px'
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
        target.style.transform = 'translateY(-2px)'
        target.style.borderColor = '#7d8d86'
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.boxShadow = 'none'
        target.style.transform = 'translateY(0)'
        target.style.borderColor = '#7d8d86'
      }}
    >
      {/* Transaction ID */}
      <div style={{
        width: '60px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#7d8d86',
          background: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          #{transaction.sale_id.toString().slice(-6)}
        </div>
        {transaction.partial_payment && (
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            color: '#f1f0e4',
            background: '#7d8d86',
            padding: '2px 6px',
            borderRadius: '3px',
            marginTop: '4px',
            display: 'inline-block'
          }}>
            PARTIAL
          </div>
        )}
      </div>

      {/* Date & Time */}
      <div style={{
        minWidth: '140px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        {formatDate(transaction.datetime)}
      </div>

      {/* Customer */}
      <div style={{
        flex: 1,
        minWidth: '120px',
        fontSize: '14px',
        color: '#374151',
        fontWeight: '500'
      }}>
        {transaction.customer_name}
      </div>

      {/* Cashier */}
      <div style={{
        minWidth: '100px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        {transaction.cashier_name}
      </div>

      {/* Payment Method */}
      <div style={{
        minWidth: '120px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#374151'
      }}>
        <i className={getPaymentMethodIcon(transaction.payment_method)} style={{ color: '#7d8d86' }}></i>
        <span style={{ textTransform: 'capitalize' }}>
          {transaction.payment_method.replace('_', ' ')}
        </span>
      </div>

      {/* Total Amount */}
      <div style={{
        minWidth: '120px',
        textAlign: 'right',
        fontSize: '16px',
        fontWeight: '600',
        color: transaction.partial_payment ? '#7d8d86' : '#059669'
      }}>
        {transaction.partial_payment ? (
          <div>
            <div style={{ fontSize: '14px', color: '#7d8d86' }}>
              Paid: {formatCurrency(transaction.partial_amount || 0)}
            </div>
            <div style={{ fontSize: '12px', color: '#3e3f29' }}>
              Owed: {formatCurrency(transaction.remaining_amount || 0)}
            </div>
          </div>
        ) : (
          formatCurrency(transaction.total_amount)
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {transaction.partial_payment && onResolvePartialPayment && (
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onResolvePartialPayment(transaction.sale_id)
            }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: '10px' }}></i>
            Resolve
          </Button>
        )}
        
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteTransaction(transaction.sale_id)
          }}
        >
          <i className="fa-solid fa-trash" style={{ fontSize: '10px' }}></i>
          Delete
        </Button>
        
        <div style={{ color: '#7d8d86' }}>
          <i className="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    </div>
  )
}

export default TransactionCard
