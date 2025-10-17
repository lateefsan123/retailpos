import React from 'react'
import Card from '../ui/Card'

interface TransactionFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  paymentFilter: string
  setPaymentFilter: (filter: string) => void
  dateFilter: string
  setDateFilter: (filter: string) => void
  selectedDate: string | null
  showCalendar: boolean
  setShowCalendar: (show: boolean) => void
  itemsPerPage: number
  setItemsPerPage: (count: number) => void
  onCalendarDateSelect: (date: Date) => void
  generateCalendarDays: () => Date[]
  calendarDate: Date
  setCalendarDate: (date: Date) => void
  partialPaymentFilter: string
  setPartialPaymentFilter: (filter: string) => void
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  paymentFilter,
  setPaymentFilter,
  dateFilter,
  setDateFilter,
  selectedDate,
  showCalendar,
  setShowCalendar,
  itemsPerPage,
  setItemsPerPage,
  onCalendarDateSelect,
  generateCalendarDays,
  calendarDate,
  setCalendarDate,
  partialPaymentFilter,
  setPartialPaymentFilter
}) => {
  return (
    <Card background="gray" padding="md">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        alignItems: 'end'
      }}>
        {/* Search */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Search Transactions
          </label>
          <input
            type="text"
            placeholder="Search by ID, customer, cashier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'var(--input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--input-bg)',
              color: '#ffffff'
            }}
          />
        </div>

        {/* Payment Method Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Payment Method
          </label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'var(--input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--input-bg)',
              color: '#ffffff'
            }}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>

        {/* Partial Payment Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Payment Type
          </label>
          <select
            value={partialPaymentFilter}
            onChange={(e) => setPartialPaymentFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'var(--input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--input-bg)',
              color: '#ffffff'
            }}
          >
            <option value="all">All Payments</option>
            <option value="full">Full Payments</option>
            <option value="partial">Partial Payments</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Date Range
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'var(--input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--input-bg)',
              color: '#ffffff'
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {/* Custom Date Picker */}
        {dateFilter === 'custom' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Select Date
            </label>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'var(--input-border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--input-bg)',
              color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {selectedDate 
                ? new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : 'Select a date'
              }
            </button>
          </div>
        )}

        {/* Items Per Page */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Items Per Page
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'var(--input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--input-bg)',
              color: '#ffffff'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
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
            background: 'rgba(0, 0, 0, 0.95)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Calendar Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#7d8d86'
                }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#7d8d86'
                }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {/* Day Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#7d8d86',
                  padding: '8px 4px'
                }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}>
              {generateCalendarDays().map((day, index) => {
                const isCurrentMonth = day.getMonth() === calendarDate.getMonth()
                const isToday = day.toDateString() === new Date().toDateString()
                const isSelected = selectedDate && day.toDateString() === new Date(selectedDate).toDateString()

                return (
                  <button
                    key={index}
                    onClick={() => onCalendarDateSelect(day)}
                    style={{
                      background: isSelected ? '#1a1a1a' : 'transparent',
                      color: isSelected ? '#ffffff' : isCurrentMonth ? '#ffffff' : '#7d8d86',
                      border: isToday ? '2px solid #7d8d86' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isCurrentMonth ? 1 : 0.5
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
                onClick={() => onCalendarDateSelect(new Date())}
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default TransactionFilters
