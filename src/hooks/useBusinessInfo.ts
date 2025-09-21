import { useBusinessData } from './data/useBusinessData'

export interface BusinessInfo {
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

export const useBusinessInfo = () => {
  const { data: businessData, isLoading, error } = useBusinessData()

  return {
    businessInfo: businessData,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => {} // React Query handles refetching automatically
  }
}
