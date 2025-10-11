import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/currency'
import { useBusinessId } from '../hooks/useBusinessId'
import { useSalesData } from '../hooks/data/useSalesData'
import { useProductsData } from '../hooks/data/useProductsData'

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


type DashboardPeriod = 'today' | 'yesterday' | 'last7' | 'last30' | 'week' | 'month'

const Dashboard = () => {
  const navigate = useNavigate()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { data: salesData } = useSalesData()
  const { data: productsData } = useProductsData()
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    todayNetRevenue: 0,
    todayRefunds: 0,
    todaySideBusinessRevenue: 0,
    todayTransactions: 0,
    lowStockItems: 0
  })
  const [, setLoading] = useState(true)
  const [transactionsModalDate, setTransactionsModalDate] = useState<Date | null>(null)
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('today')
  const [sideBusinessBreakdown, setSideBusinessBreakdown] = useState<Array<{
    business_id: number
    name: string
    image_url: string | null
    total_amount: number
  }>>([])
  const [previousDayTransactions, setPreviousDayTransactions] = useState<number>(0)
  const [periodSummary, setPeriodSummary] = useState({
    revenue: 0,
    netRevenue: 0,
    refunds: 0,
    sideRevenue: 0,
    transactions: 0,
    productTransactions: 0,
    sideTransactions: 0
  })

  const normalizePeriod = (period: DashboardPeriod): 'today' | 'week' | 'month' => {
    switch (period) {
      case 'yesterday':
        return 'today'
      case 'last7':
      case 'week':
        return 'week'
      case 'last30':
      case 'month':
        return 'month'
      default:
        return 'today'
    }
  }

  const getDateRangeForDashboardPeriod = (period: DashboardPeriod, base: Date) => {
    const baseStart = new Date(base)
    baseStart.setHours(0, 0, 0, 0)

    const nextDay = (date: Date, days = 1) => {
      const copy = new Date(date)
      copy.setDate(copy.getDate() + days)
      return copy
    }

    switch (period) {
      case 'today': {
        const start = new Date(baseStart)
        const end = nextDay(baseStart)
        return { start, end }
      }
      case 'yesterday': {
        const start = nextDay(baseStart, -1)
        const end = new Date(baseStart)
        return { start, end }
      }
      case 'last7': {
        const end = nextDay(baseStart)
        const start = nextDay(baseStart, -6)
        return { start, end }
      }
      case 'last30': {
        const end = nextDay(baseStart)
        const start = nextDay(baseStart, -29)
        return { start, end }
      }
      case 'week': {
        const start = new Date(baseStart)
        const day = start.getDay()
        start.setDate(start.getDate() - day)
        const end = nextDay(start, 7)
        return { start, end }
      }
      case 'month': {
        const start = new Date(baseStart.getFullYear(), baseStart.getMonth(), 1)
        const end = new Date(start)
        end.setMonth(start.getMonth() + 1)
        return { start, end }
      }
      default: {
        const start = new Date(baseStart)
        const end = nextDay(baseStart)
        return { start, end }
      }
    }
  }

  const computePeriodSummary = async (period: DashboardPeriod, baseDate: Date) => {
    if (businessId == null || !salesData) {
      setPeriodSummary({
        revenue: 0,
        netRevenue: 0,
        refunds: 0,
        sideRevenue: 0,
        transactions: 0,
        productTransactions: 0,
        sideTransactions: 0
      })
      setSideBusinessBreakdown([])
      return
    }

    const { start, end } = getDateRangeForDashboardPeriod(period, baseDate)
    const startTime = start.getTime()
    const endTime = end.getTime()

    const filteredSales = (salesData.sales || []).filter((sale) => {
      const saleDate = new Date(sale.datetime).getTime()
      return saleDate >= startTime && saleDate < endTime
    })

    const filteredSideSales = (salesData.sideBusinessSales || []).filter((sale) => {
      const saleDate = new Date(sale.date_time).getTime()
      return saleDate >= startTime && saleDate < endTime
    })

    const productRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const productTransactions = filteredSales.length

    const sideRevenue = filteredSideSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const sideTransactions = filteredSideSales.length

    const breakdownMap = new Map<number, { business_id: number; name: string; image_url: string | null; total_amount: number }>()
    filteredSideSales.forEach((sale) => {
      const business = (sale as any)?.side_business_items?.side_businesses
      if (business) {
        const existing = breakdownMap.get(business.business_id)
        if (existing) {
          existing.total_amount += sale.total_amount || 0
        } else {
          breakdownMap.set(business.business_id, {
            business_id: business.business_id,
            name: business.name,
            image_url: business.image_url,
            total_amount: sale.total_amount || 0
          })
        }
      }
    })

    const breakdownArray = Array.from(breakdownMap.values()).sort((a, b) => b.total_amount - a.total_amount)
    setSideBusinessBreakdown(breakdownArray)

    // Fetch refunds within the range
    let refundsTotal = 0
    try {
      let refundsQuery = supabase
        .from('refunds')
        .select('refund_amount')
        .eq('business_id', businessId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())

      if (selectedBranchId) {
        refundsQuery = refundsQuery.eq('branch_id', selectedBranchId)
      }

      const { data: refundRows, error: refundError } = await refundsQuery
      if (refundError && refundError.code !== 'PGRST116') {
        throw refundError
      }
      refundsTotal = refundRows?.reduce((sum, row) => sum + (row.refund_amount || 0), 0) || 0
    } catch (error) {
      console.warn('Failed to load refunds for summary:', error)
      refundsTotal = 0
    }

    setPeriodSummary({
      revenue: productRevenue,
      netRevenue: productRevenue - refundsTotal,
      refunds: refundsTotal,
      sideRevenue,
      transactions: productTransactions + sideTransactions,
      productTransactions,
      sideTransactions
    })

    if (period === 'today' || period === 'yesterday') {
      const previousStart = new Date(start)
      const previousEnd = new Date(start)
      previousStart.setDate(previousStart.getDate() - 1)

      const prevFiltered = (salesData.sales || []).filter((sale) => {
        const saleDate = new Date(sale.datetime).getTime()
        return saleDate >= previousStart.getTime() && saleDate < previousEnd.getTime()
      })
      setPreviousDayTransactions(prevFiltered.length)
    } else {
      setPreviousDayTransactions(0)
    }
  }

  // On mount and on focus, refresh cached sales/products by invalidating their queries indirectly
  useEffect(() => {
    // Trigger a light refresh by toggling a timestamp in state, which will flow through
    // our derived effects (no reloads involved)
    const refresh = () => setLoading(prev => {
      // flip to force dependent effects to run at least once
      return !prev
    })
    refresh()
    const handleFocus = () => refresh()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

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

      // Note: For cached data, we don't have refund data available, so we'll show gross revenue only
      // Net revenue calculation requires a separate API call to fetch refunds
      const todayNetRevenue = todayRevenue // Will be updated when fetchDashboardStats is called
      const todayRefunds = 0 // Will be updated when fetchDashboardStats is called

      // Calculate low stock items from cached products data
      const lowStockItems = productsData.products.filter(product => 
        product.stock_quantity <= product.reorder_level
      ).length

      setStats({
        totalProducts: productsData.products.length,
        totalSales: salesData.sales.length,
        totalCustomers: 0, // We'll need to add customers data to the cache later
        todayRevenue,
        todayNetRevenue,
        todayRefunds,
        todaySideBusinessRevenue,
        todayTransactions: todaySales.length,
        lowStockItems
      })

      setLoading(false)
    } else if (businessId == null && !businessLoading) {
      // Reset stats when no business is selected
      setStats({
        totalProducts: 0,
        totalSales: 0,
        totalCustomers: 0,
        todayRevenue: 0,
        todayNetRevenue: 0,
        todayRefunds: 0,
        todaySideBusinessRevenue: 0,
        todayTransactions: 0,
        lowStockItems: 0
      })
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

  useEffect(() => {
    if (businessLoading) {
      return
    }
    if (!salesData || businessId == null) {
      setPeriodSummary({
        revenue: 0,
        netRevenue: 0,
        refunds: 0,
        sideRevenue: 0,
        transactions: 0,
        productTransactions: 0,
        sideTransactions: 0
      })
      setSideBusinessBreakdown([])
      return
    }
    computePeriodSummary(activePeriod, selectedDate)
  }, [
    businessLoading,
    businessId,
    selectedBranchId,
    salesData,
    activePeriod,
    selectedDate
  ])

  // Fetch recent transactions when component mounts or when business/date changes
  useEffect(() => {
    if (businessId && !businessLoading) {
      const normalizedPeriod = normalizePeriod(activePeriod)
      if (normalizedPeriod === 'today') {
        fetchRecentTransactions(selectedDate)
      } else {
        fetchRecentTransactionsForPeriod(normalizedPeriod, selectedDate)
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
        todayNetRevenue: 0,
        todayRefunds: 0,
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

      // Fetch today's refunds
      let todayRefundsQuery = supabase
        .from('refunds')
        .select('refund_amount')
        .eq('business_id', businessId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
      
      // Filter by branch if selected
      if (selectedBranchId) {
        todayRefundsQuery = todayRefundsQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: todayRefunds } = await todayRefundsQuery
      const todayRefundsTotal = todayRefunds?.reduce((sum, refund) => sum + (refund.refund_amount || 0), 0) || 0
      const todayNetRevenue = todayRevenue - todayRefundsTotal

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
      
      const { data: todaySideBusinessSales } = await sideBusinessQuery

      const todaySideBusinessRevenue = todaySideBusinessSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

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
        todayNetRevenue,
        todayRefunds: todayRefundsTotal,
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

      // Fetch refunds for selected date
      let dayRefundsQuery = supabase
        .from('refunds')
        .select('refund_amount')
        .eq('business_id', businessId)
        .gte('created_at', `${dateString}T00:00:00`)
        .lt('created_at', `${dateString}T23:59:59`)
      
      if (selectedBranchId) {
        dayRefundsQuery = dayRefundsQuery.eq('branch_id', selectedBranchId)
      }
      
      const { data: dayRefunds } = await dayRefundsQuery
      const dayRefundsTotal = dayRefunds?.reduce((sum, refund) => sum + (refund.refund_amount || 0), 0) || 0
      const dayNetRevenue = dayRevenue - dayRefundsTotal

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
      const { data: daySideBusinessSales } = await supabase
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
        todayNetRevenue: dayNetRevenue,
        todayRefunds: dayRefundsTotal,
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
      case 'today': {
        const today = new Date()
        const isToday = selectedDate.toDateString() === today.toDateString()
        return isToday ? "Today's Sales" : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Sales`
      }
      case 'yesterday':
        return "Yesterday's Sales"
      case 'week':
        return 'This Week Sales'
      case 'last7':
        return 'Last 7 Days Sales'
      case 'month':
        return 'This Month Sales'
      case 'last30':
        return 'Last 30 Days Sales'
      default:
        return "Today's Sales"
    }
  }

  const getTransactionsCardTitle = () => {
    switch (activePeriod) {
      case 'today': {
        const today = new Date()
        const isToday = selectedDate.toDateString() === today.toDateString()
        return isToday ? "Today's Transactions" : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Transactions`
      }
      case 'yesterday':
        return "Yesterday's Transactions"
      case 'week':
        return 'This Week Transactions'
      case 'last7':
        return 'Last 7 Days Transactions'
      case 'month':
        return 'This Month Transactions'
      case 'last30':
        return 'Last 30 Days Transactions'
      default:
        return "Today's Transactions"
    }
  }

  const getTransactionPercentageChange = () => {
    if (previousDayTransactions === 0) {
      return periodSummary.productTransactions > 0 ? '+100%' : '0%'
    }

    const change =
      ((periodSummary.productTransactions - previousDayTransactions) /
        previousDayTransactions) *
      100
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(0)}%`
  }

  const getProductTransactionCount = () => {
    return periodSummary.productTransactions
  }

  const getTransactionBreakdown = () => {
    const productTransactions = getProductTransactionCount()
    const sideTransactions = periodSummary.sideTransactions

    let descriptor = ''
    if (activePeriod === 'today') {
      descriptor = `${getTransactionPercentageChange()} vs yesterday`
    } else if (activePeriod === 'yesterday') {
      descriptor = `${getTransactionPercentageChange()} vs prior day`
    } else if (activePeriod === 'last7') {
      descriptor = 'Last 7 days'
    } else if (activePeriod === 'last30') {
      descriptor = 'Last 30 days'
    } else if (activePeriod === 'week') {
      descriptor = 'This week'
    } else if (activePeriod === 'month') {
      descriptor = 'This month'
    }

    return {
      text: `Products: ${productTransactions} | Side Business: ${sideTransactions}${
        descriptor ? ` (${descriptor})` : ''
      }`,
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

  const totalRevenue = periodSummary.netRevenue + periodSummary.sideRevenue
  const averageSale = periodSummary.transactions > 0 ? totalRevenue / periodSummary.transactions : 0
  const transactionSummary = getTransactionBreakdown()
  const productTransactions = getProductTransactionCount()

  const topSideBusiness = sideBusinessBreakdown[0]

  const heroCards = [
    {
      title: getSalesCardTitle(),
      value: formatCurrency(totalRevenue),
      icon: 'fa-solid fa-coins',
      accent: '#1a1a1a',
      subtitle: `Net: ${formatCurrency(periodSummary.netRevenue)} | Side: ${formatCurrency(periodSummary.sideRevenue)}${periodSummary.refunds > 0 ? ` | Refunds: -${formatCurrency(periodSummary.refunds)}` : ''}${topSideBusiness ? ` | Top Side: ${topSideBusiness.name}` : ''}`
    },
    {
      title: getTransactionsCardTitle(),
      value: periodSummary.transactions.toLocaleString(),
      icon: transactionSummary.icon ?? 'fa-solid fa-receipt',
      accent: '#7d8d86',
      subtitle: transactionSummary.text || `Products: ${productTransactions} | Side: ${periodSummary.sideTransactions}`
    },
    {
      title: activePeriod === 'today' ? 'Average Sale' : 'Average Ticket',
      value: formatCurrency(averageSale),
      icon: 'fa-solid fa-chart-line',
      accent: '#bca88d',
      subtitle: periodSummary.transactions > 0 ? `Across ${periodSummary.transactions} sale${periodSummary.transactions === 1 ? '' : 's'}` : 'No sales recorded'
    }
  ]

  const periodOptions: { value: DashboardPeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  const handlePeriodSelect = (period: DashboardPeriod) => {
    setActivePeriod(period)
    if (period === 'today' || period === 'yesterday') {
      const base = new Date()
      if (period === 'yesterday') {
        base.setDate(base.getDate() - 1)
      }
      base.setHours(0, 0, 0, 0)
      setSelectedDate(base)
    }
  }

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
      {/* Dashboard Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
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
              color: '#6b7280',
              margin: 0
            }}>
              Track your business performance and key metrics
            </p>
          </div>
          <BranchSelector size="md" />
        </div>
        {/* Full width line below header */}
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: '#9ca3af'
        }}></div>
      </div>

      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        marginBottom: '32px',
        position: 'relative'
      }}>
        
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {periodOptions.map(option => {
            const isActive = activePeriod === option.value
            return (
              <button
                key={option.value}
                onClick={() => handlePeriodSelect(option.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: isActive ? '2px solid #1a1a1a' : '2px solid #d1d5db',
                  background: isActive ? '#1a1a1a' : '#ffffff',
                  color: isActive ? '#f1f0e4' : '#1f2937',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 6px 18px rgba(26, 26, 26, 0.25)' : 'none'
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        </div>
      </div>
      
      {/* Hero Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {heroCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '2px solid #d1d5db',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: '150px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>{card.title}</span>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(125, 141, 134, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.accent,
                fontSize: '18px'
              }}>
                <i className={card.icon}></i>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', lineHeight: 1.5 }}>
              {card.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Supporting Insights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
        }}>
          <LowStockSection />
        </div>
        <div>
          <ProductAnalyticsSection activePeriod={normalizePeriod(activePeriod)} selectedDate={selectedDate} />
        </div>
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
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
              border: '1px solid #e5e7eb'
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
                    case 'today': {
                      const today = new Date()
                      const isToday = selectedDate.toDateString() === today.toDateString()
                      return isToday ? 'Recent Transactions' : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Transactions`
                    }
                    case 'yesterday':
                      return "Yesterday's Transactions"
                    case 'week':
                      return 'This Week Transactions'
                    case 'last7':
                      return 'Last 7 Days Transactions'
                    case 'month':
                      return 'This Month Transactions'
                    case 'last30':
                      return 'Last 30 Days Transactions'
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
                            {formatCurrency(transaction.partial_amount || 0)}
                          </p>
                          <p style={{ 
                            fontSize: '11px', 
                            color: '#6b7280', 
                            margin: '0 0 2px 0',
                            fontWeight: '500'
                          }}>
                            of {formatCurrency((transaction.partial_amount || 0) + (transaction.remaining_amount || 0))}
                          </p>
                          <p style={{ 
                            fontSize: '10px', 
                            color: '#dc2626', 
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            OWES: {formatCurrency(transaction.remaining_amount || 0)}
                          </p>
                        </div>
                      ) : (
                        <p style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#1a1a1a', 
                          margin: 0 
                        }}>
                          {formatCurrency(transaction.total_amount)}
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
                      case 'today': {
                        const today = new Date()
                        const isToday = selectedDate.toDateString() === today.toDateString()
                        return isToday ? 'No recent transactions' : `No transactions on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                      case 'yesterday':
                        return 'No transactions yesterday'
                      case 'week':
                        return 'No transactions this week'
                      case 'last7':
                        return 'No transactions in the last 7 days'
                      case 'month':
                        return 'No transactions this month'
                      case 'last30':
                        return 'No transactions in the last 30 days'
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
          <SalesChart selectedDate={selectedDate} activePeriod={normalizePeriod(activePeriod)} />
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
            border: '2px solid #d1d5db'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #d1d5db'
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
                      {formatCurrency(transaction.total_amount)}
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
            border: '2px solid #d1d5db'
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
                      border: isToday ? '3px solid #1a1a1a' : '2px solid transparent',
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
