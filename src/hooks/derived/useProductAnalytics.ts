import { useMemo } from 'react'
import { useSalesData } from '../data/useSalesData'

export interface ProductAnalytics {
  product_id: string
  product_name: string
  quantity_sold: number
  total_sales: number
  image_url?: string
}

const getDateRange = (period: 'today' | 'week' | 'month', customDate?: Date) => {
  const now = customDate || new Date()

  switch (period) {
    case 'today': {
      const today = now.toISOString().split('T')[0]
      return {
        start: `${today}T00:00:00`,
        end: `${today}T23:59:59`
      }
    }
    case 'week': {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      return {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString()
      }
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      return {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      }
    }
    default:
      return { start: '', end: '' }
  }
}

const processProductAnalytics = (sales: any[], period: 'today' | 'week' | 'month', customDate?: Date): ProductAnalytics[] => {
  const { start, end } = getDateRange(period, customDate)
  
  // Filter sales by date range
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.datetime).toISOString()
    return saleDate >= start && saleDate <= end
  })

  // Process sale items to get product analytics
  const productMap = new Map<string, { quantity: number, total: number, name: string, image_url?: string }>()
  
  filteredSales.forEach(sale => {
    sale.sale_items?.forEach((item: any) => {
      const productId = item.product_id
      const existing = productMap.get(productId) || { quantity: 0, total: 0, name: item.products?.name || 'Unknown', image_url: item.products?.image_url }
      
      const itemTotal = parseFloat(item.calculated_price) || (item.price_each * item.quantity)
      
      productMap.set(productId, {
        quantity: existing.quantity + (item.quantity || 0),
        total: existing.total + itemTotal,
        name: existing.name,
        image_url: existing.image_url
      })
    })
  })

  return Array.from(productMap.entries()).map(([productId, data]) => ({
    product_id: productId,
    product_name: data.name,
    quantity_sold: data.quantity,
    total_sales: data.total,
    image_url: data.image_url
  })).sort((a, b) => b.total_sales - a.total_sales)
}

export const useProductAnalytics = (customDate?: Date) => {
  const { data: salesData, isLoading, error } = useSalesData()
  
  const todayProducts = useMemo(() => {
    if (!salesData?.sales) return []
    return processProductAnalytics(salesData.sales, 'today', customDate)
  }, [salesData, customDate])
  
  const weekProducts = useMemo(() => {
    if (!salesData?.sales) return []
    return processProductAnalytics(salesData.sales, 'week', customDate)
  }, [salesData, customDate])
  
  const monthProducts = useMemo(() => {
    if (!salesData?.sales) return []
    return processProductAnalytics(salesData.sales, 'month', customDate)
  }, [salesData, customDate])
  
  return {
    todayProducts,
    weekProducts,
    monthProducts,
    loading: isLoading,
    error: error?.message || null
  }
}
