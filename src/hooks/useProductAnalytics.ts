import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface ProductAnalytics {
  product_id: string
  product_name: string
  quantity_sold: number
  total_sales: number
  image_url?: string
}

export const useProductAnalytics = () => {
  const [todayProducts, setTodayProducts] = useState<ProductAnalytics[]>([])
  const [weekProducts, setWeekProducts] = useState<ProductAnalytics[]>([])
  const [monthProducts, setMonthProducts] = useState<ProductAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = (period: 'today' | 'week' | 'month') => {
    const now = new Date()
    
    switch (period) {
      case 'today':
        const today = now.toISOString().split('T')[0]
        return {
          start: `${today}T00:00:00`,
          end: `${today}T23:59:59`
        }
      
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        
        return {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        }
      
      default:
        return { start: '', end: '' }
    }
  }

  const fetchProductAnalytics = async (period: 'today' | 'week' | 'month') => {
    try {
      const { start, end } = getDateRange(period)
      console.log(`Fetching ${period} analytics from ${start} to ${end}`)
      
      const { data: analyticsData, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          price_each,
          products (product_id, name, image_url),
          sales!inner (datetime)
        `)
        .gte('sales.datetime', start)
        .lt('sales.datetime', end)

      if (error) {
        console.error(`Error fetching ${period} analytics:`, error)
        throw error
      }

      console.log(`${period} analytics data:`, analyticsData)

      // Group by product and calculate totals
      const productMap = new Map<string, ProductAnalytics>()
      
      ;(analyticsData || []).forEach(item => {
        const productId = item.products?.product_id
        const productName = item.products?.name
        const imageUrl = item.products?.image_url
        
        if (productId && productName) {
          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!
            existing.quantity_sold += item.quantity
            existing.total_sales += item.quantity * item.price_each
          } else {
            productMap.set(productId, {
              product_id: productId,
              product_name: productName,
              quantity_sold: item.quantity,
              total_sales: item.quantity * item.price_each,
              image_url: imageUrl
            })
          }
        }
      })

      // Sort by total sales and take top 5
      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 5)

      console.log(`${period} sorted products:`, sortedProducts)
      return sortedProducts
    } catch (err) {
      console.error(`Error fetching ${period} product analytics:`, err)
      throw err
    }
  }

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const [today, week, month] = await Promise.all([
        fetchProductAnalytics('today').catch(() => []),
        fetchProductAnalytics('week').catch(() => []),
        fetchProductAnalytics('month').catch(() => [])
      ])

      setTodayProducts(today)
      setWeekProducts(week)
      setMonthProducts(month)
    } catch (err) {
      console.error('Error fetching product analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch product analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllAnalytics()
  }, [])

  return {
    todayProducts,
    weekProducts,
    monthProducts,
    loading,
    error,
    refetch: fetchAllAnalytics
  }
}
