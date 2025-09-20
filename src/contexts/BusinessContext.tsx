import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BusinessInfo } from '../types/multitenant'
import { useAuth } from './AuthContext'

interface BusinessContextType {
  currentBusiness: BusinessInfo | null
  currentBusinessId: number | null
  businesses: BusinessInfo[]
  switchBusiness: (businessId: number) => void
  loading: boolean
  error: string | null
  refreshBusinesses: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

interface BusinessProviderProps {
  children: ReactNode
}

export const BusinessProvider = ({ children }: BusinessProviderProps) => {
  const { user, loading: authLoading } = useAuth()
  const [currentBusiness, setCurrentBusiness] = useState<BusinessInfo | null>(null)
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const determineBusiness = useCallback((businessList: BusinessInfo[]): BusinessInfo | null => {
    if (!businessList.length) {
      return null
    }

    const savedBusinessId = localStorage.getItem('current_business_id')
    if (savedBusinessId) {
      const parsedId = parseInt(savedBusinessId, 10)
      const savedBusiness = businessList.find(business => business.business_id === parsedId)
      if (savedBusiness) {
        return savedBusiness
      }
    }

    if (user?.business_id != null) {
      const userBusiness = businessList.find(business => business.business_id === user.business_id)
      if (userBusiness) {
        return userBusiness
      }
    }

    return businessList[0]
  }, [user?.business_id])

  const fetchBusinesses = useCallback(async () => {
    if (authLoading) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      let businessList: BusinessInfo[] = []

      const { data, error: fetchError } = await supabase
        .from('business_info')
        .select('*')
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      businessList = data ?? []

      if (user?.business_id != null && !businessList.some(b => b.business_id === user.business_id)) {
        const { data: userBusiness, error: userBusinessError } = await supabase
          .from('business_info')
          .select('*')
          .eq('business_id', user.business_id)
          .maybeSingle()

        if (!userBusinessError && userBusiness) {
          businessList = [...businessList, userBusiness].sort((a, b) => a.name.localeCompare(b.name))
        }
      }

      setBusinesses(businessList)

      const nextBusiness = determineBusiness(businessList)
      setCurrentBusiness(nextBusiness)

      if (nextBusiness) {
        localStorage.setItem('current_business_id', nextBusiness.business_id.toString())
      } else {
        localStorage.removeItem('current_business_id')
      }
    } catch (err) {
      console.error('Error fetching businesses:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch businesses')
    } finally {
      setLoading(false)
    }
  }, [authLoading, determineBusiness, user?.business_id])

  const switchBusiness = (businessId: number) => {
    const business = businesses.find(b => b.business_id === businessId)
    if (business) {
      setCurrentBusiness(business)
      localStorage.setItem('current_business_id', businessId.toString())
    }
  }

  const refreshBusinesses = async () => {
    await fetchBusinesses()
  }

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const value: BusinessContextType = {
    currentBusiness,
    currentBusinessId: currentBusiness?.business_id ?? null,
    businesses,
    switchBusiness,
    loading: loading || authLoading,
    error,
    refreshBusinesses
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
