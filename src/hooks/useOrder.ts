import { useState, useEffect } from 'react'
import { Order, OrderItem, Product, SideBusinessItem } from '../types/sales'

interface UseOrderOptions {
  onStockValidation?: (product: Product, requestedQuantity: number) => boolean
}

export const useOrder = (options?: UseOrderOptions) => {
  const [order, setOrder] = useState<Order>({
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0
  })

  const calculateOrderTotal = () => {
    const subtotal = order.items.reduce((sum, item) => {
      if (item.product) {
        // Check if this is a weighted item
        if (item.weight && item.calculatedPrice) {
          return sum + item.calculatedPrice
        }
        // Regular product
        return sum + (item.product.price * item.quantity)
      } else if (item.sideBusinessItem) {
        // Use custom price if available, otherwise use item price
        const price = item.customPrice || item.sideBusinessItem.price || 0
        return sum + (price * item.quantity)
      }
      return sum
    }, 0)
    const tax = 0 // No tax
    const discount = 0 // Can be implemented later
    const total = subtotal - discount

    setOrder(prev => ({
      ...prev,
      subtotal,
      tax,
      discount,
      total
    }))
  }

  const addToOrder = (product: Product) => {
    const existingItem = order.items.find(item => 
      item.product?.product_id === product.product_id && !item.weight
    )
    
    const requestedQuantity = existingItem ? existingItem.quantity + 1 : 1
    
    // Check stock validation if callback is provided
    if (options?.onStockValidation && !options.onStockValidation(product, requestedQuantity)) {
      return // Stock validation failed, don't add to order
    }
    
    setOrder(prev => {
      const existingItem = prev.items.find(item => 
        item.product?.product_id === product.product_id && !item.weight // Only match non-weighted items
      )
      
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.product?.product_id === product.product_id && !item.weight
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, { product, quantity: 1 }]
        }
      }
    })
  }

  const addWeightedProductToOrder = (product: Product, weight: number) => {
    const calculatedPrice = weight * (product.price_per_unit || 0)
    
    setOrder(prev => ({
      ...prev,
      items: [...prev.items, { 
        product, 
        quantity: 1, 
        weight, 
        calculatedPrice 
      }]
    }))
  }

  const addSideBusinessItemToOrder = (sideBusinessItem: SideBusinessItem, customPrice?: number) => {
    setOrder(prev => {
      const existingItem = prev.items.find(item => 
        item.sideBusinessItem?.item_id === sideBusinessItem.item_id && 
        item.customPrice === customPrice
      )
      
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.sideBusinessItem?.item_id === sideBusinessItem.item_id && item.customPrice === customPrice
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, { sideBusinessItem, quantity: 1, customPrice }]
        }
      }
    })
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(itemId)
      return
    }

    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product?.product_id === itemId) {
          return { ...item, quantity: newQuantity }
        } else if (item.sideBusinessItem?.item_id.toString() === itemId) {
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    }))
  }

  const updateWeight = (itemId: string, newWeight: number) => {
    if (newWeight <= 0) {
      removeFromOrder(itemId)
      return
    }

    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product?.product_id === itemId && item.weight) {
          const calculatedPrice = newWeight * (item.product.price_per_unit || 0)
          return { 
            ...item, 
            weight: newWeight, 
            calculatedPrice 
          }
        }
        return item
      })
    }))
  }

  const removeFromOrder = (itemId: string) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => 
        item.product?.product_id !== itemId && 
        item.sideBusinessItem?.item_id.toString() !== itemId
      )
    }))
  }

  const resetOrder = () => {
    setOrder({
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0
    })
  }

  const loadExistingTransaction = (items: OrderItem[]) => {
    setOrder({
      items,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0
    })
    // Total will be recalculated by the useEffect
  }

  // Recalculate totals whenever items change
  useEffect(() => {
    calculateOrderTotal()
  }, [order.items])

  return {
    order,
    addToOrder,
    addWeightedProductToOrder,
    addSideBusinessItemToOrder,
    updateQuantity,
    updateWeight,
    removeFromOrder,
    resetOrder,
    calculateOrderTotal,
    loadExistingTransaction
  }
}
