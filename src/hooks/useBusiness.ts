import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BusinessInfo, BusinessForm } from '../types/multitenant'

export const useBusiness = () => {
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('business_info')
        .select('*')
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      setBusinesses(data || [])
    } catch (err) {
      console.error('Error fetching businesses:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch businesses')
    } finally {
      setLoading(false)
    }
  }

  // Create a new business
  const createBusiness = async (businessData: BusinessForm) => {
    try {
      setError(null)

      const { data, error: insertError } = await supabase
        .from('business_info')
        .insert([businessData])
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Add to local state
      setBusinesses(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error creating business:', err)
      setError(err instanceof Error ? err.message : 'Failed to create business')
      throw err
    }
  }

  // Update an existing business
  const updateBusiness = async (businessId: number, businessData: Partial<BusinessForm>) => {
    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from('business_info')
        .update({
          ...businessData,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Update local state
      setBusinesses(prev => 
        prev.map(business => 
          business.business_id === businessId ? data : business
        )
      )
      return data
    } catch (err) {
      console.error('Error updating business:', err)
      setError(err instanceof Error ? err.message : 'Failed to update business')
      throw err
    }
  }

  // Delete a business
  const deleteBusiness = async (businessId: number) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('business_info')
        .delete()
        .eq('business_id', businessId)

      if (deleteError) {
        throw deleteError
      }

      // Remove from local state
      setBusinesses(prev => prev.filter(business => business.business_id !== businessId))
    } catch (err) {
      console.error('Error deleting business:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete business')
      throw err
    }
  }

  // Get business by ID
  const getBusinessById = (businessId: number) => {
    return businesses.find(business => business.business_id === businessId)
  }

  // Initialize on mount
  useEffect(() => {
    fetchBusinesses()
  }, [])

  return {
    businesses,
    loading,
    error,
    fetchBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    getBusinessById,
    setError
  }
}
