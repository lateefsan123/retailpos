import React, { useMemo } from 'react'
import { Order, OrderItem, Product, SideBusinessItem } from '../../types/sales'

interface OrderSidebarProps {
  order: Order
  orderDetailNumber?: number
  customerName: string
  user: any
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onUpdateWeight: (itemId: string, newWeight: number) => void
  onRemoveFromOrder: (itemId: string) => void
  onShowWeightEditModal: (item: OrderItem) => void
  onSetCustomerName: (name: string) => void
  onShowSalesSummary: () => void
  onResetTransaction: () => void
  getCurrentDateTime: () => string
}

const OrderSidebar: React.FC<OrderSidebarProps> = ({
  order,
  orderDetailNumber,
  customerName,
  user,
  onUpdateQuantity,
  onUpdateWeight,
  onRemoveFromOrder,
  onShowWeightEditModal,
  onSetCustomerName,
  onShowSalesSummary,
  onResetTransaction,
  getCurrentDateTime
}) => {
  const displayOrderNumber = useMemo(() => orderDetailNumber ?? Math.floor(Math.random() * 10000000), [orderDetailNumber])

  return (
    <div style={{ 
      width: '400px', 
      background: '#ffffff', 
      margin: '20px 20px 20px 0', 
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* User Info Header */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              fontWeight: '500', 
              color: '#1f2937' 
            }}>
              Hello, {user?.username}
            </p>
          </div>
        </div>
        <p style={{ 
          margin: '0', 
          fontSize: '14px', 
          color: '#6b7280' 
        }}>
          {getCurrentDateTime()}
        </p>
      </div>

      {/* Order Details */}
      <div style={{ 
        flex: 1, 
        padding: '24px',
        overflowY: 'auto'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>
          Order Detail #{displayOrderNumber}
        </h3>

        {order.items.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280',
            padding: '40px 0'
          }}>
            <i className="fa-solid fa-shopping-cart" style={{ 
              fontSize: '48px', 
              marginBottom: '16px', 
              opacity: 0.5 
            }}></i>
            <p>No items in order</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items.map((item) => {
              const itemId = item.product?.product_id || `sb-${item.sideBusinessItem?.item_id}`
              const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
              const itemPrice = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
              const isSideBusiness = !!item.sideBusinessItem
              
              return (
                <OrderItemCard
                  key={itemId}
                  item={item}
                  itemId={itemId}
                  itemName={itemName}
                  itemPrice={itemPrice}
                  isSideBusiness={isSideBusiness}
                  onUpdateQuantity={onUpdateQuantity}
                  onUpdateWeight={onUpdateWeight}
                  onRemoveFromOrder={onRemoveFromOrder}
                  onShowWeightEditModal={onShowWeightEditModal}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div style={{ 
        padding: '24px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>
          Payment Detail
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '8px'
          }}>
            Customer Name (Optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onSetCustomerName(e.target.value)}
            placeholder="Enter customer name (optional)"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #6b7280',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '8px' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Sub Total</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
              €{order.subtotal.toFixed(2)}
            </span>
          </div>
          {order.discount > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px' 
            }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Discount</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                €{order.discount.toFixed(2)}
              </span>
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingTop: '8px',
            borderTop: '1px solid #d1d5db',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Total Payment</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#7d8d86' }}>
              €{order.total.toFixed(2)}
            </span>
          </div>
        </div>

        <button style={{
          background: '#f3f4f6',
          color: '#374151',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          width: '100%',
          marginBottom: '12px'
        }}>
          Add Voucher
        </button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={onResetTransaction}
            disabled={order.items.length === 0}
            title={order.items.length > 0 ? 'Clear all items from current transaction' : 'No items to reset'}
            style={{
              background: order.items.length === 0 ? '#f3f4f6' : '#ef4444',
              color: order.items.length === 0 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
              flex: 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-rotate-left" style={{ fontSize: '12px' }}></i>
            Reset
          </button>
          
          <button
            onClick={onShowSalesSummary}
            disabled={order.items.length === 0}
            title={order.items.length > 0 ? 'Press Ctrl+Enter to view sales summary' : 'Add items to process sale'}
            style={{
              background: order.items.length === 0 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
              flex: 2,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-credit-card" style={{ fontSize: '12px' }}></i>
            Purchase
            {order.items.length > 0 && (
              <span style={{ 
                fontSize: '10px', 
                opacity: 0.8,
                marginLeft: '2px'
              }}>
                (Ctrl+Enter)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Individual order item card component
const OrderItemCard: React.FC<{
  item: OrderItem
  itemId: string
  itemName: string
  itemPrice: number
  isSideBusiness: boolean
  onUpdateQuantity: (itemId: string, newQuantity: number) => void
  onUpdateWeight: (itemId: string, newWeight: number) => void
  onRemoveFromOrder: (itemId: string) => void
  onShowWeightEditModal: (item: OrderItem) => void
}> = ({ item, itemId, itemName, itemPrice, isSideBusiness, onUpdateQuantity, onUpdateWeight, onRemoveFromOrder, onShowWeightEditModal }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      background: isSideBusiness 
        ? 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
        : item.product?.image_url 
          ? `url(${item.product.image_url})` 
          : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {isSideBusiness && (
        <i className="fa-solid fa-briefcase" style={{ 
          fontSize: '16px', 
          color: '#9ca3af' 
        }}></i>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ 
        margin: '0 0 4px 0', 
        fontSize: '14px', 
        fontWeight: '500', 
        color: '#1f2937' 
      }}>
        {itemName.length > 20 
          ? itemName.substring(0, 20) + '...' 
          : itemName}
      </p>
      <p style={{ 
        margin: '0 0 2px 0', 
        fontSize: '14px', 
        color: '#7d8d86',
        fontWeight: '600'
      }}>
        {item.weight && item.calculatedPrice ? (
          <>
            {item.weight} {item.product?.weight_unit} • €{item.calculatedPrice.toFixed(2)}
          </>
        ) : (
          `€${itemPrice.toFixed(2)}`
        )}
      </p>
      {item.product?.barcode && (
        <p style={{ 
          margin: '0', 
          fontSize: '10px', 
          color: '#9ca3af',
          fontFamily: 'monospace',
          background: '#ffffff',
          padding: '1px 4px',
          borderRadius: '3px',
          border: '1px solid #e5e7eb',
          display: 'inline-block'
        }}>
          <i className="fa-solid fa-barcode" style={{ marginRight: '3px', fontSize: '7px' }}></i>
          {item.product.barcode}
        </p>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Show quantity controls for regular items */}
      {!item.weight && (
        <>
          <button
            onClick={() => onUpdateQuantity(itemId, item.quantity - 1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            -
          </button>
          <span style={{ 
            minWidth: '20px', 
            textAlign: 'center', 
            fontSize: '14px',
            fontWeight: '500',
            color: '#1f2937'
          }}>
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(itemId, item.quantity + 1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            +
          </button>
        </>
      )}
      
      {/* Show weight controls for weighted items */}
      {item.weight && (
        <>
          <button
            onClick={() => onUpdateWeight(itemId, item.weight! - 0.1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            -
          </button>
          <button
            onClick={() => onShowWeightEditModal(item)}
            style={{
              minWidth: '60px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid #7d8d86',
              background: '#f9fafb',
              color: '#7d8d86',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '500',
              padding: '0 4px'
            }}
            title="Click to edit weight"
          >
            {item.weight} {item.product?.weight_unit}
          </button>
          <button
            onClick={() => onUpdateWeight(itemId, item.weight! + 0.1)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}
          >
            +
          </button>
        </>
      )}
      
      <button
        onClick={() => onRemoveFromOrder(itemId)}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: 'none',
          background: '#ef4444',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          marginLeft: '4px'
        }}
      >
        <i className="fa-solid fa-trash"></i>
      </button>
    </div>
  </div>
)

export default OrderSidebar
