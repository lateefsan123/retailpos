import React, { useState, useEffect } from 'react'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useSupplierVisits } from '../hooks/useSupplierVisits'
import { useSuppliers } from '../hooks/useSuppliers'
import { SupplierVisit, SupplierVisitRequest } from '../types/multitenant'
import { supabase } from '../lib/supabaseClient'
import styles from './SupplierCalendar.module.css'

const SupplierCalendar = () => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const branchId = selectedBranchId ?? null
  const { visits, createVisit, deleteVisit, fetchVisits } = useSupplierVisits(businessId, branchId)
  const { suppliers } = useSuppliers(businessId, branchId)

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [visitType, setVisitType] = useState<'delivery' | 'meeting' | 'inspection' | 'other'>('delivery')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [openingHour, setOpeningHour] = useState(8)
  const [closingHour, setClosingHour] = useState(20)

  // Generate time slots based on business hours
  const timeSlots = Array.from(
    { length: closingHour - openingHour }, 
    (_, i) => i + openingHour
  )

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function getWeekDays(startDate: Date): Date[] {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays(currentWeekStart)
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(currentWeekStart.getDate() + 6)

  // Fetch business hours
  useEffect(() => {
    const fetchBusinessHours = async () => {
      if (!businessId) return

      try {
        const { data, error } = await supabase
          .from('business_info')
          .select('opening_time, closing_time')
          .eq('business_id', businessId)
          .single()

        if (error) throw error

        if (data) {
          // Parse time strings (format: "HH:MM:SS" or "HH:MM")
          if (data.opening_time) {
            const openHour = parseInt(data.opening_time.split(':')[0])
            setOpeningHour(openHour)
            setStartTime(`${openHour.toString().padStart(2, '0')}:00`)
          }
          if (data.closing_time) {
            const closeHour = parseInt(data.closing_time.split(':')[0])
            setClosingHour(closeHour)
          }
        }
      } catch (err) {
        console.error('Error fetching business hours:', err)
        // Use defaults if fetch fails
      }
    }

    fetchBusinessHours()
  }, [businessId])

  useEffect(() => {
    if (businessId) {
      const start = formatDate(currentWeekStart)
      const end = formatDate(weekEnd)
      fetchVisits(start, end)
    }
  }, [businessId, currentWeekStart, selectedBranchId])

  const handlePreviousWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const handleThisWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  const handleTimeSlotClick = (date: Date, hour: number) => {
    // Format the date
    const dateStr = formatDate(date)
    setSelectedDate(dateStr)
    
    // Set the time based on the hour clicked
    const startHour = hour.toString().padStart(2, '0')
    const endHour = (hour + 1).toString().padStart(2, '0')
    setStartTime(`${startHour}:00`)
    setEndTime(`${endHour}:00`)
    
    // Open the modal
    setShowAddModal(true)
  }

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !selectedSupplierId || !selectedDate) return

    try {
      const visitData: SupplierVisitRequest = {
        supplier_id: selectedSupplierId,
        business_id: businessId,
        branch_id: branchId || undefined,
        visit_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        visit_type: visitType,
        notes: notes || undefined
      }

      await createVisit(visitData)
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      console.error('Error adding visit:', err)
    }
  }

  const resetForm = () => {
    setSelectedDate('')
    setSelectedSupplierId(null)
    setVisitType('delivery')
    setStartTime('09:00')
    setEndTime('10:00')
    setNotes('')
  }

  const getVisitsForDate = (date: Date): SupplierVisit[] => {
    const dateStr = formatDate(date)
    return visits.filter(v => v.visit_date === dateStr)
  }

  const getVisitPosition = (visit: SupplierVisit) => {
    if (!visit.start_time || !visit.end_time) return null

    const [startHour, startMin] = visit.start_time.split(':').map(Number)
    const [endHour, endMin] = visit.end_time.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const baseMinutes = openingHour * 60 // Use business opening hour

    const top = ((startMinutes - baseMinutes) / 60) * 60 // 60px per hour
    const height = ((endMinutes - startMinutes) / 60) * 60

    return { top, height }
  }

  const getVisitTypeColor = (type: string) => {
    switch (type) {
      case 'delivery': return '#10b981'
      case 'meeting': return '#3b82f6'
      case 'inspection': return '#f59e0b'
      case 'other': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery': return 'fa-truck'
      case 'meeting': return 'fa-handshake'
      case 'inspection': return 'fa-clipboard-check'
      case 'other': return 'fa-calendar-day'
      default: return 'fa-calendar-day'
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const formatTimeDisplay = (time?: string) => {
    if (!time) return ''
    const [hour, min] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${min} ${ampm}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.headerTitle}>
                <i className="fa-solid fa-calendar-week" style={{ marginRight: '12px' }}></i>
                Supplier Visit Calendar
              </h1>
              <p className={styles.headerSubtitle}>
                Schedule and track supplier visits by time
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className={styles.addButton}
            >
              <i className="fa-solid fa-plus"></i>
              Add Visit
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className={styles.navigation}>
          <div className={styles.navContent}>
            <button
              onClick={handlePreviousWeek}
              className={styles.navButton}
            >
              <i className="fa-solid fa-chevron-left" style={{ marginRight: '8px' }}></i>
              Previous
            </button>
            
            <div className={styles.weekTitle}>
              <h2>
                {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' - '}
                {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <button
                onClick={handleThisWeek}
                className={styles.todayButton}
              >
                Go to This Week
              </button>
            </div>

            <button
              onClick={handleNextWeek}
              className={styles.navButton}
            >
              Next
              <i className="fa-solid fa-chevron-right" style={{ marginLeft: '8px' }}></i>
            </button>
          </div>
        </div>

        {/* Time Grid Calendar */}
        <div className={styles.calendarCard}>
          {/* Header with dates */}
          <div className={styles.timeGridHeader}>
            <div className={styles.timeLabel}></div>
            {weekDays.map((day, index) => {
              const dayOfWeek = day.getDay()
              return (
                <div
                  key={index}
                  className={`${styles.dayHeader} ${styles[`day${dayOfWeek}`]} ${isToday(day) ? styles.today : ''}`}
                >
                  <span className={styles.dayName}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={styles.dayNumber}>
                    {day.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Time slots grid */}
          <div className={styles.timeGrid}>
            {timeSlots.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time label */}
                <div className={styles.timeLabel}>
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayVisits = getVisitsForDate(day)
                  const visitsInThisHour = dayVisits.filter(visit => {
                    if (!visit.start_time) return false
                    const [startHour] = visit.start_time.split(':').map(Number)
                    return startHour === hour
                  })
                  const dayOfWeek = day.getDay()

                  return (
                    <div 
                      key={dayIndex} 
                      className={`${styles.timeSlot} ${styles[`day${dayOfWeek}`]}`}
                      onClick={() => handleTimeSlotClick(day, hour)}
                    >
                      {visitsInThisHour.map((visit) => {
                        const position = getVisitPosition(visit)
                        if (!position) return null

                        const color = getVisitTypeColor(visit.visit_type)
                        
                        return (
                          <div
                            key={visit.visit_id}
                            className={styles.eventBlock}
                            style={{
                              top: `${position.top}px`,
                              height: `${position.height}px`,
                              backgroundColor: `${color}20`,
                              borderLeftColor: color,
                              color: color
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent slot click when clicking event
                          >
                            <div className={styles.eventName}>
                              <i className={`fa-solid ${getVisitTypeIcon(visit.visit_type)}`} style={{ marginRight: '4px' }}></i>
                              {visit.supplier?.name}
                            </div>
                            <div className={styles.eventTime}>
                              {formatTimeDisplay(visit.start_time)} - {formatTimeDisplay(visit.end_time)}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteVisit(visit.visit_id)
                              }}
                              className={styles.deleteEventButton}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <h3>Visit Types:</h3>
          <div className={styles.legendItems}>
            {[
              { type: 'delivery', label: 'Delivery' },
              { type: 'meeting', label: 'Meeting' },
              { type: 'inspection', label: 'Inspection' },
              { type: 'other', label: 'Other' }
            ].map(({ type, label }) => (
              <div key={type} className={styles.legendItem}>
                <div
                  className={styles.legendColor}
                  style={{ backgroundColor: getVisitTypeColor(type) }}
                ></div>
                <span className={styles.legendLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Visit Modal */}
      {showAddModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-truck" style={{ marginRight: '12px' }}></i>
                Schedule Supplier Visit
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className={styles.modalClose}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddVisit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Supplier *
                </label>
                <select
                  required
                  value={selectedSupplierId || ''}
                  onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Visit Date *
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Visit Type *
                </label>
                <select
                  required
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="delivery">Delivery</option>
                  <option value="meeting">Meeting</option>
                  <option value="inspection">Inspection</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this visit..."
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  Schedule Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierCalendar
