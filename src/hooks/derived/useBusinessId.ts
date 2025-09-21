import { useAuth } from '../../contexts/AuthContext'

export const useBusinessId = () => {
  const { user } = useAuth()

  return {
    businessId: user?.business_id,
    businessLoading: false, // No loading since we get this from auth context
    businessError: null
  }
}
