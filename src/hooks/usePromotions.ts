import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Promotion, PromotionRequest, Product, PromotionStats } from '../types/multitenant'

export const usePromotions = (businessId: number | null, branchId: number | null = null) => {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all promotions
  const fetchPromotions = async () => {
    if (!businessId) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('promotions')
        .select(`
          *,
          promotion_products (
            product_id,
            products (*)
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        // If table doesn't exist, show helpful message
        if (fetchError.message.includes('relation "public.promotions" does not exist')) {
          setError('Promotions table not found. Please run the database migration first.')
          setPromotions([])
          return
        }
        throw fetchError
      }

      // Transform data to include products array
      const transformedData = data.map((promo: any) => ({
        ...promo,
        products: promo.promotion_products?.map((pp: any) => pp.products).filter(Boolean) || []
      }))

      setPromotions(transformedData)
    } catch (err: any) {
      console.error('Error fetching promotions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch only active promotions (within date range)
  const fetchActivePromotions = async () => {
    if (!businessId) return

    try {
      const now = new Date().toISOString()

      let query = supabase
        .from('promotions')
        .select(`
          *,
          promotion_products (
            product_id,
            products (*)
          )
        `)
        .eq('business_id', businessId)
        .eq('active', true)
        .lte('start_date', now)
        .gte('end_date', now)

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const transformedData = data.map((promo: any) => ({
        ...promo,
        products: promo.promotion_products?.map((pp: any) => pp.products).filter(Boolean) || []
      }))

      setActivePromotions(transformedData)
    } catch (err: any) {
      console.error('Error fetching active promotions:', err)
    }
  }

  // Create a new promotion
  const createPromotion = async (promotion: PromotionRequest): Promise<boolean> => {
    try {
      const { product_ids, ...promotionData } = promotion

      // Insert promotion
      const { data, error: insertError } = await supabase
        .from('promotions')
        .insert([promotionData])
        .select()
        .single()

      if (insertError) throw insertError

      // If specific products, insert product links
      if (promotion.applies_to === 'specific' && product_ids && product_ids.length > 0) {
        const productLinks = product_ids.map(product_id => ({
          promotion_id: data.promotion_id,
          product_id
        }))

        const { error: linkError } = await supabase
          .from('promotion_products')
          .insert(productLinks)

        if (linkError) throw linkError
      }

      await fetchPromotions()
      await fetchActivePromotions()
      return true
    } catch (err: any) {
      console.error('Error creating promotion:', err)
      setError(err.message)
      return false
    }
  }

  // Update promotion
  const updatePromotion = async (promotionId: number, updates: Partial<PromotionRequest>): Promise<boolean> => {
    try {
      const { product_ids, ...promotionData } = updates

      // Update promotion
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ ...promotionData, updated_at: new Date().toISOString() })
        .eq('promotion_id', promotionId)

      if (updateError) throw updateError

      // If updating products for specific promotion
      if (updates.applies_to === 'specific' && product_ids) {
        // Delete existing product links
        await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', promotionId)

        // Insert new product links
        if (product_ids.length > 0) {
          const productLinks = product_ids.map(product_id => ({
            promotion_id: promotionId,
            product_id
          }))

          const { error: linkError } = await supabase
            .from('promotion_products')
            .insert(productLinks)

          if (linkError) throw linkError
        }
      }

      await fetchPromotions()
      await fetchActivePromotions()
      return true
    } catch (err: any) {
      console.error('Error updating promotion:', err)
      setError(err.message)
      return false
    }
  }

  // Delete promotion
  const deletePromotion = async (promotionId: number): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('promotions')
        .delete()
        .eq('promotion_id', promotionId)

      if (deleteError) throw deleteError

      await fetchPromotions()
      await fetchActivePromotions()
      return true
    } catch (err: any) {
      console.error('Error deleting promotion:', err)
      setError(err.message)
      return false
    }
  }

  // Toggle promotion active status
  const togglePromotion = async (promotionId: number, active: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('promotion_id', promotionId)

      if (updateError) throw updateError

      await fetchPromotions()
      await fetchActivePromotions()
      return true
    } catch (err: any) {
      console.error('Error toggling promotion:', err)
      setError(err.message)
      return false
    }
  }

  // Get promotion statistics
  const getPromotionStats = async (promotionId: number): Promise<PromotionStats | null> => {
    try {
      const { data, error: statsError } = await supabase
        .from('promotion_applications')
        .select('discount_amount, sale_id')
        .eq('promotion_id', promotionId)

      if (statsError) throw statsError

      const total_applications = data.length
      const total_discount_given = data.reduce((sum, app) => sum + Number(app.discount_amount), 0)
      const unique_sales = new Set(data.map(app => app.sale_id)).size

      return {
        promotion_id: promotionId,
        total_applications,
        total_discount_given,
        total_sales: unique_sales,
        avg_discount_per_sale: unique_sales > 0 ? total_discount_given / unique_sales : 0
      }
    } catch (err: any) {
      console.error('Error fetching promotion stats:', err)
      return null
    }
  }

  // Calculate applicable promotions for cart
  const calculatePromotions = (items: Array<{ product_id: string; quantity: number; price: number }>, subtotal: number) => {
    const applicablePromotions: Array<{
      promotion: Promotion
      discount: number
      items: string[]
    }> = []

    for (const promo of activePromotions) {
      // Check minimum purchase amount
      if (promo.min_purchase_amount && subtotal < promo.min_purchase_amount) continue

      // Check usage limit
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) continue

      let discount = 0
      let affectedItems: string[] = []

      if (promo.applies_to === 'all') {
        // Apply to entire purchase
        if (promo.discount_type === 'percentage') {
          discount = (subtotal * promo.discount_value) / 100
        } else {
          discount = promo.discount_value
        }
        affectedItems = items.map(item => item.product_id)
      } else {
        // Apply to specific products
        const promoProductIds = promo.products?.map(p => p.product_id) || []
        const eligibleItems = items.filter(item => promoProductIds.includes(item.product_id))

        if (eligibleItems.length > 0) {
          const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

          if (promo.discount_type === 'percentage') {
            discount = (eligibleSubtotal * promo.discount_value) / 100
          } else {
            discount = promo.discount_value
          }
          affectedItems = eligibleItems.map(item => item.product_id)
        }
      }

      // Apply max discount cap
      if (promo.max_discount_amount && discount > promo.max_discount_amount) {
        discount = promo.max_discount_amount
      }

      if (discount > 0) {
        applicablePromotions.push({
          promotion: promo,
          discount,
          items: affectedItems
        })
      }
    }

    return applicablePromotions
  }

  // Record promotion application
  const recordPromotionApplication = async (
    promotionId: number,
    saleId: number,
    discountAmount: number,
    saleItemId?: number
  ): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('promotion_applications')
        .insert([{
          promotion_id: promotionId,
          sale_id: saleId,
          sale_item_id: saleItemId,
          discount_amount: discountAmount
        }])

      if (insertError) throw insertError

      // Increment usage count
      const { error: updateError } = await supabase
        .rpc('increment_promotion_usage', { promo_id: promotionId })

      if (updateError) {
        // Fallback manual increment if RPC doesn't exist
        const { data: currentPromo } = await supabase
          .from('promotions')
          .select('usage_count')
          .eq('promotion_id', promotionId)
          .single()

        if (currentPromo) {
          await supabase
            .from('promotions')
            .update({ usage_count: (currentPromo.usage_count || 0) + 1 })
            .eq('promotion_id', promotionId)
        }
      }

      return true
    } catch (err: any) {
      console.error('Error recording promotion application:', err)
      return false
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchPromotions()
      fetchActivePromotions()
    }
  }, [businessId, branchId])

  return {
    promotions,
    activePromotions,
    loading,
    error,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotion,
    getPromotionStats,
    calculatePromotions,
    recordPromotionApplication,
    refresh: fetchPromotions
  }
}
