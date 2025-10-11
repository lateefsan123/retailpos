import { useEffect, useState } from 'react'
import { useSalesAnalytics, WeeklySalesData, HourlySalesData, MonthlySalesData } from '../../hooks/derived/useSalesAnalytics'
import { useBusiness } from '../../contexts/BusinessContext'
import { formatCurrency as formatCurrencyUtil, formatCurrencyCompact } from '../../utils/currency'

type ChartView = 'weekly' | 'hourly' | 'monthly'
type TimePeriod = 'today' | 'week' | 'month'

interface SalesChartProps {
  // When provided, the chart syncs to this date (from Dashboard calendar)
  selectedDate?: Date
  // Optional global range selector from Dashboard
  activePeriod?: TimePeriod
}

const SalesChart = ({ selectedDate: externalSelectedDate, activePeriod }: SalesChartProps) => {
  const [view, setView] = useState<ChartView>('weekly')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = previous week, 1 = next week
  const [monthOffset, setMonthOffset] = useState(0)
  const { weeklyData, hourlyData, monthlyData, loading, error, businessHours } = useSalesAnalytics(externalSelectedDate, weekOffset, monthOffset)
  const { currentBusiness } = useBusiness()
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    data: WeeklySalesData | HourlySalesData | null
  }>({ visible: false, x: 0, y: 0, data: null })


  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  // Sync with external selected date (from Dashboard calendar)
  useEffect(() => {
    if (!externalSelectedDate) return

    // 1) Update hourly chart to the selected date
    const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const dateStr = toYMD(externalSelectedDate)
    setSelectedDate(dateStr)

    // 2) Compute week offset so weekly chart aligns with selected date's week
    const startOfWeek = (d: Date) => {
      const x = new Date(d)
      x.setHours(0, 0, 0, 0)
      const dayOfWeek = x.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Monday-based (0 = Monday, 6 = Sunday)
      x.setDate(x.getDate() - daysToMonday) // Monday as week start
      return x
    }

    const selectedWeekStart = startOfWeek(externalSelectedDate)
    const todayRef = new Date()
    todayRef.setHours(0, 0, 0, 0)
    const currentWeekStart = startOfWeek(todayRef)
    const diffMs = selectedWeekStart.getTime() - currentWeekStart.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const newOffset = Math.round(diffDays / 7)

    setWeekOffset(newOffset)

    // 3) Compute month offset relative to current month
    const today = new Date()
    const newMonthOffset = (externalSelectedDate.getFullYear() - today.getFullYear()) * 12 + (externalSelectedDate.getMonth() - today.getMonth())
    setMonthOffset(newMonthOffset)
  }, [externalSelectedDate])

  // Sync view with global active period
  useEffect(() => {
    if (!activePeriod) return
    setView(activePeriod === 'today' ? 'hourly' : activePeriod === 'week' ? 'weekly' : 'monthly')
  }, [activePeriod])

  const handlePreviousWeek = () => {
    const newOffset = weekOffset - 1
    setWeekOffset(newOffset)
  }

  const handleNextWeek = () => {
    const newOffset = weekOffset + 1
    setWeekOffset(newOffset)
  }

  const handleCurrentWeek = () => {
    setWeekOffset(0)
  }

  const getWeekRangeLabel = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert to Monday-based (0 = Monday, 6 = Sunday)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - daysToMonday + (weekOffset * 7))
    
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

  const getMaxValue = (data: WeeklySalesData[] | HourlySalesData[] | MonthlySalesData[]) => {
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


  if (loading) {
    return (
      <div 
        className="dashboardCard"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
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
      <div 
        className="dashboardCard"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
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

  // Filter hourly data to only show business hours
  const getBusinessHoursRange = (businessHours: string = '9:00 AM - 6:00 PM') => {
    try {
      const match = businessHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      if (match) {
        const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match
        
        const parseTime = (hour: string, min: string, period: string) => {
          let h = parseInt(hour)
          const m = parseInt(min)
          if (period.toUpperCase() === 'PM' && h !== 12) h += 12
          if (period.toUpperCase() === 'AM' && h === 12) h = 0
          return h
        }
        
        const startHourNum = parseTime(startHour, startMin, startPeriod)
        const endHourNum = parseTime(endHour, endMin, endPeriod)
        
        return { startHour: startHourNum, endHour: endHourNum }
      }
    } catch (error) {
      console.warn(`Could not parse business hours: ${businessHours}`)
    }
    
    // Default to 9 AM - 6 PM
    return { startHour: 9, endHour: 18 }
  }

  const filteredHourlyData = (() => {
    if (view !== 'hourly') return hourlyData
    
    const { startHour, endHour } = getBusinessHoursRange(businessHours)
    return hourlyData.filter(item => item.hour >= startHour && item.hour <= endHour)
  })()

  const currentData = view === 'weekly' ? weeklyData : view === 'monthly' ? monthlyData : filteredHourlyData
  const maxValue = currentData.length > 0 ? getMaxValue(currentData) : 100
  const labelStep = view === 'monthly' ? Math.ceil(currentData.length / 12) : 1
  
  // Show empty state if no data
  if (currentData.length === 0 && !loading && !error) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '28px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
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
          {(currentBusiness?.logo_url || '/images/backgrounds/logo1.png') ? (
            <img 
              src={currentBusiness?.logo_url || '/images/backgrounds/logo1.png'} 
              alt={currentBusiness?.business_name || currentBusiness?.name || 'Business Logo'} 
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
          {(currentBusiness?.business_name || currentBusiness?.name) && (
            <p style={{
              fontSize: '14px',
              color: '#7d8d86',
              margin: 0,
              fontWeight: '500'
            }}>
              {currentBusiness?.business_name || currentBusiness?.name}
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
      <div 
        className="dashboardCard"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
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
          {(currentBusiness?.logo_url || '/images/backgrounds/logo1.png') ? (
            <img 
              src={currentBusiness?.logo_url || '/images/backgrounds/logo1.png'} 
              alt={currentBusiness?.business_name || currentBusiness?.name || 'Business Logo'} 
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
          {(currentBusiness?.business_name || currentBusiness?.name) && (
            <p style={{
              fontSize: '14px',
              color: '#7d8d86',
              margin: 0,
              fontWeight: '500'
            }}>
              {currentBusiness?.business_name || currentBusiness?.name}
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
        maxWidth: '300px',
        border: '2px solid #d1d5db'
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
        <button
          onClick={() => setView('monthly')}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: view === 'monthly' ? '#7d8d86' : 'transparent',
            color: view === 'monthly' ? '#f1f0e4' : '#7d8d86',
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
            if (view !== 'monthly') {
              e.currentTarget.style.background = '#e5e7eb'
              e.currentTarget.style.color = '#3e3f29'
            }
          }}
          onMouseLeave={(e) => {
            if (view !== 'monthly') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#7d8d86'
            }
          }}
        >
          <i className="fa-solid fa-calendar" style={{ fontSize: '12px' }}></i>
          Monthly
        </button>
      </div>

      {/* Week/Month Navigation */}
      {view === 'weekly' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px solid #d1d5db'
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
      {view === 'monthly' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px solid #d1d5db'
        }}>
          <button
            onClick={() => { const o = monthOffset - 1; setMonthOffset(o) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid #d1d5db', background: '#ffffff', color: '#7d8d86', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: '12px' }}></i>
            Previous Month
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#3e3f29', marginBottom: '2px' }}>
              {new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            <button
              onClick={() => { setMonthOffset(0) }}
              style={{ fontSize: '12px', color: '#7d8d86', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {monthOffset === 0 ? 'Current Month' : 'Go to Current Month'}
            </button>
          </div>
          <button
            onClick={() => { const o = monthOffset + 1; setMonthOffset(o) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid #d1d5db', background: '#ffffff', color: '#7d8d86', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
            }}
          >
            Next Month
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '12px' }}></i>
          </button>
        </div>
      )}

      {/* Date Picker for Hourly View */}
      {view === 'hourly' && (
        <div style={{ 
          marginBottom: '24px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px solid #d1d5db'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#3e3f29'
            }}>
              Select Date:
            </label>
            {businessHours && (
              <div style={{
                fontSize: '12px',
                color: '#7d8d86',
                background: '#e5e7eb',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                <i className="fa-solid fa-clock" style={{ marginRight: '4px' }}></i>
                Business Hours: {businessHours}
              </div>
            )}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '2px solid #d1d5db',
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
        border: '2px solid #d1d5db',
        position: 'relative',
        overflow: 'visible',
        margin: '0',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Grid Lines removed - clean background */}
        
        {/* Y-axis labels */}
        <div style={{
          position: 'absolute',
          left: '15px',
          top: '40px',
          bottom: '30px',
          fontSize: '11px',
          color: '#9ca3af',
          fontWeight: '500',
          zIndex: 1,
          padding: '10px 0',
          height: '260px' // Match the chart height
        }}>
          {[100, 75, 50, 25, 0].map((value, index) => (
            <span 
              key={value} 
              style={{ 
                position: 'absolute',
                textAlign: 'right', 
                minWidth: '20px',
                // Position each label at the correct height to align with grid lines
                top: `${(index * 25)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {formatCurrencyCompact((maxValue * value) / 100, {}, currentBusiness?.currency)}
            </span>
          ))}
        </div>
        
        {/* Bar Chart */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flex: 1,
          gap: view === 'weekly' ? '20px' : view === 'monthly' ? '6px' : '12px',
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
            const barColor = getBarColor(index, view !== 'hourly')
            
            return (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                flex: 1, 
                maxWidth: view === 'weekly' ? '100px' : view === 'monthly' ? '24px' : '80px',
                overflow: 'visible',
                boxSizing: 'border-box',
                height: '100%'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: view === 'weekly' ? '80px' : view === 'monthly' ? '16px' : '60px',
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
                  {view === 'weekly' 
                    ? (item as WeeklySalesData).day 
                    : view === 'monthly' 
                      ? (index % labelStep === 0 ? (item as MonthlySalesData).day : '') 
                      : (item as HourlySalesData).hourLabel}
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
            {formatCurrencyUtil(tooltip.data.totalSales)}
          </div>
        </div>
      )}
      
      {/* Legend moved below the card to avoid affecting chart layout */}
    </div>

    {/* Chart Legend in its own container under the chart card */}
    <div style={{ 
      width: '100%', 
      maxWidth: '1000px', 
      margin: '12px auto 0 auto',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        background: '#f9fafb',
        borderRadius: '999px',
        padding: '10px 18px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#7d8d86' }}></div>
          <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
            {view === 'weekly' ? 'Daily Sales' : view === 'monthly' ? 'Daily Sales (Month)' : 'Hourly Sales'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-chart-bar" style={{ fontSize: '12px', color: '#334155' }}></i>
          <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
            Max: {formatCurrencyUtil(maxValue, {}, currentBusiness?.currency)}
          </span>
        </div>
      </div>
    </div>
    </>
  )
}

export default SalesChart
