import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import LowStockSection from '../components/dashboard/LowStockSection'
import ProductAnalyticsSection from '../components/dashboard/ProductAnalyticsSection'
import SalesChart from '../components/dashboard/SalesChart'

interface Transaction {
  transaction_id: string
  datetime: string
  total_amount: number
  payment_method: string
  items_count: number
}

interface RecentTransaction {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  items_count: number
  status: 'completed' | 'pending'
}


const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    todaySideBusinessRevenue: 0,
    todayTransactions: 0,
    lowStockItems: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])

  useEffect(() => {
    fetchDashboardStats()
    fetchRecentTransactions()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch counts from each table (temporarily bypass RLS for testing)
      const [productsResult, salesResult, customersResult] = await Promise.all([
        supabase.from('products').select('product_id', { count: 'exact', head: true }).limit(1000),
        supabase.from('sales').select('sale_id', { count: 'exact', head: true }).limit(1000),
        supabase.from('customers').select('customer_id', { count: 'exact', head: true }).limit(1000)
      ])

      // Fetch today's revenue and transaction count
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySales, count: todayTransactionsCount } = await supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .gte('datetime', `${today}T00:00:00`)
        .lt('datetime', `${today}T23:59:59`)

      const todayRevenue = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch today's side business revenue
      const { data: todaySideBusinessSales } = await supabase
        .from('side_business_sales')
        .select('total_amount')
        .gte('date_time', `${today}T00:00:00`)
        .lt('date_time', `${today}T23:59:59`)

      const todaySideBusinessRevenue = todaySideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch low stock items (less than 10 in stock)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('product_id', { count: 'exact', head: true })
        .lt('stock_quantity', 10)

      setStats({
        totalProducts: productsResult.count || 0,
        totalSales: salesResult.count || 0,
        totalCustomers: customersResult.count || 0,
        todayRevenue,
        todaySideBusinessRevenue,
        todayTransactions: todayTransactionsCount || 0,
        lowStockItems: lowStockCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Show error to user
      alert(`Dashboard loading error: ${error.message || 'Unknown error'}. Please check your database permissions.`)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('sales')
        .select(`
          sale_id,
          datetime,
          total_amount,
          payment_method,
          sale_items (quantity)
        `)
        .order('datetime', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent transactions:', error)
        return
      }

      const formattedTransactions: RecentTransaction[] = (transactions || []).map(transaction => ({
        sale_id: transaction.sale_id,
        datetime: transaction.datetime,
        total_amount: transaction.total_amount,
        payment_method: transaction.payment_method,
        items_count: transaction.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        status: 'completed' as const
      }))

      setRecentTransactions(formattedTransactions)
    } catch (error) {
      console.error('Error in fetchRecentTransactions:', error)
    }
  }


  const fetchDayTransactions = async (dayName: string) => {
    try {
      setTransactionsLoading(true)
      setSelectedDay(dayName)

      // Calculate the date for the selected day (this week)
      const today = new Date()
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const dayMap = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0 }
      const targetDay = dayMap[dayName as keyof typeof dayMap]
      
      // Calculate days to subtract to get to the target day
      const daysToSubtract = (currentDay - targetDay + 7) % 7
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() - daysToSubtract)
      
      const startDate = targetDate.toISOString().split('T')[0]
      const endDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Fetch transactions for that day
      const { data: transactions, error } = await supabase
        .from('sales')
        .select('sale_id, datetime, total_amount, payment_method')
        .gte('datetime', `${startDate}T00:00:00`)
        .lt('datetime', `${endDate}T00:00:00`)
        .order('datetime', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      // Transform data to match our interface
      const transformedTransactions: Transaction[] = (transactions || []).map(transaction => ({
        transaction_id: `TXN-${transaction.sale_id.toString().padStart(6, '0')}`,
        datetime: transaction.datetime,
        total_amount: transaction.total_amount,
        payment_method: transaction.payment_method,
        items_count: Math.floor(Math.random() * 5) + 1 // Mock item count
      }))

      setDayTransactions(transformedTransactions)
    } catch (error) {
      console.error('Error fetching day transactions:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedDay(null)
    setDayTransactions([])
  }

  const handleTransactionClick = (transactionId: string) => {
    closeModal()
    navigate(`/transaction/${transactionId}`)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setShowCalendar(false)
    // Refresh dashboard data for selected date
    fetchDashboardStatsForDate(date)
  }

  const fetchDashboardStatsForDate = async (date: Date) => {
    try {
      setLoading(true)
      
      const dateString = date.toISOString().split('T')[0]
      
      // Fetch counts from each table for the selected date
      const [productsResult, salesResult, customersResult] = await Promise.all([
        supabase.from('products').select('product_id', { count: 'exact', head: true }),
        supabase.from('sales').select('sale_id', { count: 'exact', head: true })
          .gte('datetime', `${dateString}T00:00:00`)
          .lt('datetime', `${dateString}T23:59:59`),
        supabase.from('customers').select('customer_id', { count: 'exact', head: true })
      ])

      // Fetch revenue and transaction count for selected date
      const { data: daySales, count: dayTransactionsCount } = await supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .gte('datetime', `${dateString}T00:00:00`)
        .lt('datetime', `${dateString}T23:59:59`)

      const dayRevenue = daySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch side business revenue for selected date
      const { data: daySideBusinessSales } = await supabase
        .from('side_business_sales')
        .select('total_amount')
        .gte('date_time', `${dateString}T00:00:00`)
        .lt('date_time', `${dateString}T23:59:59`)

      const daySideBusinessRevenue = daySideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch low stock items (less than 10 in stock)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('product_id', { count: 'exact', head: true })
        .lt('stock_quantity', 10)

      setStats({
        totalProducts: productsResult.count || 0,
        totalSales: salesResult.count || 0,
        totalCustomers: customersResult.count || 0,
        todayRevenue: dayRevenue,
        todaySideBusinessRevenue: daySideBusinessRevenue,
        todayTransactions: dayTransactionsCount || 0,
        lowStockItems: lowStockCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats for date:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
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


  const statCards = [
    {
      title: "Today's Sales",
      value: `€${(stats.todayRevenue + stats.todaySideBusinessRevenue).toFixed(2)}`,
      change: `Products: €${stats.todayRevenue.toFixed(2)} | Side Business: €${stats.todaySideBusinessRevenue.toFixed(2)}`,
      changeColor: '#1a1a1a',
      icon: 'fa-solid fa-euro-sign',
      bgColor: '#1a1a1a',
      iconColor: '#f1f0e4'
    },
    {
      title: 'Transactions',
      value: stats.todayTransactions,
      change: "+8% from yesterday",
      changeColor: '#bca88d',
      icon: 'fa-solid fa-shopping-cart',
      bgColor: '#bca88d',
      iconColor: '#1a1a1a'
    }
  ]

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ 
          fontSize: '20px', 
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fa-solid fa-spinner" style={{ 
            animation: 'spin 1s linear infinite',
            fontSize: '24px'
          }}></i>
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#1a1a1a',
            margin: 0
          }}>
            Welcome back! Here's an overview of your business.
          </p>
        </div>
        
        {/* Date Range Picker */}
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
              {selectedDate.toLocaleDateString('en-US', { 
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
      </div>
      
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '32px',
        minHeight: '140px'
      }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px'
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{ 
                  color: '#1a1a1a', 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  margin: '0 0 12px 0' 
                }}>
                  {card.title}
                </p>
                <p style={{ 
                  fontSize: '36px', 
                  fontWeight: 'bold', 
                  color: '#1a1a1a', 
                  margin: '0 0 8px 0',
                  lineHeight: '1.1'
                }}>
                  {card.value}
                </p>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: card.changeColor, 
                  margin: 0 
                }}>
                  {card.change}
                </p>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
                marginTop: '16px'
              }}>
                <i className={card.icon} style={{ 
                  fontSize: '24px', 
                  color: card.iconColor 
                }}></i>
              </div>
            </div>
          </div>
        ))}
        
        {/* Low Stock Section as Third Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '120px'
        }}
        >
          <LowStockSection />
        </div>
      </div>

      {/* Recent Transactions and Top Products */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Recent Transactions */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-clock" style={{ fontSize: '18px', color: '#f1f0e4' }}></i>
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: '#1a1a1a', 
              margin: 0 
            }}>
              Recent Transactions
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <div 
                  key={transaction.sale_id}
                  onClick={() => navigate(`/transaction/TXN-${transaction.sale_id.toString().padStart(6, '0')}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: transaction.status === 'completed' ? '#10b981' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={`fa-solid ${transaction.status === 'completed' ? 'fa-check' : 'fa-hourglass-half'}`} 
                       style={{ fontSize: '12px', color: 'white' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1a1a1a', 
                      margin: '0 0 2px 0' 
                    }}>
                      #TXN-{transaction.sale_id.toString().padStart(6, '0')}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#1a1a1a', 
                      margin: 0 
                    }}>
                      {transaction.items_count} item{transaction.items_count !== 1 ? 's' : ''} • {transaction.payment_method}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1a1a1a', 
                      margin: 0 
                    }}>
                      €{transaction.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                color: '#1a1a1a',
                fontSize: '14px'
              }}>
                No recent transactions
              </div>
            )}
          </div>
        </div>

        {/* Product Analytics */}
        <ProductAnalyticsSection />
      </div>

      {/* Sales Chart */}
      <SalesChart />

      {/* Transactions Modal */}
      {selectedDay && (
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
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(125, 141, 134, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(125, 141, 134, 0.2)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: 0
              }}>
                {selectedDay} Transactions
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                ×
              </button>
            </div>

            {/* Transactions List */}
            {transactionsLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px'
              }}>
                <div style={{
                  fontSize: '16px',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <i className="fa-solid fa-spinner" style={{
                    animation: 'spin 1s linear infinite',
                    fontSize: '20px'
                  }}></i>
                  Loading transactions...
                </div>
              </div>
            ) : dayTransactions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayTransactions.map((transaction, index) => (
                  <div key={index} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleTransactionClick(transaction.transaction_id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#1a1a1a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f1f0e4',
                        fontSize: '16px'
                      }}>
                        <i className="fa-solid fa-check" style={{ fontSize: '14px' }}></i>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          margin: '0 0 4px 0'
                        }}>
                          {transaction.transaction_id}
                        </p>
                        <p style={{
                          fontSize: '12px',
                          color: '#1a1a1a',
                          margin: 0
                        }}>
                          {new Date(transaction.datetime).toLocaleTimeString()} • {transaction.items_count} items • {transaction.payment_method}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      €{transaction.total_amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#1a1a1a'
              }}>
                <i className="fa-solid fa-receipt" style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  opacity: 0.5
                }}></i>
                <p style={{ fontSize: '16px', margin: 0 }}>
                  No transactions found for {selectedDay}
                </p>
              </div>
            )}
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
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(125, 141, 134, 0.2)'
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
                color: '#1a1a1a',
                margin: 0
              }}>
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
                <button
                  onClick={() => setShowCalendar(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
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
                  color: '#1a1a1a',
                  padding: '8px 4px'
                }}>
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {generateCalendarDays(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, index) => {
                const isCurrentMonth = day.getMonth() === calendarDate.getMonth()
                const isToday = day.toDateString() === new Date().toDateString()
                const isSelected = day.toDateString() === selectedDate.toDateString()
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    style={{
                      background: isSelected ? '#1a1a1a' : 'transparent',
                      color: isSelected ? '#f1f0e4' : isCurrentMonth ? '#1a1a1a' : '#bca88d',
                      border: isToday ? '2px solid #1a1a1a' : '1px solid transparent',
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

export default Dashboard
