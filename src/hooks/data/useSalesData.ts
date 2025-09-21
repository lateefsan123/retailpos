import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export interface SaleItem {
  sale_item_id: number
  sale_id: number
  product_id: string
  quantity: number
  price_each: number
  weight?: number
  calculated_price: number
  products?: {
    name: string
    price: number
    is_weighted: boolean
    price_per_unit?: number
    weight_unit?: string
  }
}

export interface Sale {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  cashier_id: number
  customer_id?: number
  discount_applied: number
  partial_payment: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
  notes?: string
  business_id: number
  customers?: {
    name: string
  }
  shop_staff?: {
    username: string
  }
  sale_items?: SaleItem[]
  // Transformed fields
  customer_name?: string
  cashier_name?: string
  is_partial_payment?: boolean
  items?: SaleItem[]
}

export interface SideBusinessSale {
  sale_id: number
  business_id: number
  quantity: number
  total_amount: number
  payment_method: string
  date_time: string
  item_id: number
  parent_shop_id: number
  side_business_items?: {
    name: string
    price: number
  }
}

interface SalesData {
  sales: Sale[]
  sideBusinessSales: SideBusinessSale[]
}

const fetchSalesData = async (businessId: number): Promise<SalesData> => {
  console.log('[fetchSalesData] fetching sales data for business:', businessId)
  
  const [salesResult, sideBusinessResult] = await Promise.all([
    // Main sales with nested data
    supabase
      .from('sales')
      .select(`
        *,
        customers (name),
        shop_staff!sales_cashier_id_fkey (username),
        sale_items (
          *,
          products (
            name,
            price,
            is_weighted,
            price_per_unit,
            weight_unit
          )
        )
      `)
      .eq('business_id', businessId)
      .order('datetime', { ascending: false }),

    // Side business sales
    supabase
      .from('side_business_sales')
      .select(`
        *,
        side_business_items (
          name,
          price
        )
      `)
      .eq('parent_shop_id', businessId)
      .order('date_time', { ascending: false })
  ])

  if (salesResult.error) throw salesResult.error
  if (sideBusinessResult.error) throw sideBusinessResult.error

  // Transform sales data
  const transformedSales = salesResult.data?.map(sale => {
    const isPartialPayment = sale.notes && (
      sale.notes.includes('PARTIAL PAYMENT') ||
      sale.notes.includes('Amount Paid Today') ||
      sale.notes.includes('Remaining Balance')
    )

    let partialAmount = 0
    let remainingAmount = 0
    let partialNotes = ''

    if (isPartialPayment && sale.notes) {
      const amountMatch = sale.notes.match(/Amount Paid Today: €(\d+\.?\d*)/)
      const remainingMatch = sale.notes.match(/Remaining Balance: €(\d+\.?\d*)/)
      
      partialAmount = amountMatch ? parseFloat(amountMatch[1]) : 0
      remainingAmount = remainingMatch ? parseFloat(remainingMatch[1]) : 0
      partialNotes = sale.notes
    }

    return {
      ...sale,
      customer_name: sale.customers?.name || 'Walk-in Customer',
      cashier_name: sale.shop_staff?.username || 'Unknown',
      is_partial_payment: isPartialPayment,
      partial_amount: partialAmount,
      remaining_amount: remainingAmount,
      partial_notes: partialNotes,
      items: sale.sale_items || []
    }
  }) || []

  return {
    sales: transformedSales,
    sideBusinessSales: sideBusinessResult.data || []
  }
}

export const useSalesData = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['salesData', user?.business_id],
    queryFn: () => fetchSalesData(user?.business_id!),
    enabled: !!user?.business_id,
    staleTime: 2 * 60 * 1000, // 2 minutes for sales data
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Prevent refetch on component mount if data is fresh
  })
}
