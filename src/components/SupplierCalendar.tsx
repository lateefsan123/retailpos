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
  const branchId: number | null = selectedBranchId !== undefined ? selectedBranchId : null
  const { visits, createVisit, deleteVisit, fetchVisits } = useSupplierVisits(businessId || null, branchId)
  const { suppliers } = useSuppliers(businessId || null, branchId)

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [visitType, setVisitType] = useState<'delivery' | 'meeting' | 'inspection' | 'other'>('delivery')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [openingHour, setOpeningHour] = useState(8)
  const [closingHour, setClosingHour] = useState(20)
  const [showVisitsModal, setShowVisitsModal] = useState(false)
  const [selectedHourVisits, setSelectedHourVisits] = useState<SupplierVisit[]>([])
  const [selectedHourDate] = useState<string>('')
  const [selectedHour] = useState<number>(0)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<SupplierVisit | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

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

  const handleTimeSlotClick = (date: Date, hour: number, event: React.MouseEvent) => {
    event.preventDefault()
    
    const dateStr = formatDate(date)
    const dayVisits = getVisitsForDate(date)
    const visitsInThisHour = dayVisits.filter(visit => {
      if (!visit.start_time) return false
      const [startHour] = visit.start_time.split(':').map(Number)
      return startHour === hour
    })

    if (event.button === 2 || (event.type === 'contextmenu')) {
      // Right click - Add new visit
      setSelectedDate(dateStr)
      const startHour = hour.toString().padStart(2, '0')
      const endHour = (hour + 1).toString().padStart(2, '0')
      setStartTime(`${startHour}:00`)
      setEndTime(`${endHour}:00`)
      setShowAddModal(true)
    } else if (event.button === 0) {
      // Left click - Show detailed visit information if there is one, otherwise add new visit
      if (visitsInThisHour.length > 0) {
        // Show detailed visit information in a modal
        setSelectedVisit(visitsInThisHour[0])
        setShowDetailModal(true)
      } else {
        // No visits, add new visit
        setSelectedDate(dateStr)
        const startHour = hour.toString().padStart(2, '0')
        const endHour = (hour + 1).toString().padStart(2, '0')
        setStartTime(`${startHour}:00`)
        setEndTime(`${endHour}:00`)
        setShowAddModal(true)
      }
    }
  }

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !selectedSupplierId || !selectedDate) return

    // Check if there's already a visit in this hour
    const [startHour] = startTime.split(':').map(Number)
    const existingVisits = getVisitsForDate(new Date(selectedDate))
    const visitsInThisHour = existingVisits.filter(visit => {
      if (!visit.start_time) return false
      const [visitStartHour] = visit.start_time.split(':').map(Number)
      return visitStartHour === startHour
    })

    if (visitsInThisHour.length > 0) {
      alert('This time slot already has a visit. Only one visit per hour is allowed.')
      return
    }

    try {
      const visitData: SupplierVisitRequest = {
        supplier_id: selectedSupplierId,
        business_id: businessId,
        branch_id: branchId || undefined,
        visit_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        visit_type: visitType,
        notes: notes || undefined,
        amount: amount ? parseFloat(amount) : undefined
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
    setAmount('')
  }


  const getVisitsForDate = (date: Date): SupplierVisit[] => {
    const dateStr = formatDate(date)
    return visits.filter(v => v.visit_date === dateStr)
  }

  const getVisitPosition = (visit: SupplierVisit) => {
    if (!visit.start_time || !visit.end_time) return null

    // Since max 1 visit per hour, position it at the top of the slot
    const top = 4
    const height = 52 // Fill most of the 60px slot with some padding

    return { top, height }
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

  // Calendar helper functions
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const handleDateSelect = (date: Date) => {
    // Set the calendar to show the week containing the selected date
    setCurrentWeekStart(getWeekStart(date))
    setShowCalendar(false)
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Calendar Button */}
              <div 
                onClick={() => setShowCalendar(true)}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '200px'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#f1f0e4',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <i className="fa-solid fa-calendar" style={{ fontSize: '16px', color: '#bca88d' }}></i>
                  <span style={{ color: '#bca88d' }}>
                    {currentWeekStart.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <i className="fa-solid fa-chevron-down" style={{ 
                  fontSize: '12px', 
                  color: '#bca88d',
                  transition: 'transform 0.2s ease'
                }}></i>
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
                      className={`${styles.timeSlot} ${styles[`day${dayOfWeek}`]} ${visitsInThisHour.length > 0 ? styles.hasVisits : ''}`}
                      onClick={(e) => handleTimeSlotClick(day, hour, e)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        handleTimeSlotClick(day, hour, e)
                      }}
                    >
                      {visitsInThisHour.map((visit) => {
                        const position = getVisitPosition(visit)
                        if (!position) return null

                        return (
                          <div
                            key={visit.visit_id}
                            className={styles.eventBlock}
                            style={{
                              top: `${position.top}px`,
                              height: `${position.height}px`
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent slot click when clicking event
                          >
                            <div className={styles.eventName}>
                              {visit.supplier?.image_url ? (
                                <img 
                                  src={visit.supplier.image_url} 
                                  alt={visit.supplier.name}
                                  className={styles.supplierImage}
                                />
                              ) : (
                                <i className="fa-solid fa-building"></i>
                              )}
                              {visit.supplier?.name}
                            </div>
                            {visit.amount && (
                              <div className={styles.eventAmount}>
                                ${visit.amount.toFixed(2)}
                              </div>
                            )}
                            {visit.notes && (
                              <div className={styles.eventNotes}>
                                {visit.notes}
                              </div>
                            )}
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
                  Amount (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount if applicable..."
                  className={styles.input}
                />
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

      {/* Visits Modal */}
      {showVisitsModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-calendar-day" style={{ marginRight: '12px' }}></i>
                Visits for {new Date(selectedHourDate).toLocaleDateString()} at {selectedHour === 12 ? '12 PM' : selectedHour > 12 ? `${selectedHour - 12} PM` : `${selectedHour} AM`}
              </h2>
              <button
                onClick={() => setShowVisitsModal(false)}
                className={styles.modalClose}
              >
                ×
              </button>
            </div>

            <div className={styles.visitsList}>
              {selectedHourVisits.map((visit) => (
                <div key={visit.visit_id} className={styles.visitItem}>
                  <div className={styles.visitHeader}>
                    <div className={styles.visitSupplier}>
                      {visit.supplier?.image_url ? (
                        <img 
                          src={visit.supplier.image_url} 
                          alt={visit.supplier.name}
                          className={styles.supplierImage}
                        />
                      ) : (
                        <i className="fa-solid fa-building"></i>
                      )}
                      {visit.supplier?.name}
                    </div>
                    <button
                      onClick={() => {
                        deleteVisit(visit.visit_id)
                        setSelectedHourVisits(prev => prev.filter(v => v.visit_id !== visit.visit_id))
                        if (selectedHourVisits.length === 1) {
                          setShowVisitsModal(false)
                        }
                      }}
                      className={styles.deleteVisitButton}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  
                  <div className={styles.visitDetails}>
                    <div className={styles.visitTime}>
                      <i className="fa-solid fa-clock" style={{ marginRight: '8px' }}></i>
                      {formatTimeDisplay(visit.start_time)} - {formatTimeDisplay(visit.end_time)}
                    </div>
                    
                    <div className={styles.visitType}>
                      <i className="fa-solid fa-tag" style={{ marginRight: '8px' }}></i>
                      {visit.visit_type.charAt(0).toUpperCase() + visit.visit_type.slice(1)}
                    </div>
                    
                    {visit.amount && (
                      <div className={styles.visitAmount}>
                        <i className="fa-solid fa-dollar-sign" style={{ marginRight: '8px' }}></i>
                        ${visit.amount.toFixed(2)}
                      </div>
                    )}
                    
                    {visit.notes && (
                      <div className={styles.visitNotes}>
                        <i className="fa-solid fa-note-sticky" style={{ marginRight: '8px' }}></i>
                        {visit.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowVisitsModal(false)}
                className={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {showDetailModal && selectedVisit && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-info-circle" style={{ marginRight: '12px' }}></i>
                Visit Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className={styles.modalClose}
              >
                ×
              </button>
            </div>

            <div className={styles.visitDetailContent}>
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Supplier:</div>
                <div className={styles.detailValue}>
                  {selectedVisit.supplier?.image_url ? (
                    <img 
                      src={selectedVisit.supplier.image_url} 
                      alt={selectedVisit.supplier.name}
                      className={styles.detailImage}
                    />
                  ) : (
                    <i className="fa-solid fa-building"></i>
                  )}
                  {selectedVisit.supplier?.name}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Visit Type:</div>
                <div className={styles.detailValue}>
                  <i className={`fa-solid ${getVisitTypeIcon(selectedVisit.visit_type)}`} style={{ marginRight: '8px' }}></i>
                  {selectedVisit.visit_type.charAt(0).toUpperCase() + selectedVisit.visit_type.slice(1)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Date:</div>
                <div className={styles.detailValue}>
                  <i className="fa-solid fa-calendar-day" style={{ marginRight: '8px' }}></i>
                  {new Date(selectedVisit.visit_date).toLocaleDateString()}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Time:</div>
                <div className={styles.detailValue}>
                  <i className="fa-solid fa-clock" style={{ marginRight: '8px' }}></i>
                  {formatTimeDisplay(selectedVisit.start_time)} - {formatTimeDisplay(selectedVisit.end_time)}
                </div>
              </div>

              {selectedVisit.amount && (
                <div className={styles.detailRow}>
                  <div className={styles.detailLabel}>Amount:</div>
                  <div className={styles.detailValue}>
                    <i className="fa-solid fa-dollar-sign" style={{ marginRight: '8px' }}></i>
                    ${selectedVisit.amount.toFixed(2)}
                  </div>
                </div>
              )}

              {selectedVisit.notes && (
                <div className={styles.detailRow}>
                  <div className={styles.detailLabel}>Notes:</div>
                  <div className={styles.detailValue}>
                    <i className="fa-solid fa-note-sticky" style={{ marginRight: '8px' }}></i>
                    {selectedVisit.notes}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowDetailModal(false)}
                className={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Calendar Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: '0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                Select Date
              </h3>
              <button
                onClick={() => setShowCalendar(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Month Navigation */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#374151',
                  fontSize: '14px'
                }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              
              <h4 style={{ 
                margin: '0', 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                {calendarDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h4>
              
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#374151',
                  fontSize: '14px'
                }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
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
                  padding: '8px 4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '4px'
                }}>
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {generateCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, index) => {
                const isCurrentMonth = day.getMonth() === calendarDate.getMonth()
                const isToday = day.toDateString() === new Date().toDateString()
                const isCurrentWeek = day >= currentWeekStart && day <= weekEnd
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    style={{
                      padding: '8px 4px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      background: isCurrentWeek ? '#1a1a1a' : isToday ? '#f3f4f6' : 'transparent',
                      color: isCurrentWeek ? '#ffffff' : isCurrentMonth ? '#1a1a1a' : '#9ca3af',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isCurrentWeek) {
                        e.currentTarget.style.background = '#f3f4f6'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isCurrentWeek) {
                        e.currentTarget.style.background = isToday ? '#f3f4f6' : 'transparent'
                      }
                    }}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Today Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => handleDateSelect(new Date())}
                style={{
                  background: '#1a1a1a',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierCalendar
