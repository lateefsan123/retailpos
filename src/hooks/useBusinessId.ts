import { useMemo } from 'react'
import { useBusiness } from '../contexts/BusinessContext'

export const useBusinessId = () => {
  const { currentBusinessId, loading, error } = useBusiness()

  return useMemo(() => ({
    businessId: currentBusinessId,
    businessLoading: loading,
    businessError: error,
    hasBusinessSelected: currentBusinessId != null,
  }), [currentBusinessId, loading, error])
}
