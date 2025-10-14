import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../contexts/AuthContext'
import { useBranch } from '../contexts/BranchContext'
import PageLayout from '../components/ui/PageLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import TransactionFilters from '../components/transactions/TransactionFilters'
import TransactionCard from '../components/transactions/TransactionCard'
import Pagination from '../components/ui/Pagination'
import Calendar from '../components/ui/Calendar'

const Transactions: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedBranchId } = useBranch()
  const { transactions, loading, error, deleteTransaction, resolvePartialPayment, fetchTransactions } = useTransactions()
  
  // Filter and search statesa
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedDateString, setSelectedDateString] = useState<string | null>(null)
  const [partialPaymentFilter, setPartialPaymentFilter] = useState('all')
  
  // Calendar states
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  })
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  // Sort states
  const [sortBy] = useState('datetime')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Refresh latest transactions on mount and when window/tab regains focus
  useEffect(() => {
    fetchTransactions()
    const handleFocus = () => fetchTransactions()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchTransactions()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchTransactions])


  // Filter transactions based on search, payment method, and date
  const filterTransactions = (transactions: any[]) => {
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.sale_id.toString().includes(searchTerm) ||
        transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPayment = paymentFilter === 'all' || 
        transaction.payment_method === paymentFilter
      
      const matchesPartialPayment = () => {
        if (partialPaymentFilter === 'all') return true
        if (partialPaymentFilter === 'partial') return transaction.partial_payment === true
        if (partialPaymentFilter === 'full') return !transaction.partial_payment
        return true
      }
      
      const matchesDate = () => {
        if (selectedDateString) {
          // Create local dates for comparison
          const transactionDate = new Date(transaction.datetime)
          const transactionLocal = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate())
          
          // Parse the selected date string (YYYY-MM-DD format)
          const [year, month, day] = selectedDateString.split('-').map(Number)
          const selectedLocalDate = new Date(year, month - 1, day) // month is 0-indexed
          
          return transactionLocal.getTime() === selectedLocalDate.getTime()
        }
        
        if (dateFilter === 'all') return true
        
        const now = new Date()
        const transactionDate = new Date(transaction.datetime)
        
        // Create local dates for comparison
        const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const transactionLocal = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate())
        
        switch (dateFilter) {
          case 'today':
            return transactionLocal.getTime() === nowLocal.getTime()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return transactionDate >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            return transactionDate >= monthAgo
          default:
            return true
        }
      }
      
      return matchesSearch && matchesPayment && matchesPartialPayment() && matchesDate()
    })
  }

  // Sort transactions
  const sortTransactions = (transactions: any[]) => {
    return [...transactions].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'datetime') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  // Get filtered and sorted transactions
  const filteredTransactions = filterTransactions(transactions)
  const sortedTransactions = sortTransactions(filteredTransactions)
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)

  // Calendar functions
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    // const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const handleCalendarDateSelect = (date: Date) => {
    // Create a local date to avoid timezone issues
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    setSelectedDate(localDate)
    
    // Format date as YYYY-MM-DD for string storage
    const year = localDate.getFullYear()
    const month = String(localDate.getMonth() + 1).padStart(2, '0')
    const day = String(localDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    setSelectedDateString(dateString)
    setDateFilter('custom')
    setShowCalendar(false)
  }

  const handleTodaySelect = () => {
    const today = new Date()
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    setSelectedDate(todayLocal)
    
    // Format today's date as YYYY-MM-DD
    const year = todayLocal.getFullYear()
    const month = String(todayLocal.getMonth() + 1).padStart(2, '0')
    const day = String(todayLocal.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    setSelectedDateString(dateString)
    setDateFilter('custom')
    setShowCalendar(false)
  }

  // Event handlers
  const handleTransactionClick = (saleId: number) => {
    navigate(`/transaction/${saleId}`)
  }

  const handleDeleteTransaction = async (saleId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction? This action cannot be undone and will restore the stock for all items in this transaction.'
    )
    
    if (confirmed) {
      const success = await deleteTransaction(saleId)
      if (success) {
        alert('Transaction deleted successfully!')
      }
    }
  }

  const handleResolvePartialPayment = async (saleId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to mark this partial payment as resolved? This will update the transaction to show it as fully paid.'
    )
    
    if (confirmed) {
      const success = await resolvePartialPayment(saleId)
      if (success) {
        alert('Partial payment resolved successfully!')
      }
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count)
    setCurrentPage(1)
  }


  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, paymentFilter, dateFilter, selectedDateString, sortBy, sortOrder])

  // Refresh transactions when branch changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranchId])

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <PageLayout>
  //       <div style={{ 
  //         display: 'flex', 
  //         justifyContent: 'center', 
  //         alignItems: 'center', 
  //         minHeight: '400px' 
  //       }}>
  //         <div style={{ 
  //           fontSize: '20px', 
  //           color: '#1a1a1a',
  //           display: 'flex',
  //           alignItems: 'center',
  //           gap: '12px'
  //         }}>
  //           <i className="fa-solid fa-spinner" style={{ 
  //             animation: 'spin 1s linear infinite',
  //             fontSize: '24px'
  //           }}></i>
  //           Loading transactions...
  //         </div>
  //       </div>
  //     </PageLayout>
  //   )
  // }

  if (error) {
    return (
      <PageLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}>
          <div style={{ 
            fontSize: '18px', 
            color: '#ef4444',
            textAlign: 'center'
          }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ 
              fontSize: '24px',
              marginBottom: '12px',
              display: 'block'
            }}></i>
            {error}
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Transactions"
        subtitle="View and manage all sales transactions"
        icon="fa-solid fa-receipt"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Date Range Picker */}
          <div 
            onClick={() => setShowCalendar(true)}
            style={{
              background: '#3e3f29',
              border: '1px solid #1a1a1a',
              borderRadius: '8px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f1f0e4',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fa-solid fa-calendar" style={{ fontSize: '16px', color: '#bca88d' }}></i>
            <span style={{ color: '#bca88d' }}>
              {selectedDate.toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit', 
                year: 'numeric' 
              })}
            </span>
          </div>

          {/* Transaction Count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#1a1a1a',
            fontSize: '14px',
            flexWrap: 'wrap'
          }}>
            <i className="fa-solid fa-receipt"></i>
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} of {sortedTransactions.length} transactions
              {selectedDateString && (
                <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                  {' '}on {new Date(selectedDateString).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              )}
              {dateFilter !== 'all' && !selectedDateString && (
                <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                  {' '}({dateFilter === 'today' ? 'Today' : 
                    dateFilter === 'week' ? 'Last 7 days' : 
                    dateFilter === 'month' ? 'Last 30 days' : dateFilter})
                </span>
              )}
            </span>
          </div>
        </div>
      </PageHeader>

      <div style={{ padding: '24px 32px', flex: 1 }}>
        {/* Filters */}
        <TransactionFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          selectedDate={selectedDateString}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={handleItemsPerPageChange}
          onCalendarDateSelect={handleCalendarDateSelect}
          generateCalendarDays={generateCalendarDays}
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          partialPaymentFilter={partialPaymentFilter}
          setPartialPaymentFilter={setPartialPaymentFilter}
        />

        {/* Transactions Table */}
        <Card>
          {paginatedTransactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.sale_id}
                  transaction={transaction}
                  onTransactionClick={handleTransactionClick}
                  onDeleteTransaction={handleDeleteTransaction}
                  onResolvePartialPayment={handleResolvePartialPayment}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <img 
                src="/images/vectors/transactions.png" 
                alt="No transactions" 
                style={{ 
                  width: '300px', 
                  height: 'auto',
                  opacity: 0.8
                }} 
              />
            </div>
          )}
        </Card>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={sortedTransactions.length}
        />

        {/* Dashboard-style Calendar */}
        <Calendar
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={selectedDate}
          onDateSelect={handleCalendarDateSelect}
          onTodaySelect={handleTodaySelect}
          calendarDate={calendarDate}
          onCalendarDateChange={setCalendarDate}
        />

      </div>
    </PageLayout>
  )
}

export default Transactions
