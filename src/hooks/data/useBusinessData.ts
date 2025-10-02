import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export interface BusinessData {
  business_id: number
  name: string
  business_name: string
  business_type: string
  address: string
  phone_number?: string
  vat_number?: string
  receipt_footer: string
  logo_url?: string
  updated_at: string
  created_at?: string
}

const fetchBusinessData = async (businessId: number): Promise<BusinessData | null> => {
  console.log('[fetchBusinessData] fetching business_info for business:', businessId)
  
  const { data, error } = await supabase
    .from('business_info')
    .select('*')
    .eq('business_id', businessId)
    .single()

  if (error) {
    console.error('Error fetching business data:', error)
    throw error
  }

  return data
}

export const useBusinessData = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['businessData', user?.business_id],
    queryFn: () => fetchBusinessData(user?.business_id),
    enabled: !!user?.business_id,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes (business data changes less frequently)
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent infinite calls
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  })
}
