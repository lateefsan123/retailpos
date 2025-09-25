import { useState } from 'react'
import { LowStockProduct } from '../../hooks/derived/useLowStockItems'

interface LowStockCardProps {
  product: LowStockProduct
  onRestock: (productId: string, quantity: number) => Promise<boolean>
  onQuickRestock: (productId: string) => Promise<boolean>
}

const LowStockCard = ({ product, onRestock, onQuickRestock }: LowStockCardProps) => {
  const [showRestockForm, setShowRestockForm] = useState(false)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [isRestocking, setIsRestocking] = useState(false)

  const handleQuickRestock = async () => {
    setIsRestocking(true)
    const success = await onQuickRestock(product.product_id)
    setIsRestocking(false)
    if (success) {
      setShowRestockForm(false)
    }
  }

  const handleCustomRestock = async () => {
    const quantity = parseInt(restockQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      return
    }

    setIsRestocking(true)
    const success = await onRestock(product.product_id, quantity)
    setIsRestocking(false)
    if (success) {
      setShowRestockForm(false)
      setRestockQuantity('')
    }
  }

  const getStockStatusColor = () => {
    if (product.stock_quantity <= 2) return '#ef4444' // Red
    if (product.stock_quantity <= 5) return '#f59e0b' // Orange
    return '#eab308' // Yellow
  }

  const getStockStatusText = () => {
    if (product.stock_quantity <= 2) return 'Critical'
    if (product.stock_quantity <= 5) return 'Low'
    return 'Below Reorder'
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(125, 141, 134, 0.2)',
      boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(62, 63, 41, 0.15)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(62, 63, 41, 0.1)'
    }}
    >
      {/* Stock Status Badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: getStockStatusColor(),
        color: 'white',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {getStockStatusText()}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Product Image */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '8px',
          background: '#f9fafb',
          border: '1px solid rgba(125, 141, 134, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                (e.currentTarget as HTMLImageElement).style.setProperty('display', 'none')
                (e.currentTarget.nextElementSibling as HTMLElement)!.style.setProperty('display', 'flex')
              }}
            />
          ) : null}
          <div style={{
            display: product.image_url ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: '#7d8d86',
            fontSize: '20px'
          }}>
            <i className="fa-solid fa-box"></i>
          </div>
        </div>

        {/* Product Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#3e3f29',
            margin: '0 0 4px 0',
            lineHeight: '1.3'
          }}>
            {product.name}
          </h4>
          
          <p style={{
            fontSize: '12px',
            color: '#7d8d86',
            margin: '0 0 8px 0'
          }}>
            {product.category}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{
              fontSize: '12px',
              color: '#3e3f29',
              fontWeight: '500'
            }}>
              Stock: {product.stock_quantity}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#7d8d86'
            }}>
              •
            </span>
            <span style={{
              fontSize: '12px',
              color: '#7d8d86'
            }}>
              Reorder at: {product.reorder_level}
            </span>
          </div>

          {/* Restock Actions */}
          {!showRestockForm ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleQuickRestock}
                disabled={isRestocking}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: isRestocking ? 'not-allowed' : 'pointer',
                  opacity: isRestocking ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  if (!isRestocking) {
                    e.currentTarget.style.background = '#059669'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRestocking) {
                    e.currentTarget.style.background = '#10b981'
                  }
                }}
              >
                {isRestocking ? (
                  <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                ) : (
                  <i className="fa-solid fa-bolt"></i>
                )}
                Quick Restock (+30)
              </button>
              
              <button
                onClick={() => setShowRestockForm(true)}
                disabled={isRestocking}
                style={{
                  background: 'transparent',
                  color: '#7d8d86',
                  border: '1px solid #7d8d86',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: isRestocking ? 'not-allowed' : 'pointer',
                  opacity: isRestocking ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isRestocking) {
                    e.currentTarget.style.background = '#7d8d86'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRestocking) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#7d8d86'
                  }
                }}
              >
                Custom
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder="Qty"
                min="1"
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  border: '1px solid #7d8d86',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCustomRestock}
                disabled={isRestocking || !restockQuantity}
                style={{
                  background: '#7d8d86',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: (isRestocking || !restockQuantity) ? 'not-allowed' : 'pointer',
                  opacity: (isRestocking || !restockQuantity) ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isRestocking && restockQuantity) {
                    e.currentTarget.style.background = '#bca88d'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRestocking && restockQuantity) {
                    e.currentTarget.style.background = '#7d8d86'
                  }
                }}
              >
                {isRestocking ? (
                  <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                ) : (
                  'Restock'
                )}
              </button>
              <button
                onClick={() => {
                  setShowRestockForm(false)
                  setRestockQuantity('')
                }}
                disabled={isRestocking}
                style={{
                  background: 'transparent',
                  color: '#7d8d86',
                  border: 'none',
                  fontSize: '12px',
                  cursor: isRestocking ? 'not-allowed' : 'pointer',
                  opacity: isRestocking ? 0.7 : 1
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LowStockCard
