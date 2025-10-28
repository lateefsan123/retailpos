import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BusinessInfo } from '../types/multitenant'
import { useAuth } from './AuthContext'
import { fetchBusinessBySubdomain } from '../utils/businessFetching'

interface BusinessContextType {
  currentBusiness: BusinessInfo | null
  currentBusinessId: number | null
  loading: boolean
  error: string | null
  refreshBusiness: () => Promise<void>
  loadBusinessBySubdomain: (subdomain: string) => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

interface BusinessProviderProps {
  children: ReactNode
}

export const BusinessProvider = ({ children }: BusinessProviderProps) => {
  const { user, loading: authLoading } = useAuth()
  const [currentBusiness, setCurrentBusiness] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserBusiness = useCallback(async (): Promise<void> => {
    if (!user?.business_id) {
      setCurrentBusiness(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: business, error: fetchError } = await supabase
        .from('business_info')
        .select('*')
        .eq('business_id', user.business_id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setCurrentBusiness(business)
      localStorage.setItem('current_business_id', business.business_id.toString())
    } catch (err) {
      console.error('Error loading business:', err)
      setError(err instanceof Error ? err.message : 'Failed to load business')
      setCurrentBusiness(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadBusinessBySubdomain = useCallback(async (subdomain: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const business = await fetchBusinessBySubdomain(subdomain);
      
      if (!business) {
        setError('Store not found');
        setCurrentBusiness(null);
        return;
      }

      setCurrentBusiness(business);
      localStorage.setItem('current_business_id', business.business_id.toString());
    } catch (err) {
      console.error('Error loading business by subdomain:', err);
      setError('Failed to load store');
      setCurrentBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBusiness = useCallback(async () => {
    await loadUserBusiness()
  }, [loadUserBusiness])

  useEffect(() => {
    if (!authLoading) {
      loadUserBusiness()
    }
  }, [loadUserBusiness, authLoading])

  const value: BusinessContextType = {
    currentBusiness,
    currentBusinessId: currentBusiness?.business_id ?? null,
    loading: loading || authLoading,
    error,
    refreshBusiness,
    loadBusinessBySubdomain
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}

export const useBusiness = () => {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}