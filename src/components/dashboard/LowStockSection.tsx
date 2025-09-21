import { useState } from 'react'
import { useLowStockItems } from '../../hooks/derived/useLowStockItems'
import LowStockCard from './LowStockCard'

const LowStockSection = () => {
  const { lowStockItems, loading, error, restockProduct, quickRestock } = useLowStockItems()
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentItem = lowStockItems[currentIndex] || null
  const hasNext = currentIndex < lowStockItems.length - 1
  const hasPrevious = currentIndex > 0

  const goToNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#7d8d86',
          fontSize: '16px'
        }}>
          <i className="fa-solid fa-spinner" style={{ 
            animation: 'spin 1s linear infinite',
            fontSize: '20px'
          }}></i>
          Loading low stock items...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ef4444'
        }}>
          <i className="fa-solid fa-exclamation-triangle" style={{
            fontSize: '24px',
            marginBottom: '8px'
          }}></i>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: lowStockItems.length > 0 ? '#fbbf24' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ 
              fontSize: '18px', 
              color: lowStockItems.length > 0 ? '#d97706' : '#059669'
            }}></i>
          </div>
          <div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#3e3f29', 
              margin: '0 0 4px 0' 
            }}>
              Low Stock Items
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#7d8d86', 
              margin: 0 
            }}>
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need{lowStockItems.length === 1 ? 's' : ''} restocking
            </p>
          </div>
        </div>

        {/* Navigation Controls */}
        {lowStockItems.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              style={{
                background: hasPrevious ? '#7d8d86' : '#e5e7eb',
                color: hasPrevious ? '#f1f0e4' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                cursor: hasPrevious ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (hasPrevious) {
                  e.currentTarget.style.background = '#bca88d'
                }
              }}
              onMouseLeave={(e) => {
                if (hasPrevious) {
                  e.currentTarget.style.background = '#7d8d86'
                }
              }}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            
            <span style={{
              fontSize: '12px',
              color: '#7d8d86',
              fontWeight: '500',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              {currentIndex + 1} / {lowStockItems.length}
            </span>
            
            <button
              onClick={goToNext}
              disabled={!hasNext}
              style={{
                background: hasNext ? '#7d8d86' : '#e5e7eb',
                color: hasNext ? '#f1f0e4' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                cursor: hasNext ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (hasNext) {
                  e.currentTarget.style.background = '#bca88d'
                }
              }}
              onMouseLeave={(e) => {
                if (hasNext) {
                  e.currentTarget.style.background = '#7d8d86'
                }
              }}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* Low Stock Item Display */}
      {lowStockItems.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#7d8d86' 
        }}>
          <i className="fa-solid fa-check-circle" style={{
            fontSize: '48px',
            marginBottom: '16px',
            color: '#10b981'
          }}></i>
          <p style={{ fontSize: '16px', margin: 0, fontWeight: '500' }}>
            All items are well stocked!
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.8 }}>
            No items need restocking at the moment.
          </p>
        </div>
      ) : currentItem ? (
        <LowStockCard
          key={currentItem.product_id}
          product={currentItem}
          onRestock={restockProduct}
          onQuickRestock={quickRestock}
        />
      ) : null}
    </div>
  )
}

export default LowStockSection
