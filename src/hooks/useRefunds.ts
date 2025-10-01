import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Refund, RefundRequest } from '../types/multitenant'

export const useRefunds = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to handle inventory restocking
  const handleInventoryRestock = async (refundRequest: RefundRequest, refundData: Refund) => {
    try {
      if (!refundRequest.sale_item_id) {
        console.log('No sale_item_id provided for restock')
        return
      }

      // Try to get regular sale item first
      const { data: saleItem, error: saleItemError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          price_each,
          weight,
          calculated_price,
          products!inner(
            product_id,
            name,
            stock_quantity,
            is_weighted,
            price_per_unit,
            business_id
          )
        `)
        .eq('sale_item_id', refundRequest.sale_item_id)
        .single()

      if (saleItem && !saleItemError) {
        // Handle regular product restock
        const product = saleItem.products
        if (product) {
          // Update product stock quantity
          const newStockQuantity = product.stock_quantity + refundRequest.quantity_refunded
          
          const { error: stockError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: newStockQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('product_id', product.product_id)
            .eq('business_id', refundRequest.business_id)

          if (stockError) {
            console.error('Error updating product stock:', stockError)
            return
          }

          // Create inventory movement record
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert([{
              product_id: product.product_id,
              quantity_change: refundRequest.quantity_refunded,
              movement_type: 'return',
              reference_id: refundData.refund_id,
              business_id: refundRequest.business_id,
              branch_id: refundRequest.branch_id,
              notes: `Refund restock - Refund ID: ${refundData.refund_id}`,
              created_by: refundRequest.cashier_id,
              datetime: new Date().toISOString()
            }])

          if (movementError) {
            console.error('Error creating inventory movement:', movementError)
            // Don't fail the refund if movement recording fails
          }

          console.log(`Successfully restocked ${refundRequest.quantity_refunded} units of ${product.name}`)
          return
        }
      }

      // If not a regular sale item, check if it's a side business item
      // For side business items, we need to find the corresponding side business sale
      const { data: sideBusinessSale, error: sideBusinessError } = await supabase
        .from('side_business_sales')
        .select(`
          item_id,
          quantity,
          price_each,
          total_amount,
          side_business_items!inner(
            item_id,
            name,
            stock_qty,
            parent_shop_id
          )
        `)
        .eq('sale_id', refundRequest.original_sale_id)
        .single()

      if (sideBusinessSale && !sideBusinessError && sideBusinessSale.side_business_items) {
        // Handle side business item restock
        const sideBusinessItem = sideBusinessSale.side_business_items
        
        if (sideBusinessItem.stock_qty !== null) {
          // Update side business item stock quantity
          const newStockQuantity = sideBusinessItem.stock_qty + refundRequest.quantity_refunded
          
          const { error: stockError } = await supabase
            .from('side_business_items')
            .update({ 
              stock_qty: newStockQuantity
            })
            .eq('item_id', sideBusinessItem.item_id)
            .eq('parent_shop_id', refundRequest.business_id)

          if (stockError) {
            console.error('Error updating side business item stock:', stockError)
            return
          }

          console.log(`Successfully restocked ${refundRequest.quantity_refunded} units of side business item ${sideBusinessItem.name}`)
        } else {
          console.log(`Side business item ${sideBusinessItem.name} does not track stock quantities`)
        }
        return
      }

      console.log('Could not find item to restock - may not be a trackable inventory item')
    } catch (err) {
      console.error('Error in inventory restock:', err)
      // Don't fail the refund if restock fails
    }
  }

  const processRefund = async (refundRequest: RefundRequest): Promise<{ data: Refund | null; error: string | null }> => {
    try {
      setLoading(true)
      setError(null)

      // Validate refund amount
      if (refundRequest.refund_amount <= 0) {
        throw new Error('Refund amount must be greater than 0')
      }

      // Get original sale to validate refund amount
      const { data: originalSale, error: saleError } = await supabase
        .from('sales')
        .select('total_amount, sale_id')
        .eq('sale_id', refundRequest.original_sale_id)
        .single()

      if (saleError || !originalSale) {
        throw new Error('Original sale not found')
      }

      // Check if refund amount doesn't exceed original sale amount
      if (refundRequest.refund_amount > originalSale.total_amount) {
        throw new Error('Refund amount cannot exceed original sale amount')
      }

      // Check existing refunds for this sale to prevent over-refunding
      const { data: existingRefunds, error: refundsError } = await supabase
        .from('refunds')
        .select('refund_amount')
        .eq('original_sale_id', refundRequest.original_sale_id)

      if (refundsError) {
        console.error('Error fetching existing refunds:', refundsError)
        // Continue with the refund process
      }

      const totalExistingRefunds = existingRefunds?.reduce((sum, refund) => sum + refund.refund_amount, 0) || 0
      const remainingRefundableAmount = originalSale.total_amount - totalExistingRefunds

      if (refundRequest.refund_amount > remainingRefundableAmount) {
        throw new Error(`Refund amount exceeds remaining refundable amount (€${remainingRefundableAmount.toFixed(2)})`)
      }

      // Create the refund record
      const { data: refundData, error: refundError } = await supabase
        .from('refunds')
        .insert([refundRequest])
        .select()
        .single()

      if (refundError) {
        throw new Error(`Failed to process refund: ${refundError.message}`)
      }

      // Handle inventory restocking if enabled
      if (refundData && refundRequest.restock && refundRequest.quantity_refunded && refundRequest.quantity_refunded > 0) {
        await handleInventoryRestock(refundRequest, refundData)
      }

      return { data: refundData, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getRefundsBySale = async (saleId: number): Promise<{ data: Refund[] | null; error: string | null }> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .eq('original_sale_id', saleId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch refunds: ${error.message}`)
      }

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getRefundsByBusiness = async (businessId: number, limit: number = 50): Promise<{ data: Refund[] | null; error: string | null }> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          sales!refunds_original_sale_id_fkey(
            sale_id,
            total_amount,
            datetime,
            payment_method
          ),
          customers!refunds_customer_id_fkey(
            customer_id,
            name
          ),
          users!refunds_cashier_id_fkey(
            user_id,
            username
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch refunds: ${error.message}`)
      }

      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getRefundStats = async (businessId: number, startDate?: string, endDate?: string): Promise<{ data: any | null; error: string | null }> => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('refunds')
        .select('refund_amount, refund_method, reason, created_at')
        .eq('business_id', businessId)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await supabase
        .from('refunds')
        .select('refund_amount, refund_method, reason, created_at')
        .eq('business_id', businessId)

      if (error) {
        throw new Error(`Failed to fetch refund stats: ${error.message}`)
      }

      if (!data) {
        return { data: null, error: null }
      }

      // Calculate stats
      const totalRefunds = data.length
      const totalRefundAmount = data.reduce((sum, refund) => sum + refund.refund_amount, 0)
      const avgRefundAmount = totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0

      // Group by method
      const methodStats = data.reduce((acc, refund) => {
        acc[refund.refund_method] = (acc[refund.refund_method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by reason
      const reasonStats = data.reduce((acc, refund) => {
        const reason = refund.reason || 'Unknown'
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const stats = {
        totalRefunds,
        totalRefundAmount,
        avgRefundAmount,
        methodBreakdown: methodStats,
        reasonBreakdown: reasonStats,
        refunds: data
      }

      return { data: stats, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    processRefund,
    getRefundsBySale,
    getRefundsByBusiness,
    getRefundStats,
    clearError: () => setError(null)
  }
}

