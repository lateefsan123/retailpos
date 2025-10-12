import { useEffect, useMemo, useState, useRef } from 'react'
import { X, Calendar as CalendarIcon, RefreshCw, Home, Package, Receipt, ShoppingBag } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useTransactions } from '../hooks/useTransactions'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

import BranchSelector from '../components/BranchSelector'
import MobileBottomNav from '../components/MobileBottomNav'
import styles from './TransactionsMobile.module.css'

interface CalendarDay {
  date: Date
  inCurrentMonth: boolean
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const TransactionsMobile = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement | null>(null)
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranch, selectedBranchId } = useBranch()
  const { user } = useAuth()
  const { theme } = useTheme()

  const {
    transactions,
    loading: transactionsLoading,
    error,
    fetchTransactions,
    deleteTransaction,
    resolvePartialPayment
  } = useTransactions()

  const [showNav, setShowNav] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<(typeof transactions)[number] | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'mobile_money'>('all')
  const [partialFilter, setPartialFilter] = useState<'all' | 'partial' | 'full'>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [activeChip, setActiveChip] = useState<'today' | 'week' | 'month' | null>('today')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [showBranchSelector, setShowBranchSelector] = useState(false)
  const [initialScroll, setInitialScroll] = useState(false)

  const canSwitchBranches = user?.role?.toLowerCase() === 'owner'

  useEffect(() => {
    setShowNav(false)
  }, [location.pathname])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const dateParam = params.get('date')
    if (dateParam) {
      try {
        const parsed = new Date(dateParam)
        if (!isNaN(parsed.getTime())) {
          const end = params.get('end') ? new Date(params.get('end')!) : parsed
          setSelectedDateRange({ start: parsed, end })
          setActiveChip(null)
        }
      } catch (error) {
        console.error('Invalid date param', error)
      }
    }
  }, [location.search])

  useEffect(() => {
    const handleFocus = () => fetchTransactions()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchTransactions])

  useEffect(() => {
    if (!initialScroll) {
      const params = new URLSearchParams(location.search)
      const dateParam = params.get('date')
      if (dateParam && listRef.current) {
        requestAnimationFrame(() => {
          listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setInitialScroll(true)
        })
      }
    }
  }, [initialScroll, location.search])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, paymentFilter, partialFilter, selectedDateRange.start, selectedDateRange.end])

  useEffect(() => {
    if (businessId && !businessLoading) {
      fetchTransactions()
    }
  }, [businessId, businessLoading, selectedBranchId, fetchTransactions])

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((transaction) => {
      const matchesSearch = searchTerm
        ? transaction.sale_id.toString().includes(searchTerm.toLowerCase()) ||
          (transaction.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true

      const matchesPayment = paymentFilter === 'all'
        ? true
        : transaction.payment_method.toLowerCase() === paymentFilter

      const matchesPartial =
        partialFilter === 'all'
          ? true
          : partialFilter === 'partial'
            ? transaction.partial_payment === true
            : !transaction.partial_payment

      let matchesDate = true
      if (selectedDateRange.start) {
        const transactionDate = new Date(transaction.datetime)
        const start = selectedDateRange.start
        const end = selectedDateRange.end || selectedDateRange.start

        const normalizedTransaction = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate())
        const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
        const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())

        matchesDate = normalizedTransaction >= normalizedStart && normalizedTransaction <= normalizedEnd
      }

      const matchesBranch = selectedBranchId ? transaction.branch_id === selectedBranchId : true

      return matchesSearch && matchesPayment && matchesPartial && matchesDate && matchesBranch
    })
  }, [transactions, searchTerm, paymentFilter, partialFilter, selectedDateRange, selectedBranchId])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const setDateChip = (chip: 'today' | 'week' | 'month') => {
    const now = new Date()
    const start = new Date(now)
    let end = new Date(now)

    if (chip === 'week') {
      start.setDate(now.getDate() - 6)
    } else if (chip === 'month') {
      start.setDate(now.getDate() - 29)
    }

    setSelectedDateRange({ start, end })
    setActiveChip(chip)
  }

  const clearDateFilters = () => {
    setSelectedDateRange({ start: null, end: null })
    setActiveChip(null)
  }

  const handleDateSelect = (date: Date) => {
    const { start, end } = selectedDateRange

    if (!start || (start && end)) {
      setSelectedDateRange({ start: date, end: null })
    } else if (date < start) {
      setSelectedDateRange({ start: date, end: start })
    } else {
      setSelectedDateRange({ start, end: date })
      setShowCalendar(false)
      setActiveChip(null)
    }
  }

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index)

      return {
        date,
        inCurrentMonth: date.getMonth() === month
      }
    })
  }, [calendarMonth])

  const isDateSelected = (date: Date) => {
    const { start, end } = selectedDateRange
    if (!start) return false

    if (start && !end) {
      return date.toDateString() === start.toDateString()
    }

    if (start && end) {
      const isStart = date.toDateString() === start.toDateString()
      const isEnd = date.toDateString() === end.toDateString()
      const inRange = date > start && date < end
      return isStart || isEnd || inRange
    }

    return false
  }

  const handleResolve = async (saleId: number) => {
    try {
      await resolvePartialPayment(saleId)
      fetchTransactions()
      if (selectedTransaction?.sale_id === saleId) {
        setShowDetailModal(false)
        setSelectedTransaction(null)
      }
    } catch (err) {
      console.error('Error resolving partial payment', err)
    }
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return

    try {
      await deleteTransaction(transactionToDelete)
      fetchTransactions()
    } catch (err) {
      console.error('Error deleting transaction', err)
    } finally {
      setShowDeleteModal(false)
      setTransactionToDelete(null)
      if (selectedTransaction?.sale_id === transactionToDelete) {
        setShowDetailModal(false)
        setSelectedTransaction(null)
      }
    }
  }

  const openTransactionDetail = (transaction: (typeof transactions)[number]) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  const closeTransactionDetail = () => {
    setShowDetailModal(false)
    setSelectedTransaction(null)
  }

  const detailItems = useMemo(() => {
    if (!selectedTransaction) return []

    if (selectedTransaction.items && selectedTransaction.items.length > 0) {
      return selectedTransaction.items
    }

    if ((selectedTransaction as { sale_items?: typeof selectedTransaction.items })?.sale_items?.length) {
      return (selectedTransaction as { sale_items: typeof selectedTransaction.items }).sale_items
    }

    return []
  }, [selectedTransaction])

  const renderStatusDot = (transaction: (typeof transactions)[number]) => {
    const className = [styles.statusDot]

    if (transaction.partial_payment) {
      className.push(styles.statusDotPartial)
    } else {
      className.push(styles.statusDotSuccess)
    }

    return <span className={className.join(' ')} aria-hidden="true" />
  }

  const transactionCountCopy = useMemo(() => {
    if (!filteredTransactions.length) {
      return 'No transactions found'
    }

    const startIndex = (currentPage - 1) * itemsPerPage + 1
    const endIndex = Math.min(currentPage * itemsPerPage, filteredTransactions.length)

    const base = `Showing ${startIndex}-${endIndex} of ${filteredTransactions.length} transactions`

    if (selectedDateRange.start) {
      const { start, end } = selectedDateRange
      if (!start) return base

      const formattedStart = start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
      const formattedEnd = end
        ? end.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : formattedStart

      return `${base} (${formattedStart}${end ? ` - ${formattedEnd}` : ''})`
    }

    if (activeChip === 'today') return `${base} (Today)`
    if (activeChip === 'week') return `${base} (Last 7 days)`
    if (activeChip === 'month') return `${base} (Last 30 days)`

    return base
  }, [filteredTransactions, selectedDateRange, currentPage, itemsPerPage, activeChip])

  // Theme-aware background configuration
  const getBackgroundImage = () => {
    if (theme === 'light') {
      return 'url(/images/backgrounds/stribebg_white.png)'
    }
    return 'url(/images/backgrounds/stribebg.png)'
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundImage: getBackgroundImage(),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      overflowX: 'hidden',
      overflowY: 'auto',
      paddingBottom: '80px'
    }}>
      <div className={`${styles.overlay} ${showNav ? styles.overlayOpen : ''}`} onClick={() => setShowNav(false)}>
        <div className={`${styles.slideNav} ${showNav ? styles.slideNavOpen : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.navHeader}>
            <div className={styles.navHeaderContent}>
              <h2 className={styles.navTitle}>Menu</h2>
              <button className={styles.closeNavBtn} onClick={() => setShowNav(false)} aria-label="Close navigation">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className={styles.navContent}>
            <ul className={styles.navList}>
              <li>
                <button className={styles.navItem} onClick={() => navigate('/dashboard-mobile')}>
                  <Home size={18} />
                  Dashboard
                </button>
              </li>
              <li>
                <button className={styles.navItem} onClick={() => navigate('/products-mobile')}>
                  <Package size={18} />
                  Products
                </button>
              </li>
              <li>
                <button className={`${styles.navItem} ${styles.navItemActive}`}>
                  <Receipt size={18} />
                  Transactions
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setShowNav(true)} aria-label="Open navigation">
              <svg className={styles.menuIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <div className={styles.titleBlock}>
              <h1>Transactions</h1>
              <p>View and manage all sales transactions</p>
            </div>
          </div>
          <div className={styles.branchBadgeWrapper}>
            <button
              type="button"
              className={styles.branchBadge}
              onClick={() => canSwitchBranches && setShowBranchSelector(true)}
              disabled={!canSwitchBranches}
              aria-disabled={!canSwitchBranches}
            >
              <span>{selectedBranch?.branch_name || 'Select Branch'}</span>
            </button>
          </div>
          <button className={styles.refreshBtn} onClick={() => fetchTransactions()} aria-label="Refresh transactions">
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      {error && (
        <div className={`${styles.feedbackBanner} ${styles.error}`}>
          <span>Unable to load transactions. Pull to refresh or tap retry.</span>
        </div>
      )}

      <section className={styles.summaryCard}>
        <div className={styles.dateRow}>
          <div className={styles.dateInput}>
            <span>{selectedDateRange.start ? transactionCountCopy.replace(/^Showing \d+-\d+ of \d+ transactions\s*/, '') : 'Select date range...'}</span>
            {selectedDateRange.start ? (
              <button type="button" onClick={clearDateFilters} aria-label="Clear date range">
                <X size={16} />
              </button>
            ) : (
              <button type="button" onClick={() => setShowCalendar(true)} aria-label="Open date picker">
                <CalendarIcon size={16} />
              </button>
            )}
          </div>
        </div>
        <div className={styles.dateFilters}>
          <button
            type="button"
            className={`${styles.filterChip} ${activeChip === 'today' ? styles.filterChipActive : ''}`}
            onClick={() => setDateChip('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${activeChip === 'week' ? styles.filterChipActive : ''}`}
            onClick={() => setDateChip('week')}
          >
            7d
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${activeChip === 'month' ? styles.filterChipActive : ''}`}
            onClick={() => setDateChip('month')}
          >
            30d
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>{transactionCountCopy}</p>
      </section>

      <section className={styles.filtersSection}>
        <div className={styles.searchWrapper}>
          <input
            className={styles.searchInput}
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <div className={styles.filterRow}>
          <select className={styles.filterSelect} value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}>
            <option value="all">Payment</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_money">Digital</option>
          </select>
          <select className={styles.filterSelect} value={partialFilter} onChange={(event) => setPartialFilter(event.target.value as typeof partialFilter)}>
            <option value="all">Status</option>
            <option value="partial">Partial</option>
            <option value="full">Complete</option>
          </select>
          <button type="button" className={styles.clearFiltersButton} onClick={() => {
            setSearchTerm('')
            setPaymentFilter('all')
            setPartialFilter('all')
            clearDateFilters()
          }}>
            Clear
          </button>
        </div>
      </section>

      <main ref={listRef} className={styles.sectionBody}>
        {transactionsLoading && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading transactions...</p>
          </div>
        )}

        {!transactionsLoading && filteredTransactions.length === 0 && (
          <div className={styles.emptyState}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Receipt size={26} color="#9ca3af" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px' }}>No transactions found</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Try adjusting your filters or date range.</p>
          </div>
        )}

        {!transactionsLoading && filteredTransactions.length > 0 && (
          <div className={styles.transactionsList}>
            {paginatedTransactions.map((transaction) => (
              <article 
                key={transaction.sale_id} 
                className={styles.transactionCard}
                onClick={() => openTransactionDetail(transaction)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.transactionHeader}>
                  <div className={styles.transactionMeta}>
                    <div className={styles.transactionId}>
                      <span>#{transaction.sale_id.toString().padStart(6, '0')}</span>
                      {renderStatusDot(transaction)}
                    </div>
                    <span className={styles.customerName}>{transaction.customer_name || 'Walk-in Customer'}</span>
                  </div>
                  <div className={styles.transactionAmount}>
                    {transaction.partial_payment ? (
                      <div className={styles.partialBreakdown}>
                        <span>Paid {formatCurrency(transaction.partial_amount || 0)}</span>
                        <span>Owed {formatCurrency(transaction.remaining_amount || 0)}</span>
                      </div>
                    ) : (
                      <span className={styles.amountValue}>{formatCurrency(transaction.total_amount)}</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'capitalize' }}>
                      {transaction.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className={styles.transactionInfo}>
                  <span>{formatDateTime(transaction.datetime)}</span>
                  <span>{transaction.items?.length || 0} items</span>
                </div>
                <div className={styles.transactionActions}>
                  <div className={styles.actionButtons}>
                    <button 
                      type="button" 
                      className={styles.linkButton} 
                      onClick={(e) => {
                        e.stopPropagation()
                        openTransactionDetail(transaction)
                      }}
                    >
                      View Details
                    </button>
                    {transaction.partial_payment && (
                      <button 
                        type="button" 
                        className={styles.resolveButton} 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(transaction.sale_id)
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTransactionToDelete(transaction.sale_id)
                      setShowDeleteModal(true)
                    }}
                    aria-label="Delete transaction"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.pagination}>
        <button
          type="button"
          className={styles.paginationButton}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Prev
        </button>
        <div className={styles.pageDots}>
          <button type="button" className={`${styles.pageNumber} ${currentPage === 1 ? styles.pageNumberActive : ''}`} onClick={() => setCurrentPage(1)}>
            1
          </button>
          {totalPages > 2 && (
            <span aria-hidden="true">•••</span>
          )}
          {totalPages > 1 && (
            <button
              type="button"
              className={`${styles.pageNumber} ${currentPage === totalPages ? styles.pageNumberActive : ''}`}
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.paginationButton}
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </footer>

      <MobileBottomNav />

      {showCalendar && (
        <div className={styles.calendarOverlay} onClick={() => setShowCalendar(false)}>
          <div className={styles.calendarModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.calendarHeader}>
              <button className={styles.calendarButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <span className={styles.calendarMonth}>
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button className={styles.calendarButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            <div className={styles.calendarBody}>
              <div className={styles.calendarGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <span key={day} className={styles.calendarDayLabel}>
                    {day}
                  </span>
                ))}
                {calendarDays.map(({ date, inCurrentMonth }) => {
                  const isSelected = isDateSelected(date)
                  const { start, end } = selectedDateRange

                  const classNames = [styles.calendarDay]
                  if (!inCurrentMonth) classNames.push(styles.calendarDayOutside)
                  if (isSelected) classNames.push(styles.calendarDaySelected)
                  if (start && end && date > start && date < end) classNames.push(styles.calendarDayInRange)

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={classNames.join(' ')}
                      onClick={() => handleDateSelect(date)}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
              <div className={styles.calendarFooter}>
                <button type="button" className={`${styles.calendarAction} ${styles.cancel}`} onClick={() => setShowCalendar(false)}>
                  Cancel
                </button>
                <button type="button" className={`${styles.calendarAction} ${styles.apply}`} onClick={() => setShowCalendar(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.deleteOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.deleteModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              <div className={styles.deleteIcon}>
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Delete Transaction</h3>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                Are you sure you want to delete this transaction? Stock levels will be restored.
              </p>
            </div>
            <div className={styles.deleteActions}>
              <button type="button" className={styles.deleteButtonSecondary} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className={styles.deleteButtonPrimary} onClick={handleDelete}>
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {showBranchSelector && canSwitchBranches && (
        <div className={styles.branchModalOverlay} onClick={() => setShowBranchSelector(false)}>
          <div className={styles.branchModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.branchModalHeader}>
              <div>
                <p className={styles.branchModalLabel}>Current Branch</p>
                <h2 className={styles.branchModalTitle}>{selectedBranch?.branch_name || 'Select Branch'}</h2>
              </div>
              <button type="button" className={styles.closeModalButton} onClick={() => setShowBranchSelector(false)} aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.branchSelectorContainer}>
              <BranchSelector
                showLabel={false}
                size="sm"
                onSelectBranch={() => setShowBranchSelector(false)}
              />
              {!canSwitchBranches && (
                <p className={styles.branchSelectorNotice}>Branch switching is not available for your role.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedTransaction && (
        <div className={styles.detailOverlay} onClick={closeTransactionDetail} role="dialog" aria-modal="true">
          <div className={`${styles.detailModal} ${styles.detailModalOpen}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div>
                <p className={styles.detailSubheading}>Transaction Details</p>
                <h2 className={styles.detailTitle}>#{selectedTransaction.sale_id.toString().padStart(6, '0')}</h2>
              </div>
              <button type="button" className={styles.closeDetailButton} onClick={closeTransactionDetail} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className={styles.detailBody}>
              <section className={styles.detailSection}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Customer</span>
                  <span className={styles.detailValue}>{selectedTransaction.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValueStrong}>
                    {selectedTransaction.partial_payment
                      ? `${formatCurrency(selectedTransaction.partial_amount || 0)} paid · ${formatCurrency(selectedTransaction.remaining_amount || 0)} owed`
                      : formatCurrency(selectedTransaction.total_amount)}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Payment</span>
                  <span className={styles.detailValue}>{selectedTransaction.payment_method.replace('_', ' ')}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span
                    className={`${styles.detailStatus} ${selectedTransaction.partial_payment ? styles.detailStatusPartial : styles.detailStatusComplete}`}
                  >
                    {selectedTransaction.partial_payment ? 'Partial Payment' : 'Completed'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailValue}>{formatDateTime(selectedTransaction.datetime)}</span>
                </div>
              </section>

              <section className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>Items Purchased</h3>
                <div className={styles.detailItems}>
                  {detailItems.map((item) => (
                    <div key={`${item.sale_item_id}-${item.product_id}`} className={styles.detailItem}>
                      <div className={styles.detailItemAvatar}>
                        {item.products?.image_url ? (
                          <img 
                            src={item.products.image_url} 
                            alt={item.products?.name || 'Product'} 
                            className={styles.detailItemImage}
                          />
                        ) : (
                          <span>{item.products?.name?.charAt(0)?.toUpperCase() || '•'}</span>
                        )}
                      </div>
                      <div className={styles.detailItemInfo}>
                        <p className={styles.detailItemName}>{item.products?.name || 'Unknown Item'}</p>
                        <p className={styles.detailItemMeta}>
                          Qty: {item.quantity}
                          {item.products?.is_weighted && item.weight ? ` · ${item.weight}${item.products?.weight_unit || ''}` : ''}
                          {' '}
                          × {formatCurrency(item.price_each)}
                        </p>
                      </div>
                      <span className={styles.detailItemAmount}>{formatCurrency(item.calculated_price ?? item.quantity * item.price_each)}</span>
                    </div>
                  ))}
                  {detailItems.length === 0 && (
                    <p className={styles.detailEmptyItems}>Items for this sale are not available.</p>
                  )}
                </div>
              </section>

              <section className={styles.detailSection}>
                <div className={styles.detailActions}>
                  {selectedTransaction.partial_payment && (
                    <button
                      type="button"
                      className={`${styles.detailActionButton} ${styles.detailPrimaryAction}`}
                      onClick={() => handleResolve(selectedTransaction.sale_id)}
                    >
                      Complete Payment
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.detailActionButton}
                    onClick={() => {
                      closeTransactionDetail()
                      navigate(`/transaction/${selectedTransaction.sale_id}`)
                    }}
                  >
                    Process Refund
                  </button>
                  <button
                    type="button"
                    className={styles.detailActionButton}
                    onClick={() => {
                      closeTransactionDetail()
                      navigate(`/sales-mobile?transaction=${selectedTransaction.sale_id}`)
                    }}
                  >
                    Edit Transaction
                  </button>
                  <button
                    type="button"
                    className={`${styles.detailActionButton} ${styles.detailDestructiveAction}`}
                    onClick={() => {
                      closeTransactionDetail()
                      setTransactionToDelete(selectedTransaction.sale_id)
                      setShowDeleteModal(true)
                    }}
                  >
                    Delete Transaction
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsMobile
