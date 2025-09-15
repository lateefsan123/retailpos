import React from 'react'

interface CalendarProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onTodaySelect: () => void
  calendarDate: Date
  onCalendarDateChange: (date: Date) => void
}

const Calendar: React.FC<CalendarProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  onTodaySelect,
  calendarDate,
  onCalendarDateChange
}) => {
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  if (!isOpen) return null

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
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Calendar Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onCalendarDateChange(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                color: '#7d8d86',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = '#f3f4f6'
                target.style.color = '#3e3f29'
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = 'none'
                target.style.color = '#7d8d86'
              }}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              onClick={() => onCalendarDateChange(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                color: '#7d8d86',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = '#f3f4f6'
                target.style.color = '#3e3f29'
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = 'none'
                target.style.color = '#7d8d86'
              }}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#7d8d86',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = '#f3f4f6'
                target.style.color = '#3e3f29'
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.background = 'none'
                target.style.color = '#7d8d86'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '16px'
        }}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280',
              padding: '8px 4px'
            }}>
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {generateCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, index) => {
            const isCurrentMonth = day.getMonth() === calendarDate.getMonth()
            
            // Create today's date in local timezone
            const today = new Date()
            const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const dayLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate())
            const selectedLocal = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
            
            const isToday = dayLocal.getTime() === todayLocal.getTime()
            const isSelected = dayLocal.getTime() === selectedLocal.getTime()
            
            return (
              <button
                key={index}
                onClick={() => onDateSelect(day)}
                style={{
                  background: isSelected ? '#7d8d86' : 'transparent',
                  color: isSelected ? '#ffffff' : isCurrentMonth ? '#1f2937' : '#9ca3af',
                  border: isToday ? '2px solid #7d8d86' : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isCurrentMonth ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    const target = e.currentTarget as HTMLElement
                    target.style.background = '#f3f4f6'
                    target.style.color = '#1f2937'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    const target = e.currentTarget as HTMLElement
                    target.style.background = 'transparent'
                    target.style.color = isCurrentMonth ? '#1f2937' : '#9ca3af'
                  }
                }}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        {/* Today Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '16px'
        }}>
          <button
            onClick={onTodaySelect}
            style={{
              background: '#7d8d86',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLElement
              target.style.background = '#6a7a73'
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLElement
              target.style.background = '#7d8d86'
            }}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}

export default Calendar
