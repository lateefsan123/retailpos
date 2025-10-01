import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Supplier } from '../types/multitenant'

export const useSuppliers = (businessId: number | null, branchId: number | null = null) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (businessId) {
      fetchSuppliers()
    } else {
      setSuppliers([])
    }
  }, [businessId, branchId])

  const fetchSuppliers = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')

      if (branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setSuppliers(data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  const createSupplier = async (supplierData: Omit<Supplier, 'supplier_id' | 'created_at'>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single()

      if (error) throw error

      setSuppliers(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error creating supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to create supplier')
      throw err
    }
  }

  const updateSupplier = async (supplierId: number, updates: Partial<Supplier>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('supplier_id', supplierId)
        .select()
        .single()

      if (error) throw error

      setSuppliers(prev => 
        prev.map(s => s.supplier_id === supplierId ? data : s)
      )
      return data
    } catch (err) {
      console.error('Error updating supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to update supplier')
      throw err
    }
  }

  const deleteSupplier = async (supplierId: number) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('suppliers')
        .update({ active: false })
        .eq('supplier_id', supplierId)

      if (error) throw error

      setSuppliers(prev => 
        prev.map(s => 
          s.supplier_id === supplierId 
            ? { ...s, active: false }
            : s
        )
      )
    } catch (err) {
      console.error('Error deleting supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete supplier')
      throw err
    }
  }

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier
  }
}
