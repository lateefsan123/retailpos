import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/currency'
import { useBusinessId } from '../hooks/useBusinessId'
import { useSalesData } from '../hooks/data/useSalesData'
import { useProductsData } from '../hooks/data/useProductsData'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { useBranch } from '../contexts/BranchContext'
import BranchSelector from '../components/BranchSelector'
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
  partial_payment?: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
}


const Dashboard = () => {
  const navigate = useNavigate()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { data: salesData } = useSalesData()
  const { data: productsData } = useProductsData()
  const { user, switchUser } = useAuth()
  const { currentBusiness } = useBusiness()
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
  const [transactionsModalDate, setTransactionsModalDate] = useState<Date | null>(null)
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month'>('today')
  const [sideBusinessBreakdown, setSideBusinessBreakdown] = useState<Array<{
    business_id: number
    name: string
    image_url: string | null
    total_amount: number
  }>>([])
  const [previousDayTransactions, setPreviousDayTransactions] = useState<number>(0)
  const [sideBusinessTransactionCount, setSideBusinessTransactionCount] = useState<number>(0)

  useEffect(() => {
    // Calculate stats from cached data instead of making API calls
    if (salesData && productsData && !businessLoading && businessId != null) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Calculate today's revenue from cached sales data
      const todaySales = salesData.sales.filter(sale => {
        const saleDate = new Date(sale.datetime)
        return saleDate >= today && saleDate < tomorrow
      })

      const todaySideBusinessSales = salesData.sideBusinessSales.filter(sale => {
        const saleDate = new Date(sale.date_time)
        return saleDate >= today && saleDate < tomorrow
      })

      const todayRevenue = todaySales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount.toString()) || 0), 0)
      const todaySideBusinessRevenue = todaySideBusinessSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount.toString()) || 0), 0)

      // Calculate low stock items from cached products data
      const lowStockItems = productsData.products.filter(product => 
        product.stock_quantity <= product.reorder_level
      ).length

      setStats({
        totalProducts: productsData.products.length,
        totalSales: salesData.sales.length,
        totalCustomers: 0, // We'll need to add customers data to the cache later
        todayRevenue,
        todaySideBusinessRevenue,
        todayTransactions: todaySales.length,
        lowStockItems
      })

      // Set side business transaction count for pie chart
      setSideBusinessTransactionCount(todaySideBusinessSales.length)

      setLoading(false)
    } else if (businessId == null && !businessLoading) {
      // Reset stats when no business is selected
      setStats({
        totalProducts: 0,
        totalSales: 0,
        totalCustomers: 0,
        todayRevenue: 0,
        todaySideBusinessRevenue: 0,
        todayTransactions: 0,
        lowStockItems: 0
      })
      setSideBusinessTransactionCount(0)
      setLoading(false)
    }
  }, [businessId, businessLoading, salesData?.sales?.length, productsData?.products?.length])

  useEffect(() => {
    // If we have cached data but no today's sales, fetch fresh data
    if (salesData && productsData && !businessLoading && businessId != null && stats.todayTransactions === 0) {
      const today = new Date()
      const isToday = selectedDate.toDateString() === today.toDateString()
      
      if (isToday && activePeriod === 'today') {
        // Fetch fresh data for today if cached data shows no sales
        fetchDashboardStats()
      }
    }
  }, [activePeriod, selectedDate, businessId, businessLoading, salesData, productsData, stats.todayTransactions])

  // Fetch recent transactions when component mounts or when business/date changes
  useEffect(() => {
    if (businessId && !businessLoading) {
      if (activePeriod === 'today') {
        fetchRecentTransactions(selectedDate)
      } else {
        fetchRecentTransactionsForPeriod(activePeriod, selectedDate)
      }
    }
  }, [businessId, businessLoading, selectedDate, activePeriod, selectedBranchId])

  const fetchDashboardStats = async () => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setStats({
        totalProducts: 0,
        totalSales: 0,
        totalCustomers: 0,
        todayRevenue: 0,
        todaySideBusinessRevenue: 0,
        todayTransactions: 0,
        lowStockItems: 0
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch counts from each table filtered by business_id
      let salesCountQuery = supabase.from('sales').select('sale_id', { count: 'exact', head: true }).eq('business_id', businessId).limit(1000)
      if (selectedBranchId) {
        salesCountQuery = salesCountQuery.eq('branch_id', selectedBranchId)
      }
      
      const [productsResult, salesResult, customersResult] = await Promise.all([
        supabase.from('products').select('product_id', { count: 'exact', head: true }).eq('business_id', businessId).limit(1000),
        salesCountQuery,
        supabase.from('customers').select('customer_id', { count: 'exact', head: true }).eq('business_id', businessId).limit(1000)
      ])

      // Fetch today's revenue and transaction count
      const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const today = ymdLocal(new Date())
      let todaySalesQuery = supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('datetime', `${today}T00:00:00`)
        .lt('datetime', `${today}T23:59:59`)
      
      // Filter by branch if selected
      if (selectedBranchId) {
        todaySalesQuery = todaySalesQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: todaySales, count: todayTransactionsCount } = await todaySalesQuery

      const todayRevenue = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch previous day's transaction count for percentage calculation
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = ymdLocal(yesterday)
      let yesterdaySalesQuery = supabase
        .from('sales')
        .select('sale_id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('datetime', `${yesterdayStr}T00:00:00`)
        .lt('datetime', `${yesterdayStr}T23:59:59`)
      
      // Filter by branch if selected
      if (selectedBranchId) {
        yesterdaySalesQuery = yesterdaySalesQuery.eq('branch_id', selectedBranchId)
      }
      
      const { count: yesterdayTransactionsCount } = await yesterdaySalesQuery

      setPreviousDayTransactions(yesterdayTransactionsCount || 0)

      // Fetch today's side business revenue with breakdown
      let sideBusinessQuery = supabase
        .from('side_business_sales')
        .select(`
          total_amount,
          side_business_items!inner(
            side_businesses!inner(
              business_id,
              name,
              image_url
            )
          )
        `, { count: 'exact' })
        .eq('side_business_items.side_businesses.parent_shop_id', businessId)
        .gte('date_time', `${today}T00:00:00`)
        .lt('date_time', `${today}T23:59:59`)
      
      // Filter by branch if selected
      if (selectedBranchId) {
        sideBusinessQuery = sideBusinessQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: todaySideBusinessSales, count: todaySideBusinessTransactionCount } = await sideBusinessQuery

      const todaySideBusinessRevenue = todaySideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      setSideBusinessTransactionCount(todaySideBusinessTransactionCount || 0)

      // Process side business breakdown for today
      const businessMap = new Map<number, { business_id: number; name: string; image_url: string | null; total_amount: number }>()
      if (todaySideBusinessSales) {
        todaySideBusinessSales.forEach(sale => {
          const business = (sale.side_business_items as any)?.side_businesses
          if (business) {
            const businessId = business.business_id
            const existing = businessMap.get(businessId)
            if (existing) {
              existing.total_amount += sale.total_amount || 0
            } else {
              businessMap.set(businessId, {
                business_id: businessId,
                name: business.name,
                image_url: business.image_url,
                total_amount: sale.total_amount || 0
              })
            }
          }
        })
      }
      setSideBusinessBreakdown(Array.from(businessMap.values()))

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Dashboard loading error: ${errorMessage}. Please check your database permissions.`)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async (date?: Date) => {
    if (businessLoading || businessId == null) {
      return
    }

    try {
      const targetDate = date || selectedDate
      const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const dateString = ymdLocal(targetDate)

      let query = supabase
        .from('sales')
        .select(`
          sale_id,
          datetime,
          total_amount,
          payment_method,
          partial_payment,
          partial_amount,
          remaining_amount,
          partial_notes,
          sale_items (quantity)
        `)
        .eq('business_id', businessId)
        .gte('datetime', `${dateString}T00:00:00`)
        .lt('datetime', `${dateString}T23:59:59`)
        .order('datetime', { ascending: false })
        .limit(5)

      // Add branch filtering if branch is selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: transactions, error } = await query

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
        status: 'completed' as const,
        partial_payment: transaction.partial_payment,
        partial_amount: transaction.partial_amount,
        remaining_amount: transaction.remaining_amount,
        partial_notes: transaction.partial_notes
      }))

      setRecentTransactions(formattedTransactions)
    } catch (error) {
      console.error('Error in fetchRecentTransactions:', error)
    }
  }

  const fetchDashboardStatsForPeriod = async (period: 'today' | 'week' | 'month', baseDate: Date) => {
    if (businessLoading || businessId == null) {
      return
    }

    try {
      setLoading(true)
      const { start, end } = getDateRangeForPeriod(period, baseDate)

      // Fetch sales data for the period
      let periodSalesQuery = supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('datetime', start)
        .lt('datetime', end)
      
      // Filter by branch if selected
      if (selectedBranchId) {
        periodSalesQuery = periodSalesQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: periodSales, count: periodTransactionsCount } = await periodSalesQuery

      const periodRevenue = periodSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch side business data for the period
      const { data: periodSideBusinessSales, count: periodSideBusinessTransactionCount } = await supabase
        .from('side_business_sales')
        .select(`
          total_amount,
          side_business_items!inner(
            side_businesses!inner(
              business_id,
              name,
              image_url
            )
          )
        `, { count: 'exact' })
        .eq('side_business_items.side_businesses.parent_shop_id', businessId)
        .gte('date_time', start)
        .lt('date_time', end)

      const periodSideBusinessRevenue = periodSideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      setSideBusinessTransactionCount(periodSideBusinessTransactionCount || 0)

      // Process side business breakdown for the period
      const businessMap = new Map<number, { business_id: number; name: string; image_url: string | null; total_amount: number }>()
      if (periodSideBusinessSales) {
        periodSideBusinessSales.forEach(sale => {
          const business = (sale.side_business_items as any)?.side_businesses
          if (business) {
            const businessId = business.business_id
            const existing = businessMap.get(businessId)
            if (existing) {
              existing.total_amount += sale.total_amount || 0
            } else {
              businessMap.set(businessId, {
                business_id: businessId,
                name: business.name,
                image_url: business.image_url,
                total_amount: sale.total_amount || 0
              })
            }
          }
        })
      }
      setSideBusinessBreakdown(Array.from(businessMap.values()))

      // Fetch low stock items (always current)
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('product_id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .lt('stock_quantity', 10)

      setStats({
        totalProducts: 0, // Not period-specific
        totalSales: 0, // Not period-specific
        totalCustomers: 0, // Not period-specific
        todayRevenue: periodRevenue,
        todaySideBusinessRevenue: periodSideBusinessRevenue,
        todayTransactions: periodTransactionsCount || 0,
        lowStockItems: lowStockCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats for period:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactionsForPeriod = async (period: 'today' | 'week' | 'month', baseDate: Date) => {
    if (businessLoading || businessId == null) {
      return
    }

    try {
      const { start, end } = getDateRangeForPeriod(period, baseDate)

      let query = supabase
        .from('sales')
        .select(`
          sale_id,
          datetime,
          total_amount,
          payment_method,
          partial_payment,
          partial_amount,
          remaining_amount,
          partial_notes,
          sale_items (quantity)
        `)
        .eq('business_id', businessId)
        .gte('datetime', start)
        .lt('datetime', end)
        .order('datetime', { ascending: false })
        .limit(5)

      // Add branch filtering if branch is selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: transactions, error } = await query

      if (error) {
        console.error('Error fetching recent transactions for period:', error)
        return
      }

      const formattedTransactions: RecentTransaction[] = (transactions || []).map(transaction => ({
        sale_id: transaction.sale_id,
        datetime: transaction.datetime,
        total_amount: transaction.total_amount,
        payment_method: transaction.payment_method,
        items_count: transaction.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        status: 'completed' as const,
        partial_payment: transaction.partial_payment,
        partial_amount: transaction.partial_amount,
        remaining_amount: transaction.remaining_amount,
        partial_notes: transaction.partial_notes
      }))

      setRecentTransactions(formattedTransactions)
    } catch (error) {
      console.error('Error in fetchRecentTransactionsForPeriod:', error)
    }
  }


  const openTransactionsModalForDate = async (date: Date) => {
    try {
      setTransactionsLoading(true)
      const targetDate = new Date(date)
      setTransactionsModalDate(targetDate)
      setDayTransactions([])

      const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const dateString = ymdLocal(targetDate)

      const { data: transactions, error } = await supabase
        .from('sales')
        .select(`
          sale_id,
          datetime,
          total_amount,
          payment_method,
          sale_items (quantity)
        `)
        .gte('datetime', `${dateString}T00:00:00`)
        .lt('datetime', `${dateString}T23:59:59`)
        .order('datetime', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      const transformedTransactions: Transaction[] = (transactions || []).map(transaction => ({
        transaction_id: `TXN-${transaction.sale_id.toString().padStart(6, '0')}`,
        datetime: transaction.datetime,
        total_amount: transaction.total_amount,
        payment_method: transaction.payment_method,
        items_count: transaction.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
      }))

      setDayTransactions(transformedTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }

  const closeModal = () => {
    setTransactionsModalDate(null)
    setDayTransactions([])
  }

  const handleTransactionClick = (transactionId: string) => {
    closeModal()
    navigate(`/transaction/${transactionId}`)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setShowCalendar(false)
    // Fetch stats for the selected date
    fetchDashboardStatsForDate(date)
  }

  const fetchDashboardStatsForDate = async (date: Date) => {
    try {
      setLoading(true)
      
      const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const dateString = ymdLocal(date)
      
      // Fetch counts from each table for the selected date
      let daySalesCountQuery = supabase.from('sales').select('sale_id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('datetime', `${dateString}T00:00:00`)
        .lt('datetime', `${dateString}T23:59:59`)
      
      if (selectedBranchId) {
        daySalesCountQuery = daySalesCountQuery.eq('branch_id', selectedBranchId)
      }
      
      const [productsResult, salesResult, customersResult] = await Promise.all([
        supabase.from('products').select('product_id', { count: 'exact', head: true }).eq('business_id', businessId),
        daySalesCountQuery,
        supabase.from('customers').select('customer_id', { count: 'exact', head: true }).eq('business_id', businessId)
      ])

      // Fetch revenue and transaction count for selected date
      let daySalesQuery = supabase
        .from('sales')
        .select('total_amount', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('datetime', `${dateString}T00:00:00`)
        .lt('datetime', `${dateString}T23:59:59`)
      
      if (selectedBranchId) {
        daySalesQuery = daySalesQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: daySales, count: dayTransactionsCount } = await daySalesQuery

      const dayRevenue = daySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

      // Fetch previous day's transaction count for percentage calculation
      const previousDay = new Date(date)
      previousDay.setDate(previousDay.getDate() - 1)
      const previousDayStr = ymdLocal(previousDay)
      let previousDayQuery = supabase
        .from('sales')
        .select('sale_id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('datetime', `${previousDayStr}T00:00:00`)
        .lt('datetime', `${previousDayStr}T23:59:59`)
      
      if (selectedBranchId) {
        previousDayQuery = previousDayQuery.eq('branch_id', selectedBranchId)
      }
      
      const { count: previousDayTransactionsCount } = await previousDayQuery

      setPreviousDayTransactions(previousDayTransactionsCount || 0)

      // Fetch side business revenue for selected date with breakdown
      const { data: daySideBusinessSales, count: daySideBusinessTransactionCount } = await supabase
        .from('side_business_sales')
        .select(`
          total_amount,
          side_business_items!inner(
            side_businesses!inner(
              business_id,
              name,
              image_url
            )
          )
        `, { count: 'exact' })
        .gte('date_time', `${dateString}T00:00:00`)
        .lt('date_time', `${dateString}T23:59:59`)

      const daySideBusinessRevenue = daySideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      setSideBusinessTransactionCount(daySideBusinessTransactionCount || 0)

      // Process side business breakdown
      const businessMap = new Map<number, { business_id: number; name: string; image_url: string | null; total_amount: number }>()
      if (daySideBusinessSales) {
        daySideBusinessSales.forEach(sale => {
          const business = (sale.side_business_items as any)?.side_businesses
          if (business) {
            const businessId = business.business_id
            const existing = businessMap.get(businessId)
            if (existing) {
              existing.total_amount += sale.total_amount || 0
            } else {
              businessMap.set(businessId, {
                business_id: businessId,
                name: business.name,
                image_url: business.image_url,
                total_amount: sale.total_amount || 0
              })
            }
          }
        })
      }
      setSideBusinessBreakdown(Array.from(businessMap.values()))

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
      
      // Update side business transaction count for breakdown calculation
      setSideBusinessTransactionCount(daySideBusinessTransactionCount || 0)
    } catch (error) {
      console.error('Error fetching dashboard stats for date:', error)
    } finally {
      setLoading(false)
    }
  }

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


  const getSalesCardTitle = () => {
    switch (activePeriod) {
      case 'today':
        const today = new Date()
        const isToday = selectedDate.toDateString() === today.toDateString()
        return isToday ? "Today's Sales" : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Sales`
      case 'week':
        return 'This Week Sales'
      case 'month':
        return 'This Month Sales'
      default:
        return "Today's Sales"
    }
  }

  const getTransactionsCardTitle = () => {
    switch (activePeriod) {
      case 'today':
        const today = new Date()
        const isToday = selectedDate.toDateString() === today.toDateString()
        return isToday ? 'Today\'s Transactions' : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Transactions`
      case 'week':
        return 'This Week Transactions'
      case 'month':
        return 'This Month Transactions'
      default:
        return 'Today\'s Transactions'
    }
  }

  const getTransactionPercentageChange = () => {
    if (previousDayTransactions === 0) {
      return stats.todayTransactions > 0 ? "+100%" : "0%"
    }
    
    const change = ((stats.todayTransactions - previousDayTransactions) / previousDayTransactions) * 100
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(0)}%`
  }

  const getProductTransactionCount = () => {
    return stats.todayTransactions - sideBusinessTransactionCount
  }

  const getTransactionBreakdown = () => {
    const productTransactions = getProductTransactionCount()
    const percentageChange = getTransactionPercentageChange()
    return {
      text: `Products: ${productTransactions} | Side Business: ${sideBusinessTransactionCount} (${percentageChange} from yesterday)`,
      icon: 'fa-solid fa-chart-pie'
    }
  }

  const getDateRangeForPeriod = (period: 'today' | 'week' | 'month', baseDate: Date) => {
    const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    
    switch (period) {
      case 'today':
        const todayStr = ymdLocal(baseDate)
        return {
          start: `${todayStr}T00:00:00`,
          end: `${todayStr}T23:59:59`
        }
      
      case 'week':
        const startOfWeek = new Date(baseDate)
        startOfWeek.setDate(baseDate.getDate() - baseDate.getDay()) // Sunday as week start
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      
      case 'month':
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        
        return {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        }
      
      default:
        return { start: '', end: '' }
    }
  }

  const getTransactionsModalTitle = (date: Date) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return isToday ? "Today's Transactions" : `${formattedDate} Transactions`
  }

  const getTransactionsModalEmptyState = (date: Date) => {
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return isToday ? 'No transactions found for today' : `No transactions found for ${formattedDate}`
  }

  const createPieChart = (productCount: number, sideBusinessCount: number, size: number = 150) => {
    const total = productCount + sideBusinessCount
    if (total === 0) return null

    const productPercentage = (productCount / total) * 100

    // Calculate angles for SVG path
    const productAngle = (productPercentage / 100) * 360

    // SVG path for pie slices
    const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
      const start = polarToCartesian(size/2, size/2, radius, endAngle)
      const end = polarToCartesian(size/2, size/2, radius, startAngle)
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
      return `M ${size/2} ${size/2} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
    }

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      }
    }

    const radius = size * 0.4

    return (
      <svg width={size} height={size} style={{ marginRight: '16px' }}>
        {productCount > 0 && (
          <path
            d={createArcPath(0, productAngle, radius)}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="3"
          />
        )}
        {sideBusinessCount > 0 && (
          <path
            d={createArcPath(productAngle, 360, radius)}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="3"
          />
        )}
      </svg>
    )
  }

  const statCards = [
    {
      title: getSalesCardTitle(),
      value: formatCurrency(stats.todayRevenue + stats.todaySideBusinessRevenue, {}, currentBusiness?.currency),
      change: `Products: ${formatCurrency(stats.todayRevenue, {}, currentBusiness?.currency)} | Side Business: ${formatCurrency(stats.todaySideBusinessRevenue, {}, currentBusiness?.currency)}`,
      changeColor: '#1a1a1a',
      icon: 'fa-solid fa-euro-sign',
      bgColor: '#1a1a1a',
      iconColor: '#f1f0e4'
    },
    {
      title: getTransactionsCardTitle(),
      value: stats.todayTransactions,
      change: getTransactionBreakdown().text,
      changeIcon: getTransactionBreakdown().icon,
      changeColor: '#bca88d',
      icon: 'fa-solid fa-shopping-cart',
      bgColor: '#bca88d',
      iconColor: '#1a1a1a',
      pieChart: {
        productCount: getProductTransactionCount(),
        sideBusinessCount: sideBusinessTransactionCount
      }
    }
  ]

  // Display cards with consistent currency formatting
  const displayCards = statCards

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <div style={{ padding: '0' }}>
  //       <style>{`
  //         @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  //         .skeleton { background-image: linear-gradient(90deg, #e5e7eb 0px, #f3f4f6 40px, #e5e7eb 80px); background-size: 600px 100%; animation: shimmer 1.2s infinite linear; }
  //       `}</style>
  //       <div style={{
  //         display: 'grid',
  //         gridTemplateColumns: 'repeat(4, 1fr)',
  //         gap: '24px',
  //         marginBottom: '32px'
  //       }}>
  //         <div className="skeleton" style={{ height: '140px', borderRadius: '16px' }}></div>
  //         <div className="skeleton" style={{ height: '140px', borderRadius: '16px' }}></div>
  //         <div className="skeleton" style={{ height: '140px', borderRadius: '16px' }}></div>
  //         <div className="skeleton" style={{ height: '140px', borderRadius: '16px' }}></div>
  //       </div>
  //       <div style={{
  //         display: 'grid',
  //         gridTemplateColumns: '1fr 1fr',
  //         gap: '24px',
  //         marginBottom: '32px'
  //       }}>
  //         <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
  //         <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }}></div>
  //       </div>
  //       <div className="skeleton" style={{ height: '420px', borderRadius: '16px' }}></div>
  //     </div>
  //   )
  // }

  return (
    <div style={{ padding: '0' }}>
      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        marginBottom: '32px',
        position: 'relative'
      }}>
        {/* Branch Selector */}
        <div style={{ position: 'absolute', left: 0 }}>
          <BranchSelector size="md" />
        </div>
        
        {/* Date and Period Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

        {/* Period Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setActivePeriod('today')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activePeriod === 'today' ? '#7d8d86' : 'transparent',
              color: activePeriod === 'today' ? '#f1f0e4' : '#7d8d86',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Today
          </button>
          <button
            onClick={() => setActivePeriod('week')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activePeriod === 'week' ? '#7d8d86' : 'transparent',
              color: activePeriod === 'week' ? '#f1f0e4' : '#7d8d86',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setActivePeriod('month')}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activePeriod === 'month' ? '#7d8d86' : 'transparent',
              color: activePeriod === 'month' ? '#f1f0e4' : '#7d8d86',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            This Month
          </button>
        </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
        marginBottom: '32px',
        minHeight: '140px'
      }}>
        {displayCards.map((card, index) => (
          <div
            key={index}
            className="dashboardCard"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
              border: '2px solid #d1d5db',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: '#d1d5db',
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
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: card.changeColor, 
                  margin: 0 
                }}>
                  {(card as any).pieChart ? (
                    <>
                      {createPieChart((card as any).pieChart.productCount, (card as any).pieChart.sideBusinessCount, 120)}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>Products: {(card as any).pieChart.productCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>Side Business: {(card as any).pieChart.sideBusinessCount}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {(card as any).changeIcon && (
                        <i className={(card as any).changeIcon} style={{ fontSize: '12px' }}></i>
                      )}
                      <span>{card.change}</span>
                    </>
                  )}
                </div>
                
                {/* Side Business Breakdown - Only on Sales card (index 0) */}
                {index === 0 && sideBusinessBreakdown.length > 0 && (
                  <div style={{ 
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(125, 141, 134, 0.2)'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                      gap: '12px',
                      maxWidth: '100%'
                    }}>
                      {sideBusinessBreakdown.map((business) => (
                        <div key={business.business_id} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}>
                            {business.image_url ? (
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = '<i class="fa-solid fa-store" style="font-size: 18px; color: #7d8d86;"></i>'
                                  }
                                }}
                              />
                            ) : (
                              <i className="fa-solid fa-store" style={{ fontSize: '18px', color: '#7d8d86' }}></i>
                            )}
                          </div>
                          <div style={{
                            textAlign: 'center',
                            width: '100%'
                          }}>
                            <p style={{
                              fontSize: '11px',
                              color: '#7d8d86',
                              fontWeight: '500',
                              margin: '0 0 2px 0',
                              lineHeight: '1.2'
                            }}>
                              {business.name}
                            </p>
                            <p style={{
                              fontSize: '12px',
                              color: '#1a1a1a',
                              fontWeight: '600',
                              margin: 0
                            }}>
                              {formatCurrency(business.total_amount, {}, currentBusiness?.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
        <div 
          className="dashboardCard"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
            border: '2px solid #d1d5db',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#d1d5db',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '120px'
          }}
        >
          <LowStockSection />
        </div>

        {/* Top Products as Fourth Card */}
        <ProductAnalyticsSection activePeriod={activePeriod} selectedDate={selectedDate} />
      </div>

      {/* Main Content Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Left Column - Recent Transactions and Top Products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Recent Transactions */}
          <div 
            className="dashboardCard"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
              border: '5px solid #000000 !important'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                {(() => {
                  switch (activePeriod) {
                    case 'today':
                      const today = new Date()
                      const isToday = selectedDate.toDateString() === today.toDateString()
                      return isToday ? 'Recent Transactions' : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Transactions`
                    case 'week':
                      return 'This Week Transactions'
                    case 'month':
                      return 'This Month Transactions'
                    default:
                      return 'Recent Transactions'
                  }
                })()}
              </h3>
              </div>
              <button
                onClick={() => openTransactionsModalForDate(selectedDate)}
                style={{
                  background: '#1a1a1a',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                View All
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.sale_id}
                    onClick={() => navigate(`/transaction/TXN-${transaction.sale_id.toString().padStart(6, '0')}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: transaction.partial_payment ? '#fef2f2' : 'white',
                      borderRadius: '8px',
                      border: transaction.partial_payment ? '1px solid #fecaca' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: transaction.partial_payment ? '#f59e0b' : (transaction.status === 'completed' ? '#10b981' : '#f59e0b'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <i className={`fa-solid ${transaction.partial_payment ? 'fa-exclamation' : (transaction.status === 'completed' ? 'fa-check' : 'fa-hourglass-half')}`} 
                         style={{ fontSize: '12px', color: 'white' }}></i>
                      {transaction.partial_payment && (
                        <div style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#dc2626',
                          border: '1px solid white'
                        }}></div>
                      )}
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
                        {transaction.items_count} item{transaction.items_count !== 1 ? 's' : ''} | {transaction.payment_method}
                        {transaction.partial_payment && (
                          <span style={{ 
                            color: '#dc2626', 
                            fontWeight: '600',
                            marginLeft: '8px'
                          }}>
                            • PARTIAL
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {transaction.partial_payment ? (
                        <div>
                          <p style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#10b981', 
                            margin: '0 0 2px 0' 
                          }}>
                            {formatCurrency(transaction.partial_amount || 0, {}, currentBusiness?.currency)}
                          </p>
                          <p style={{ 
                            fontSize: '11px', 
                            color: '#6b7280', 
                            margin: '0 0 2px 0',
                            fontWeight: '500'
                          }}>
                            of {formatCurrency((transaction.partial_amount || 0) + (transaction.remaining_amount || 0), {}, currentBusiness?.currency)}
                          </p>
                          <p style={{ 
                            fontSize: '10px', 
                            color: '#dc2626', 
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            OWES: {formatCurrency(transaction.remaining_amount || 0, {}, currentBusiness?.currency)}
                          </p>
                        </div>
                      ) : (
                        <p style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#1a1a1a', 
                          margin: 0 
                        }}>
                          {formatCurrency(transaction.total_amount, {}, currentBusiness?.currency)}
                        </p>
                      )}
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
                  {(() => {
                    switch (activePeriod) {
                      case 'today':
                        const today = new Date()
                        const isToday = selectedDate.toDateString() === today.toDateString()
                        return isToday ? 'No recent transactions' : `No transactions on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      case 'week':
                        return 'No transactions this week'
                      case 'month':
                        return 'No transactions this month'
                      default:
                        return 'No recent transactions'
                    }
                  })()}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Sales Chart */}
        <div>
          <SalesChart selectedDate={selectedDate} activePeriod={activePeriod} />
        </div>
      </div>

      {/* Transactions Modal */}
      {transactionsModalDate && (
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
                {getTransactionsModalTitle(transactionsModalDate)}
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
                &times;
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
                          {new Date(transaction.datetime).toLocaleTimeString()} | {transaction.items_count} items | {transaction.payment_method}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      {formatCurrency(transaction.total_amount, {}, currentBusiness?.currency)}
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
                  {getTransactionsModalEmptyState(transactionsModalDate)}
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

            {/* Calendar -Grid */}
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
