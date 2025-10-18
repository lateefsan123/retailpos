import { useEffect, useMemo, useState } from 'react'
import { useProductAnalytics, ProductAnalytics } from '../../hooks/derived/useProductAnalytics'
import { formatCurrency } from '../../utils/currency'

type TimePeriod = 'today' | 'week' | 'month'

interface Props {
  activePeriod?: TimePeriod
  selectedDate?: Date
}

const DONUT_COLORS = ['#4c6ef5', '#22d3ee', '#a855f7', '#f97316', '#facc15', '#38bdf8']

const ProductAnalyticsSection = ({ activePeriod: externalPeriod, selectedDate }: Props) => {
  const { todayProducts, weekProducts, monthProducts, loading, error } = useProductAnalytics(selectedDate)
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(externalPeriod ?? 'today')

  useEffect(() => {
    if (externalPeriod) {
      setActivePeriod(externalPeriod)
    }
  }, [externalPeriod])

  const getProductsForPeriod = (period: TimePeriod): ProductAnalytics[] => {
    switch (period) {
      case 'today':
        return todayProducts
      case 'week':
        return weekProducts
      case 'month':
        return monthProducts
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
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
    }
  }

  const periods: TimePeriod[] = ['today', 'week', 'month']
  
  const currentProducts = getProductsForPeriod(activePeriod)


  const topProducts = useMemo(() => currentProducts.slice(0, 5), [currentProducts])
  const totalSalesValue = useMemo(
    () => topProducts.reduce((sum, product) => sum + product.total_sales, 0),
    [topProducts]
  )

  const donutSize = 170
  const donutStroke = 20
  const donutRadius = (donutSize - donutStroke) / 2
  const circumference = 2 * Math.PI * donutRadius

  const donutSegments = useMemo(() => {
    let cumulative = 0
    return topProducts.map((product, index) => {
      const fraction = totalSalesValue === 0 ? 0 : product.total_sales / totalSalesValue
      const dashArray = `${fraction * circumference} ${circumference}`
      const dashOffset = circumference * (1 - cumulative)
      cumulative += fraction
      return {
        product,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
        dashArray,
        dashOffset,
        percentage: fraction * 100
      }
    })
  }, [topProducts, totalSalesValue, circumference])

  if (loading) {
    return (
      <div
        className="dashboardCard"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: 'var(--border-primary)'
        }}
      >
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
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid rgba(125,141,134,0.1)',
                borderRadius: '8px'
              }}
            >
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
            background: 'var(--bg-card)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            border: 'var(--border-primary)',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
        <div style={{ textAlign: 'center', color: 'var(--error-color)' }}>
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
        background: 'var(--bg-card)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: 'var(--border-primary)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--bg-nested)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fa-solid fa-chart-line" style={{ fontSize: '18px', color: 'var(--text-primary)' }}></i>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top Products</h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {periods.map((periodKey) => (
          <button
            key={periodKey}
            onClick={() => setActivePeriod(periodKey)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activePeriod === periodKey ? '#7d8d86' : 'var(--bg-card)',
              color: activePeriod === periodKey ? '#f1f0e4' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <i
              className={`fa-solid ${
                periodKey === 'today' ? 'fa-calendar-day' : periodKey === 'week' ? 'fa-calendar-week' : 'fa-calendar'
              }`}
              style={{ fontSize: '12px', marginRight: 6 }}
            ></i>
            {getPeriodLabel(periodKey)}
          </button>
        ))}
      </div>

      {/* Visualization + List */}
      {topProducts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '16px' }}>
          No products for {getPeriodLabel(activePeriod)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch' }}>
          <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {totalSalesValue > 0 ? (
              <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
                <circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={donutRadius}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth={donutStroke}
                  opacity={0.35}
                />
                {donutSegments.map((segment, index) => (
                  <circle
                    key={`${segment.product.product_id}-${index}`}
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={donutStroke}
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                  />
                ))}
                <circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={donutRadius - donutStroke * 0.65}
                  fill="var(--bg-card)"
                />
                <text x="50%" y="48%" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 600, fill: 'var(--text-primary)' }}>
                  {formatCurrency(totalSalesValue)}
                </text>
                <text x="50%" y="63%" textAnchor="middle" style={{ fontSize: '11px', fill: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  Total
                </text>
              </svg>
            ) : (
              <div style={{ color: 'var(--text-primary)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
                No revenue recorded in this period
              </div>
            )}
            <div style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '12px' }}>
              Share of revenue · {getPeriodLabel(activePeriod)}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topProducts.map((product, index) => {
              const percentage = totalSalesValue === 0 ? 0 : (product.total_sales / totalSalesValue) * 100
              const clampedPercentage = Math.min(Math.max(percentage, 0), 100)
              const roundedPercentage = Math.round(clampedPercentage * 10) / 10
              const displayPercentage = Number.isInteger(roundedPercentage) ? roundedPercentage.toFixed(0) : roundedPercentage.toFixed(1)
              const accentColor = DONUT_COLORS[index % DONUT_COLORS.length]
              return (
                <div
                  key={product.product_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--bg-nested)',
                    borderRadius: '10px',
                    border: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: product.image_url ? 'transparent' : accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '14px',
                      overflow: 'hidden',
                      border: product.image_url ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '10px'
                        }}
                        onError={(e) => {
                          // Fallback to numbered badge if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.style.background = accentColor
                            parent.innerHTML = `#${index + 1}`
                          }
                        }}
                      />
                    ) : (
                      `#${index + 1}`
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.product_name}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {displayPercentage}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-primary)' }}>
                      <span>{product.quantity_sold} sold</span>
                      <span>{formatCurrency(product.total_sales)}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', background: 'var(--secondary-bg)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${clampedPercentage}%`,
                          height: '100%',
                          background: accentColor
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductAnalyticsSection
