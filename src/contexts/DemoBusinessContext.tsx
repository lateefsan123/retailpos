import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { BusinessInfo } from '../types/multitenant'
import { useAuth } from './DemoAuthContext'

interface BusinessContextType {
  currentBusiness: BusinessInfo | null
  currentBusinessId: number | null
  loading: boolean
  error: string | null
  refreshBusiness: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export const useBusiness = () => {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}

interface BusinessProviderProps {
  children: ReactNode
}

export const BusinessProvider = ({ children }: BusinessProviderProps) => {
  const { user } = useAuth()
  
  // Demo business data
  const demoBusiness: BusinessInfo = {
    business_id: 1,
    name: 'Demo Retail Store',
    business_name: 'Demo Retail Store',
    business_type: 'Retail Store',
    address: '123 Main Street, City, State 12345',
    phone_number: '+1 (555) 123-4567',
    vat_number: 'VAT123456789',
    receipt_footer: 'Thank you for shopping with us!',
    logo_url: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    description: 'A modern retail store offering quality products and excellent customer service.',
    website: 'https://demostore.com',
    business_hours: '9:00 AM - 6:00 PM',
    currency: 'USD',
    timezone: 'UTC'
  }

  const [currentBusiness, setCurrentBusiness] = useState<BusinessInfo | null>(demoBusiness)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBusiness = useCallback(async () => {
    if (!user?.business_id) return

    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setCurrentBusiness(demoBusiness)
    } catch (err) {
      setError('Failed to fetch business data')
      console.error('Error fetching business:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.business_id])

  const refreshBusiness = useCallback(async () => {
    await fetchBusiness()
  }, [fetchBusiness])

  useEffect(() => {
    if (user?.business_id) {
      fetchBusiness()
    } else {
      setCurrentBusiness(null)
    }
  }, [user?.business_id, fetchBusiness])

  const value: BusinessContextType = {
    currentBusiness,
    currentBusinessId: currentBusiness?.business_id || null,
    loading,
    error,
    refreshBusiness
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}
