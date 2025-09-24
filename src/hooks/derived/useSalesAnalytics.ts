import { useMemo } from 'react'
import { useSalesData } from '../data/useSalesData'
import { useBusiness } from '../../contexts/BusinessContext'

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

// Utility function to convert date to business timezone
const convertToBusinessTimezone = (date: Date, timezone: string = 'UTC'): Date => {
  try {
    // Create a new date in the business timezone
    const businessDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    return businessDate
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.warn(`Invalid timezone: ${timezone}, falling back to UTC`)
    return new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  }
}

// Utility function to get business hours range
const getBusinessHoursRange = (businessHours: string = '9:00 AM - 6:00 PM') => {
  try {
    // Parse business hours (e.g., "9:00 AM - 6:00 PM")
    const match = businessHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (match) {
      const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match
      
      const parseTime = (hour: string, min: string, period: string) => {
        let h = parseInt(hour)
        const m = parseInt(min)
        if (period.toUpperCase() === 'PM' && h !== 12) h += 12
        if (period.toUpperCase() === 'AM' && h === 12) h = 0
        return h * 60 + m // Convert to minutes from midnight
      }
      
      const startMinutes = parseTime(startHour, startMin, startPeriod)
      const endMinutes = parseTime(endHour, endMin, endPeriod)
      
      return { startMinutes, endMinutes }
    }
  } catch (error) {
    console.warn(`Could not parse business hours: ${businessHours}`)
  }
  
  // Default to 9 AM - 6 PM
  return { startMinutes: 9 * 60, endMinutes: 18 * 60 }
}

const getDateRange = (period: 'today' | 'week' | 'month', timezone: string = 'UTC') => {
  const now = convertToBusinessTimezone(new Date(), timezone)
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

const processWeeklyData = (sales: any[], sideBusinessSales: any[], timezone: string = 'UTC'): WeeklySalesData[] => {
  const { start, end } = getDateRange('week', timezone)
  const weeklyData: { [key: string]: { totalSales: number, transactionCount: number } } = {}
  
  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const dayKey = date.toISOString().split('T')[0]
    weeklyData[dayKey] = { totalSales: 0, transactionCount: 0 }
  }
  
  // Process main sales
  sales.forEach(sale => {
    const saleDate = convertToBusinessTimezone(new Date(sale.datetime), timezone)
    const dayKey = saleDate.toISOString().split('T')[0]
    if (weeklyData[dayKey]) {
      weeklyData[dayKey].totalSales += parseFloat(sale.total_amount) || 0
      weeklyData[dayKey].transactionCount += 1
    }
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const saleDate = convertToBusinessTimezone(new Date(sale.date_time), timezone)
    const dayKey = saleDate.toISOString().split('T')[0]
    if (weeklyData[dayKey]) {
      weeklyData[dayKey].totalSales += parseFloat(sale.total_amount) || 0
      weeklyData[dayKey].transactionCount += 1
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

const processHourlyData = (sales: any[], sideBusinessSales: any[], timezone: string = 'UTC', businessHours: string = '9:00 AM - 6:00 PM'): HourlySalesData[] => {
  const hourlyData: { [key: number]: { totalSales: number, transactionCount: number } } = {}
  const { startMinutes, endMinutes } = getBusinessHoursRange(businessHours)
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { totalSales: 0, transactionCount: 0 }
  }
  
  // Process main sales
  sales.forEach(sale => {
    const saleDate = convertToBusinessTimezone(new Date(sale.datetime), timezone)
    const hour = saleDate.getHours()
    const minutes = saleDate.getMinutes()
    const totalMinutes = hour * 60 + minutes
    
    // Only count sales during business hours
    if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
      hourlyData[hour].totalSales += parseFloat(sale.total_amount) || 0
      hourlyData[hour].transactionCount += 1
    }
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const saleDate = convertToBusinessTimezone(new Date(sale.date_time), timezone)
    const hour = saleDate.getHours()
    const minutes = saleDate.getMinutes()
    const totalMinutes = hour * 60 + minutes
    
    // Only count sales during business hours
    if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
      hourlyData[hour].totalSales += parseFloat(sale.total_amount) || 0
      hourlyData[hour].transactionCount += 1
    }
  })
  
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    hourLabel: `${hour}:00`,
    totalSales: data.totalSales,
    transactionCount: data.transactionCount
  }))
}

const processMonthlyData = (sales: any[], sideBusinessSales: any[], timezone: string = 'UTC'): MonthlySalesData[] => {
  const { start, end } = getDateRange('month', timezone)
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
    const saleDate = convertToBusinessTimezone(new Date(sale.datetime), timezone)
    const dayKey = saleDate.toISOString().split('T')[0]
    if (monthlyData[dayKey]) {
      monthlyData[dayKey].totalSales += parseFloat(sale.total_amount) || 0
      monthlyData[dayKey].transactionCount += 1
    }
  })
  
  // Process side business sales
  sideBusinessSales.forEach(sale => {
    const saleDate = convertToBusinessTimezone(new Date(sale.date_time), timezone)
    const dayKey = saleDate.toISOString().split('T')[0]
    if (monthlyData[dayKey]) {
      monthlyData[dayKey].totalSales += parseFloat(sale.total_amount) || 0
      monthlyData[dayKey].transactionCount += 1
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
  const { currentBusiness } = useBusiness()
  
  const businessTimezone = currentBusiness?.timezone || 'UTC'
  const businessHours = currentBusiness?.business_hours || '9:00 AM - 6:00 PM'
  
  const weeklyData = useMemo(() => {
    if (!salesData) return []
    return processWeeklyData(salesData.sales, salesData.sideBusinessSales, businessTimezone)
  }, [salesData, businessTimezone])
  
  const hourlyData = useMemo(() => {
    if (!salesData) return []
    return processHourlyData(salesData.sales, salesData.sideBusinessSales, businessTimezone, businessHours)
  }, [salesData, businessTimezone, businessHours])
  
  const monthlyData = useMemo(() => {
    if (!salesData) return []
    return processMonthlyData(salesData.sales, salesData.sideBusinessSales, businessTimezone)
  }, [salesData, businessTimezone])
  
  return {
    weeklyData,
    hourlyData,
    monthlyData,
    loading: isLoading,
    error: error?.message || null,
    businessTimezone,
    businessHours,
    refreshHourlyData: () => {}, // React Query handles this automatically
    refreshWeeklyData: () => {}, // React Query handles this automatically
    refreshMonthlyData: () => {} // React Query handles this automatically
  }
}
