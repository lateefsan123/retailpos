import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SupplierVisit, SupplierVisitRequest } from '../types/multitenant'

export const useSupplierVisits = (businessId: number | null, branchId: number | null = null) => {
  const [visits, setVisits] = useState<SupplierVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (businessId) {
      fetchVisits()
    } else {
      setVisits([])
    }
  }, [businessId, branchId])

  const fetchVisits = async (startDate?: string, endDate?: string) => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('supplier_visits')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('business_id', businessId)
        .order('visit_date', { ascending: false })

      if (branchId) {
        query = query.eq('branch_id', branchId)
      }

      if (startDate) {
        query = query.gte('visit_date', startDate)
      }

      if (endDate) {
        query = query.lte('visit_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setVisits(data || [])
    } catch (err) {
      console.error('Error fetching supplier visits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier visits')
    } finally {
      setLoading(false)
    }
  }

  const createVisit = async (visitData: SupplierVisitRequest) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('supplier_visits')
        .insert([visitData])
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error

      setVisits(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating supplier visit:', err)
      setError(err instanceof Error ? err.message : 'Failed to create supplier visit')
      throw err
    }
  }

  const updateVisit = async (visitId: number, updates: Partial<SupplierVisitRequest>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('supplier_visits')
        .update(updates)
        .eq('visit_id', visitId)
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error

      setVisits(prev => 
        prev.map(v => v.visit_id === visitId ? data : v)
      )
      return data
    } catch (err) {
      console.error('Error updating supplier visit:', err)
      setError(err instanceof Error ? err.message : 'Failed to update supplier visit')
      throw err
    }
  }

  const deleteVisit = async (visitId: number) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('supplier_visits')
        .delete()
        .eq('visit_id', visitId)

      if (error) throw error

      setVisits(prev => prev.filter(v => v.visit_id !== visitId))
    } catch (err) {
      console.error('Error deleting supplier visit:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete supplier visit')
      throw err
    }
  }

  return {
    visits,
    loading,
    error,
    fetchVisits,
    createVisit,
    updateVisit,
    deleteVisit
  }
}

