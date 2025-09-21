import { useBusinessData } from '../data/useBusinessData'

export const useBusinessInfo = () => {
  const { data: businessData, isLoading, error } = useBusinessData()

  return {
    businessInfo: businessData,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => {} // React Query handles refetching automatically
  }
}
