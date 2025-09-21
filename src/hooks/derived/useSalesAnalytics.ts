import { useMemo } from 'react'
import { useSalesData } from '../data/useSalesData'

export interface WeeklySalesData {
  day: string
  date: string
  totalSales: number
  transactionCount: number
  averageTransaction: number
}

export interface HourlySalesData {
  hour: number
  hourLabel: string
  totalSales: number
  transactionCount: number
}

export interface MonthlySalesData {
  day: string
  date: string
  totalSales: number
  transactionCount: number
  averageTransaction: number
}

const getDateRange = (period: 'today' | 'week' | 'month') => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    case 'week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return {
        start: weekStart,
        end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      return {
        start: monthStart,
        end: monthEnd
      }
    default:
      return { start: today, end: today }
  }
}

const processWeeklyData = (sales: any[], sideBusinessSales: any[]): WeeklySalesData[] => {
  const { start, end } = getDateRange('week')
  const weeklyData: { [key: string]: { totalSales: number, transactionCount: number } } = {}
  
  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const dayKey = date.toISOString().split('T')[0]
    weeklyData[dayKey] = { totalSales: 0, transactionCount: 0 }
  }
  
  // Process main sales
  sales.forEach(sale => {
    const saleDate = new Date(sale.datetime).toISOString().split('T')[0]
    if (weeklyData[saleDate]) {
      weeklyData[saleDate].totalSales += parseFloat(sale.total_amount) || 0
      weeklyData[saleDate].transactionCount += 1
    }
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const saleDate = new Date(sale.date_time).toISOString().split('T')[0]
    if (weeklyData[saleDate]) {
      weeklyData[saleDate].totalSales += parseFloat(sale.total_amount) || 0
      weeklyData[saleDate].transactionCount += 1
    }
  })
  
  return Object.entries(weeklyData).map(([date, data]) => ({
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    date,
    totalSales: data.totalSales,
    transactionCount: data.transactionCount,
    averageTransaction: data.transactionCount > 0 ? data.totalSales / data.transactionCount : 0
  }))
}

const processHourlyData = (sales: any[], sideBusinessSales: any[]): HourlySalesData[] => {
  const hourlyData: { [key: number]: { totalSales: number, transactionCount: number } } = {}
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { totalSales: 0, transactionCount: 0 }
  }
  
  // Process main sales
  sales.forEach(sale => {
    const hour = new Date(sale.datetime).getHours()
    hourlyData[hour].totalSales += parseFloat(sale.total_amount) || 0
    hourlyData[hour].transactionCount += 1
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const hour = new Date(sale.date_time).getHours()
    hourlyData[hour].totalSales += parseFloat(sale.total_amount) || 0
    hourlyData[hour].transactionCount += 1
  })
  
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    hourLabel: `${hour}:00`,
    totalSales: data.totalSales,
    transactionCount: data.transactionCount
  }))
}

const processMonthlyData = (sales: any[], sideBusinessSales: any[]): MonthlySalesData[] => {
  const { start, end } = getDateRange('month')
  const monthlyData: { [key: string]: { totalSales: number, transactionCount: number } } = {}
  
  // Initialize all days of the month
  const current = new Date(start)
  while (current < end) {
    const dayKey = current.toISOString().split('T')[0]
    monthlyData[dayKey] = { totalSales: 0, transactionCount: 0 }
    current.setDate(current.getDate() + 1)
  }
  
  // Process main sales
  sales.forEach(sale => {
    const saleDate = new Date(sale.datetime).toISOString().split('T')[0]
    if (monthlyData[saleDate]) {
      monthlyData[saleDate].totalSales += parseFloat(sale.total_amount) || 0
      monthlyData[saleDate].transactionCount += 1
    }
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const saleDate = new Date(sale.date_time).toISOString().split('T')[0]
    if (monthlyData[saleDate]) {
      monthlyData[saleDate].totalSales += parseFloat(sale.total_amount) || 0
      monthlyData[saleDate].transactionCount += 1
    }
  })
  
  return Object.entries(monthlyData).map(([date, data]) => ({
    day: new Date(date).toLocaleDateString('en-US', { day: 'numeric' }),
    date,
    totalSales: data.totalSales,
    transactionCount: data.transactionCount,
    averageTransaction: data.transactionCount > 0 ? data.totalSales / data.transactionCount : 0
  }))
}

export const useSalesAnalytics = () => {
  const { data: salesData, isLoading, error } = useSalesData()
  
  const weeklyData = useMemo(() => {
    if (!salesData) return []
    return processWeeklyData(salesData.sales, salesData.sideBusinessSales)
  }, [salesData])
  
  const hourlyData = useMemo(() => {
    if (!salesData) return []
    return processHourlyData(salesData.sales, salesData.sideBusinessSales)
  }, [salesData])
  
  const monthlyData = useMemo(() => {
    if (!salesData) return []
    return processMonthlyData(salesData.sales, salesData.sideBusinessSales)
  }, [salesData])
  
  return {
    weeklyData,
    hourlyData,
    monthlyData,
    loading: isLoading,
    error: error?.message || null,
    refreshHourlyData: () => {}, // React Query handles this automatically
    refreshWeeklyData: () => {}, // React Query handles this automatically
    refreshMonthlyData: () => {} // React Query handles this automatically
  }
}
