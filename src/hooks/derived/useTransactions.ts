import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { useSalesData, type Sale } from '../data/useSalesData'

export const useTransactions = () => {
  const { data: salesData, isLoading, error } = useSalesData()
  const queryClient = useQueryClient()

  const resolvePartialPayment = useMutation({
    mutationFn: async (saleId: number) => {
      const { error } = await supabase
        .from('sales')
        .update({ 
          partial_payment: false,
          notes: null
        })
        .eq('sale_id', saleId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesData'] })
    }
  })

  const deleteTransaction = useMutation({
    mutationFn: async (saleId: number) => {
      // Delete sale items first
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)

      if (itemsError) throw itemsError

      // Delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('sale_id', saleId)

      if (saleError) throw saleError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesData'] })
    }
  })

  return {
    transactions: salesData?.sales || [],
    loading: isLoading,
    error: error?.message || null,
    fetchTransactions: () => queryClient.invalidateQueries({ queryKey: ['salesData'] }),
    deleteTransaction: deleteTransaction.mutateAsync,
    resolvePartialPayment: resolvePartialPayment.mutateAsync
  }
}
