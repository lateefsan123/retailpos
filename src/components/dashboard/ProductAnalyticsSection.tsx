import { useState } from 'react'
import { useProductAnalytics, ProductAnalytics } from '../../hooks/useProductAnalytics'

type TimePeriod = 'today' | 'week' | 'month'

const ProductAnalyticsSection = () => {
  const { todayProducts, weekProducts, monthProducts, loading, error } = useProductAnalytics()
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('today')

  const getProductsForPeriod = (period: TimePeriod): ProductAnalytics[] => {
    switch (period) {
      case 'today': return todayProducts
      case 'week': return weekProducts
      case 'month': return monthProducts
      default: return []
    }
  }

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      default: return ''
    }
  }

  const getPeriodIcon = (period: TimePeriod): string => {
    switch (period) {
      case 'today': return 'fa-solid fa-calendar-day'
      case 'week': return 'fa-solid fa-calendar-week'
      case 'month': return 'fa-solid fa-calendar'
      default: return 'fa-solid fa-chart-line'
    }
  }

  const periods: TimePeriod[] = ['today', 'week', 'month']
  const currentProducts = getProductsForPeriod(activePeriod)

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        minHeight: '400px',
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
          Loading product analytics...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        minHeight: '400px',
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
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
      border: '1px solid rgba(125, 141, 134, 0.2)'
    }}>
      {/* Header with Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#bca88d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-chart-line" style={{ fontSize: '18px', color: '#3e3f29' }}></i>
          </div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#3e3f29', 
            margin: 0 
          }}>
            Top Products
          </h3>
        </div>

        {/* Period Tabs */}
        <div style={{
          display: 'flex',
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '4px',
          gap: '4px'
        }}>
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activePeriod === period ? '#7d8d86' : 'transparent',
                color: activePeriod === period ? '#f1f0e4' : '#7d8d86',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (activePeriod !== period) {
                  e.currentTarget.style.background = '#e5e7eb'
                  e.currentTarget.style.color = '#3e3f29'
                }
              }}
              onMouseLeave={(e) => {
                if (activePeriod !== period) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#7d8d86'
                }
              }}
            >
              <i className={getPeriodIcon(period)} style={{ fontSize: '12px' }}></i>
              {getPeriodLabel(period)}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {currentProducts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#7d8d86' 
        }}>
          <i className="fa-solid fa-chart-line" style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}></i>
          <p style={{ fontSize: '16px', margin: 0, fontWeight: '500' }}>
            No sales data for {getPeriodLabel(activePeriod).toLowerCase()}
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.8 }}>
            Check back later for product performance insights.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentProducts.map((product, index) => (
            <div 
              key={product.product_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid rgba(125, 141, 134, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(62, 63, 41, 0.1)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Rank Badge */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: index === 0 ? '#fbbf24' : index === 1 ? '#e5e7eb' : index === 2 ? '#f59e0b' : '#7d8d86',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: index === 0 ? '#d97706' : index === 1 ? '#6b7280' : index === 2 ? '#d97706' : '#f1f0e4',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {index === 0 ? <i className="fa-solid fa-crown" style={{ fontSize: '14px' }}></i> : index + 1}
              </div>

              {/* Product Image */}
              <div style={{
                width: '40px',
                height: '40px',
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
                    alt={product.product_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling!.style.display = 'flex'
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
                  fontSize: '16px'
                }}>
                  <i className="fa-solid fa-box"></i>
                </div>
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#3e3f29', 
                  margin: '0 0 2px 0',
                  lineHeight: '1.3'
                }}>
                  {product.product_name}
                </p>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#7d8d86', 
                  margin: 0 
                }}>
                  {product.quantity_sold} sold
                </p>
              </div>

              {/* Sales Amount */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#10b981', 
                  margin: 0 
                }}>
                  €{product.total_sales.toFixed(2)}
                </p>
                {index === 0 && (
                  <p style={{ 
                    fontSize: '10px', 
                    color: '#d97706', 
                    margin: '2px 0 0 0',
                    fontWeight: '500'
                  }}>
                    TOP SELLER
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductAnalyticsSection
