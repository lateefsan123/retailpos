import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface BusinessInfo {
  business_id: number
  name: string
  logo_url: string | null
  address: string | null
  phone_number: string | null
  vat_number: string | null
  receipt_footer: string | null
  updated_at: string
}

export const useBusinessInfo = () => {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('business_info')
        .select('*')
        .order('business_id', { ascending: true })
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching business info:', error)
        setError(error.message)
        return
      }

      setBusinessInfo(data)
    } catch (err) {
      console.error('Error in fetchBusinessInfo:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch business info')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinessInfo()
  }, [])

  return {
    businessInfo,
    loading,
    error,
    refetch: fetchBusinessInfo
  }
}
