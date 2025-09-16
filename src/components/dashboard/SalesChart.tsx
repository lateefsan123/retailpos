import { useState } from 'react'
import { useSalesAnalytics, WeeklySalesData, HourlySalesData } from '../../hooks/useSalesAnalytics'
import { useBusinessInfo } from '../../hooks/useBusinessInfo'

type ChartView = 'weekly' | 'hourly'

const SalesChart = () => {
  const { weeklyData, hourlyData, loading, error, refreshHourlyData, refreshWeeklyData } = useSalesAnalytics()
  const { businessInfo } = useBusinessInfo()
  const [view, setView] = useState<ChartView>('weekly')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = previous week, 1 = next week
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    data: WeeklySalesData | HourlySalesData | null
  }>({ visible: false, x: 0, y: 0, data: null })


  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    await refreshHourlyData(date)
  }

  const handlePreviousWeek = async () => {
    const newOffset = weekOffset - 1
    setWeekOffset(newOffset)
    await refreshWeeklyData(newOffset)
  }

  const handleNextWeek = async () => {
    const newOffset = weekOffset + 1
    setWeekOffset(newOffset)
    await refreshWeeklyData(newOffset)
  }

  const handleCurrentWeek = async () => {
    setWeekOffset(0)
    await refreshWeeklyData(0)
  }

  const getWeekRangeLabel = () => {
    const today = new Date()
    const currentDay = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay + (weekOffset * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
  }

  const handleMouseEnter = (e: React.MouseEvent, item: WeeklySalesData | HourlySalesData) => {
    // const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      data: item
    })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, data: null })
  }

  const getMaxValue = (data: WeeklySalesData[] | HourlySalesData[]) => {
    const maxSales = Math.max(...data.map(item => item.totalSales))
    return maxSales === 0 ? 1 : Math.ceil(maxSales * 1.1) // Add 10% padding, minimum 1 to avoid division by zero
  }

  const getBarHeight = (value: number, maxValue: number) => {
    if (value === 0) return 0 // No bar for zero sales
    return Math.max((value / maxValue) * 180, 4) // Minimum 4px height for non-zero values
  }

  const getBarColor = (index: number, isWeekly: boolean = true) => {
    if (isWeekly) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']
      return colors[index % colors.length]
    } else {
      // Hourly colors - gradient from light to dark
      const intensity = Math.min(index / 9, 1) // 0 to 1
      const red = Math.floor(59 + (239 - 59) * intensity)
      const green = Math.floor(130 + (68 - 130) * intensity)
      const blue = Math.floor(246 + (68 - 246) * intensity)
      return `rgb(${red}, ${green}, ${blue})`
    }
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
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
          Loading sales data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
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

  const currentData = view === 'weekly' ? weeklyData : hourlyData
  const maxValue = currentData.length > 0 ? getMaxValue(currentData) : 100
  
  // Show empty state if no data
  if (currentData.length === 0 && !loading && !error) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        width: '100%',
        margin: '0',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
          {(businessInfo?.logo_url || '/images/backgrounds/logo1.png') ? (
            <img 
              src={businessInfo?.logo_url || '/images/backgrounds/logo1.png'} 
              alt={businessInfo?.name || 'LandM Store Logo'} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<i class="fa-solid fa-chart-line" style="font-size: 20px; color: #7d8d86;"></i>'
                }
              }}
            />
          ) : (
            <i className="fa-solid fa-chart-line" style={{ fontSize: '20px', color: '#7d8d86' }}></i>
          )}
          </div>
          <div>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#3e3f29', 
              margin: '0 0 4px 0'
            }}>
              Sales Overview
            </h2>
          {(businessInfo?.name || 'LandM Store') && (
            <p style={{
              fontSize: '14px',
              color: '#7d8d86',
              margin: 0,
              fontWeight: '500'
            }}>
              {businessInfo?.name || 'LandM Store'}
            </p>
          )}
          </div>
        </div>
        
        <div style={{
          color: '#7d8d86',
          fontSize: '16px',
          marginBottom: '16px'
        }}>
          <i className="fa-solid fa-chart-bar" style={{ 
            fontSize: '48px', 
            marginBottom: '16px', 
            opacity: 0.5 
          }}></i>
          <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500' }}>
            No sales data available
          </p>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
            {view === 'weekly' ? 'No sales recorded for this week' : 'No sales recorded for this date'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-100%) scale(0.9); }
          to { opacity: 1; transform: translateY(-100%) scale(1); }
        }
      `}</style>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        width: '100%',
        margin: '0',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit'
      }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {(businessInfo?.logo_url || '/images/backgrounds/logo1.png') ? (
            <img 
              src={businessInfo?.logo_url || '/images/backgrounds/logo1.png'} 
              alt={businessInfo?.name || 'LandM Store Logo'} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<i class="fa-solid fa-chart-line" style="font-size: 20px; color: #7d8d86;"></i>'
                }
              }}
            />
          ) : (
            <i className="fa-solid fa-chart-line" style={{ fontSize: '20px', color: '#7d8d86' }}></i>
          )}
        </div>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#3e3f29', 
            margin: '0 0 4px 0'
          }}>
            Sales Overview
          </h2>
          {(businessInfo?.name || 'LandM Store') && (
            <p style={{
              fontSize: '14px',
              color: '#7d8d86',
              margin: 0,
              fontWeight: '500'
            }}>
              {businessInfo?.name || 'LandM Store'}
            </p>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{
        display: 'flex',
        background: '#f9fafb',
        borderRadius: '8px',
        padding: '4px',
        gap: '4px',
        marginBottom: '24px',
        maxWidth: '300px'
      }}>
        <button
          onClick={() => setView('weekly')}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: view === 'weekly' ? '#7d8d86' : 'transparent',
            color: view === 'weekly' ? '#f1f0e4' : '#7d8d86',
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
            if (view !== 'weekly') {
              e.currentTarget.style.background = '#e5e7eb'
              e.currentTarget.style.color = '#3e3f29'
            }
          }}
          onMouseLeave={(e) => {
            if (view !== 'weekly') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#7d8d86'
            }
          }}
        >
          <i className="fa-solid fa-calendar-week" style={{ fontSize: '12px' }}></i>
          Weekly
        </button>
        <button
          onClick={() => setView('hourly')}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: view === 'hourly' ? '#7d8d86' : 'transparent',
            color: view === 'hourly' ? '#f1f0e4' : '#7d8d86',
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
            if (view !== 'hourly') {
              e.currentTarget.style.background = '#e5e7eb'
              e.currentTarget.style.color = '#3e3f29'
            }
          }}
          onMouseLeave={(e) => {
            if (view !== 'hourly') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#7d8d86'
            }
          }}
        >
          <i className="fa-solid fa-clock" style={{ fontSize: '12px' }}></i>
          Hourly
        </button>
      </div>

      {/* Week Navigation for Weekly View */}
      {view === 'weekly' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <button
            onClick={handlePreviousWeek}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#7d8d86',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
              e.currentTarget.style.borderColor = '#7d8d86'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: '12px' }}></i>
            Previous Week
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#3e3f29',
              marginBottom: '2px'
            }}>
              {getWeekRangeLabel()}
            </div>
            <button
              onClick={handleCurrentWeek}
              style={{
                fontSize: '12px',
                color: '#7d8d86',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#3e3f29'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7d8d86'
              }}
            >
              {weekOffset === 0 ? 'Current Week' : 'Go to Current Week'}
            </button>
          </div>

          <button
            onClick={handleNextWeek}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#7d8d86',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
              e.currentTarget.style.borderColor = '#7d8d86'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
          >
            Next Week
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '12px' }}></i>
          </button>
        </div>
      )}

      {/* Date Picker for Hourly View */}
      {view === 'hourly' && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#3e3f29',
            marginBottom: '8px'
          }}>
            Select Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #7d8d86',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#3e3f29',
              background: 'white',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Chart Container */}
      <div style={{
        width: '100%',
        height: '400px',
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        border: '1px solid rgba(125, 141, 134, 0.1)',
        position: 'relative',
        overflow: 'visible',
        margin: '0',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Grid Lines */}
        <svg 
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((value, index) => (
            <line
              key={index}
              x1="0"
              y1={value}
              x2="100"
              y2={value}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
        </svg>
        
        {/* Y-axis labels */}
        <div style={{
          position: 'absolute',
          left: '15px',
          top: '0',
          bottom: '0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9ca3af',
          fontWeight: '500',
          zIndex: 1,
          padding: '10px 0'
        }}>
          {[100, 75, 50, 25, 0].map((value) => (
            <span key={value} style={{ textAlign: 'right', minWidth: '20px' }}>
              {formatCurrency((maxValue * value) / 100)}
            </span>
          ))}
        </div>
        
        {/* Bar Chart */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flex: 1,
          gap: view === 'weekly' ? '20px' : '12px',
          marginBottom: '30px',
          padding: '0 40px 0 70px',
          position: 'relative',
          zIndex: 2,
          overflow: 'visible',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '260px'
        }}>
          {currentData.map((item, index) => {
            const barHeight = getBarHeight(item.totalSales, maxValue)
            const barColor = getBarColor(index, view === 'weekly')
            
            return (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                flex: 1, 
                maxWidth: view === 'weekly' ? '100px' : '80px',
                overflow: 'visible',
                boxSizing: 'border-box',
                height: '100%'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: view === 'weekly' ? '80px' : '60px',
                  height: `${barHeight}px`,
                  background: barColor,
                  borderRadius: '8px 8px 0 0',
                  marginBottom: '12px',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1.05)'
                  e.currentTarget.style.opacity = '0.8'
                  handleMouseEnter(e, item)
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1)'
                  e.currentTarget.style.opacity = '1'
                  handleMouseLeave()
                }}
                >
                </div>
                <span style={{
                  fontSize: view === 'weekly' ? '13px' : '11px',
                  fontWeight: '500',
                  color: '#7d8d86',
                  textAlign: 'center',
                  display: 'block',
                  margin: '0',
                  padding: '0'
                }}>
                  {view === 'weekly' ? (item as WeeklySalesData).day : (item as HourlySalesData).hourLabel}
                </span>
              </div>
            )
          })}
        </div>
        
      </div>

      {/* Cursor Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 10,
          top: tooltip.y - 10,
          background: 'rgba(31, 41, 55, 0.95)',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transform: 'translateY(-100%)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '4px' 
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              background: view === 'weekly' ? getBarColor(0, true) : getBarColor(0, false)
            }}></div>
            <span style={{ fontWeight: '600', fontSize: '13px' }}>
              {view === 'weekly' ? (tooltip.data as WeeklySalesData).day : (tooltip.data as HourlySalesData).hourLabel}
            </span>
          </div>
          <div style={{ 
            fontSize: '11px', 
            opacity: 0.8,
            marginBottom: '2px'
          }}>
            {tooltip.data.transactionCount} transaction{tooltip.data.transactionCount !== 1 ? 's' : ''}
          </div>
          <div style={{ 
            fontWeight: '600',
            fontSize: '14px',
            color: '#60a5fa'
          }}>
            {formatCurrency(tooltip.data.totalSales)}
          </div>
        </div>
      )}
      
      {/* Chart Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '16px',
        flexWrap: 'wrap',
        background: '#3e3f29',
        borderRadius: '8px',
        padding: '12px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            background: '#7d8d86'
          }}></div>
          <span style={{ fontSize: '11px', color: '#f1f0e4', fontWeight: '500' }}>
            {view === 'weekly' ? 'Daily Sales' : 'Hourly Sales'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-chart-bar" style={{ fontSize: '12px', color: '#f1f0e4' }}></i>
          <span style={{ fontSize: '11px', color: '#f1f0e4', fontWeight: '500' }}>
            Max: {formatCurrency(maxValue)}
          </span>
        </div>
      </div>
    </div>
    </>
  )
}

export default SalesChart
