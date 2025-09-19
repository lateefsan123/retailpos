import { useEffect, useState } from 'react'
import { useProductAnalytics, ProductAnalytics } from '../../hooks/useProductAnalytics'
import { formatCurrency } from '../../utils/currency'

type TimePeriod = 'today' | 'week' | 'month'

interface Props {
  activePeriod?: TimePeriod
  selectedDate?: Date
}

const ProductAnalyticsSection = ({ activePeriod: externalPeriod, selectedDate }: Props) => {
  const { todayProducts, weekProducts, monthProducts, loading, error } = useProductAnalytics(selectedDate)
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(externalPeriod ?? 'today')

  useEffect(() => {
    if (externalPeriod) setActivePeriod(externalPeriod)
  }, [externalPeriod])

  const getProductsForPeriod = (period: TimePeriod): ProductAnalytics[] => {
    switch (period) {
      case 'today': return todayProducts
      case 'week': return weekProducts
      case 'month': return monthProducts
    }
  }

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'today': 
        if (selectedDate) {
          const today = new Date()
          const isToday = selectedDate.toDateString() === today.toDateString()
          return isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
    }
  }

  const periods: TimePeriod[] = ['today', 'week', 'month']
  const currentProducts = getProductsForPeriod(activePeriod)

  if (loading) {
    return (
    <div 
      className="dashboardCard"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        border: '2px solid #d1d5db',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#d1d5db'
      }}>
        <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} .skeleton{background-image:linear-gradient(90deg,#e5e7eb 0px,#f3f4f6 40px,#e5e7eb 80px);background-size:600px 100%;animation:shimmer 1.2s infinite linear;border-radius:8px}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ width: '40px', height: '40px' }}></div>
          <div className="skeleton" style={{ width: '160px', height: '18px' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ width: '80px', height: '28px' }}></div>
          <div className="skeleton" style={{ width: '100px', height: '28px' }}></div>
          <div className="skeleton" style={{ width: '100px', height: '28px' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid rgba(125,141,134,0.1)', borderRadius: '8px' }}>
              <div className="skeleton" style={{ width: '32px', height: '32px' }}></div>
              <div className="skeleton" style={{ width: '40px', height: '40px' }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '160px', height: '12px', marginBottom: '6px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '10px' }}></div>
              </div>
              <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="dashboardCard"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
          border: '2px solid #d1d5db',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#d1d5db',
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="dashboardCard"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        border: '2px solid #d1d5db',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#d1d5db'
      }}>
      {/* Header */}
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
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#3e3f29', margin: 0 }}>Top Products</h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activePeriod === p ? '#7d8d86' : '#ffffff',
              color: activePeriod === p ? '#f1f0e4' : '#7d8d86',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <i className={`fa-solid ${p === 'today' ? 'fa-calendar-day' : p === 'week' ? 'fa-calendar-week' : 'fa-calendar'}`} style={{ fontSize: '12px', marginRight: 6 }}></i>
            {getPeriodLabel(p)}
          </button>
        ))}
      </div>

      {/* List */}
      {currentProducts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#7d8d86', padding: '16px' }}>
          No products for {getPeriodLabel(activePeriod)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentProducts.slice(0, 3).map((product, index) => (
            <div
              key={product.product_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid rgba(125, 141, 134, 0.1)'
              }}
            >
              {/* Rank */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: index === 0 ? '#fbbf24' : index === 1 ? '#e5e7eb' : index === 2 ? '#f59e0b' : '#7d8d86',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: index === 1 ? '#6b7280' : '#3e3f29', fontSize: '12px', fontWeight: 700
              }}>
                {index === 0 ? <i className="fa-solid fa-crown" style={{ fontSize: 14 }}></i> : index + 1}
              </div>
              {/* Image */}
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <i className="fa-solid fa-box" style={{ color: '#7d8d86' }}></i>
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#3e3f29', margin: '0 0 2px 0' }}>{product.product_name}</p>
                <p style={{ fontSize: 12, color: '#7d8d86', margin: 0 }}>{product.quantity_sold} sold</p>
              </div>
              {/* Amount */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981', margin: 0 }}>{formatCurrency(product.total_sales)}</p>
                {index === 0 && <p style={{ fontSize: 10, color: '#d97706', margin: '2px 0 0 0', fontWeight: 500 }}>TOP SELLER</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductAnalyticsSection

