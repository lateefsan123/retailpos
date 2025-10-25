import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import { ProductVariation } from '../../types/productVariation'

export interface Product {
  product_id: string
  name: string
  category?: string
  price: number
  stock_quantity: number
  supplier_info?: string
  reorder_level: number
  tax_rate: number
  last_updated: string
  image_url?: string
  is_weighted: boolean
  price_per_unit?: number
  weight_unit?: string
  description?: string
  sku?: string
  sales_count: number
  total_revenue: number
  last_sold_date?: string
  business_id: number
  branch_id?: number
  variations?: ProductVariation[] | null
}

export interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price?: number
  stock_qty?: number
  created_at: string
  notes?: string
  parent_shop_id: number
  branch_id?: number
}

interface ProductsData {
  products: Product[]
  sideBusinessItems: SideBusinessItem[]
  categories: string[]
}

const fetchProductsData = async (businessId: number, branchId: number | null): Promise<ProductsData> => {
  // Fetching products data for business and branch
  
  // Build queries with branch filtering
  let productsQuery = supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  let sideBusinessQuery = supabase
    .from('side_business_items')
    .select('*')
    .eq('parent_shop_id', businessId)
    .order('name')

  // Add branch filtering if branch is selected
  if (branchId) {
    productsQuery = productsQuery.eq('branch_id', branchId)
    sideBusinessQuery = sideBusinessQuery.eq('branch_id', branchId)
  }

  const [productsResult, sideBusinessResult] = await Promise.all([
    productsQuery,
    sideBusinessQuery
  ])

  if (productsResult.error) throw productsResult.error
  if (sideBusinessResult.error) throw sideBusinessResult.error

  // Extract unique categories
  const categories = [...new Set(productsResult.data?.map(p => p.category).filter(Boolean))] as string[]

  return {
    products: productsResult.data || [],
    sideBusinessItems: sideBusinessResult.data || [],
    categories
  }
}

export const useProductsData = () => {
  const { user } = useAuth()
  const { selectedBranchId } = useBranch()
  
  return useQuery({
    queryKey: ['productsData', user?.business_id, selectedBranchId],
    queryFn: () => fetchProductsData(user?.business_id!, selectedBranchId),
    enabled: !!user?.business_id,
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes (products change moderately)
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent infinite calls
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })
}
