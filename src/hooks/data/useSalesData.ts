import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'

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
    image_url?: string
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
  branch_id?: number
  customers?: {
    name: string
  }
  shop_staff?: {
    username: string
  } | null
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
  branch_id?: number
  side_business_items?: {
    name: string
    price: number
  }
}

interface SalesData {
  sales: Sale[]
  sideBusinessSales: SideBusinessSale[]
}

const fetchSalesData = async (businessId: number, branchId: number | null): Promise<SalesData> => {
  
  // Build queries with branch filtering
  let salesQuery = supabase
    .from('sales')
    .select(`
      *,
      customers (name),
      sale_items (
        *,
        products (
          name,
          price,
          is_weighted,
          price_per_unit,
          weight_unit,
          image_url
        )
      )
    `)
    .eq('business_id', businessId)
    .order('datetime', { ascending: false })

  let sideBusinessQuery = supabase
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

  // Add branch filtering if branch is selected
  if (branchId) {
    salesQuery = salesQuery.eq('branch_id', branchId)
    sideBusinessQuery = sideBusinessQuery.eq('branch_id', branchId)
  }

  const [salesResult, sideBusinessResult] = await Promise.all([
    salesQuery,
    sideBusinessQuery
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
      cashier_name: sale.shop_staff?.username || 'System User',
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
  const { selectedBranchId } = useBranch()
  
  const query = useQuery({
    queryKey: ['salesData', user?.business_id, selectedBranchId],
    queryFn: () => fetchSalesData(user?.business_id!, selectedBranchId),
    enabled: !!user?.business_id,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent infinite calls
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })

  // Debug logging
  console.log('useSalesData Debug:', {
    businessId: user?.business_id,
    selectedBranchId,
    enabled: !!user?.business_id,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    dataLength: query.data?.sales?.length,
    sideBusinessDataLength: query.data?.sideBusinessSales?.length
  })

  return query
}
