import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

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

export const useSalesAnalytics = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklySalesData[]>([])
  const [hourlyData, setHourlyData] = useState<HourlySalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getWeekDates = (weekOffset: number = 0) => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Get start of week (Sunday) with offset
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay + (weekOffset * 7))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const weekDates = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      
      weekDates.push({
        day: dayNames[i],
        date: date.toISOString().split('T')[0],
        fullDate: date
      })
    }
    
    return weekDates
  }

  const getShopHours = () => {
    const hours = []
    for (let hour = 10; hour <= 20; hour++) { // 10 AM to 8 PM (20:00)
      const hourLabel = hour === 12 ? '12 PM' : 
                       hour > 12 ? `${hour - 12} PM` : 
                       `${hour} AM`
      hours.push({
        hour,
        hourLabel,
        startTime: `${hour.toString().padStart(2, '0')}:00:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00:00`
      })
    }
    return hours
  }

  const fetchWeeklySales = async (weekOffset: number = 0) => {
    try {
      const weekDates = getWeekDates(weekOffset)
      const weeklySalesData: WeeklySalesData[] = []

      for (const { day, date, fullDate } of weekDates) {
        const startTime = `${date}T00:00:00`
        const endTime = `${date}T23:59:59`

        // Fetch regular product sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount, datetime')
          .gte('datetime', startTime)
          .lt('datetime', endTime)

        if (salesError) {
          console.error(`Error fetching sales for ${day}:`, salesError)
        }

        // Fetch side business sales
        const { data: sideBusinessSalesData, error: sideBusinessError } = await supabase
          .from('side_business_sales')
          .select('total_amount, date_time')
          .gte('date_time', startTime)
          .lt('date_time', endTime)

        if (sideBusinessError) {
          console.error(`Error fetching side business sales for ${day}:`, sideBusinessError)
        }

        const regularSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const sideBusinessSales = sideBusinessSalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const totalSales = regularSales + sideBusinessSales
        
        const regularTransactionCount = salesData?.length || 0
        const sideBusinessTransactionCount = sideBusinessSalesData?.length || 0
        const transactionCount = regularTransactionCount + sideBusinessTransactionCount
        const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0

        weeklySalesData.push({
          day,
          date,
          totalSales,
          transactionCount,
          averageTransaction
        })
      }

      setWeeklyData(weeklySalesData)
    } catch (err) {
      console.error('Error fetching weekly sales:', err)
      throw err
    }
  }

  const fetchHourlySales = async (selectedDate: string) => {
    try {
      const shopHours = getShopHours()
      const hourlySalesData: HourlySalesData[] = []

      for (const { hour, hourLabel, startTime, endTime } of shopHours) {
        const startDateTime = `${selectedDate}T${startTime}`
        const endDateTime = `${selectedDate}T${endTime}`

        // Fetch regular product sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount, datetime')
          .gte('datetime', startDateTime)
          .lt('datetime', endDateTime)

        if (salesError) {
          console.error(`Error fetching hourly sales for ${hour}:00:`, salesError)
        }

        // Fetch side business sales
        const { data: sideBusinessSalesData, error: sideBusinessError } = await supabase
          .from('side_business_sales')
          .select('total_amount, date_time')
          .gte('date_time', startDateTime)
          .lt('date_time', endDateTime)

        if (sideBusinessError) {
          console.error(`Error fetching hourly side business sales for ${hour}:00:`, sideBusinessError)
        }

        const regularSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const sideBusinessSales = sideBusinessSalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const totalSales = regularSales + sideBusinessSales
        
        const regularTransactionCount = salesData?.length || 0
        const sideBusinessTransactionCount = sideBusinessSalesData?.length || 0
        const transactionCount = regularTransactionCount + sideBusinessTransactionCount

        // Debug logging
        if (totalSales > 0 || transactionCount > 0) {
          console.log(`Hour ${hour}:00 - Sales: €${totalSales.toFixed(2)}, Transactions: ${transactionCount}`)
        }

        hourlySalesData.push({
          hour,
          hourLabel,
          totalSales,
          transactionCount
        })
      }

      setHourlyData(hourlySalesData)
    } catch (err) {
      console.error('Error fetching hourly sales:', err)
      throw err
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([
        fetchWeeklySales(),
        fetchHourlySales(new Date().toISOString().split('T')[0]) // Today's hourly data
      ])
    } catch (err) {
      console.error('Error fetching sales analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales analytics')
    } finally {
      setLoading(false)
    }
  }

  const refreshHourlyData = async (date: string) => {
    try {
      await fetchHourlySales(date)
    } catch (err) {
      console.error('Error refreshing hourly data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh hourly data')
    }
  }

  const refreshWeeklyData = async (weekOffset: number = 0) => {
    try {
      await fetchWeeklySales(weekOffset)
    } catch (err) {
      console.error('Error refreshing weekly data:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh weekly data')
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  return {
    weeklyData,
    hourlyData,
    loading,
    error,
    refreshHourlyData,
    refreshWeeklyData,
    refetch: fetchAllData
  }
}
