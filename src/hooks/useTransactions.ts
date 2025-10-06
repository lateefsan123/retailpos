import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useSalesData } from './data/useSalesData'

export const useTransactions = () => {
  const { data: salesData, isLoading, error } = useSalesData()
  const queryClient = useQueryClient()

  const resolvePartialPayment = useMutation({
    mutationFn: async (saleId: number) => {
      // Fetch current partial values to compute the full amount
      const { data: sale, error: fetchError } = await supabase
        .from('sales')
        .select('partial_amount, remaining_amount, total_amount, notes')
        .eq('sale_id', saleId)
        .single()

      if (fetchError) throw fetchError

      const partialAmount = Number(sale?.partial_amount || 0)
      const remainingAmount = Number(sale?.remaining_amount || 0)
      const computedFullAmount = partialAmount + remainingAmount

      const completionNote = sale?.notes
        ? `${sale.notes}\n\nPayment completed on ${new Date().toLocaleString()}`
        : `Payment completed on ${new Date().toLocaleString()}`

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          total_amount: computedFullAmount > 0 ? computedFullAmount : sale?.total_amount || 0,
          partial_payment: false,
          partial_amount: null,
          remaining_amount: null,
          partial_notes: null,
          notes: completionNote
        })
        .eq('sale_id', saleId)

      if (updateError) throw updateError
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
