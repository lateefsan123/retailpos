export interface Product {
  product_id: string
  name: string
  price: number
  category: string
  stock_quantity: number
  image_url?: string
  weight_unit?: string // e.g., 'kg', 'g', 'lb', 'oz'
  price_per_unit?: number // price per weight unit (e.g., 3.00 for €3 per kg)
  is_weighted?: boolean // true if item is sold by weight
  business_id: number // Multi-tenant support
  tax_rate?: number
  description?: string
  sku?: string
  barcode?: string | null
  sales_count?: number
  total_revenue?: number
  last_sold_date?: string
}

export interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price: number | null
  stock_qty: number | null
  side_businesses?: {
    name: string
    business_type: string
  }
}

export interface OrderItem {
  product?: Product
  sideBusinessItem?: SideBusinessItem
  quantity: number
  customPrice?: number // For service items with custom pricing
  weight?: number // Weight/quantity for weighted items
  calculatedPrice?: number // Calculated price for weighted items
  originalQuantity?: number
  originalWeight?: number
  originalCalculatedPrice?: number
}

export interface Order {
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
}

export interface PaymentInfo {
  method: 'cash' | 'card' | 'credit'
  amountEntered: string
  change: number
  customerName: string
  receiptNotes: string
  allowPartialPayment?: boolean
  partialAmount?: string
  remainingAmount?: number
}

export interface PartialPayment {
  isEnabled: boolean
  amountPaid: number
  amountRemaining: number
  paymentDate: string
  dueDate?: string
  notes?: string
  paymentMethod: 'cash' | 'card' | 'credit'
}

export interface PaymentPlan {
  totalAmount: number
  amountPaid: number
  amountRemaining: number
  installments: PaymentInstallment[]
  status: 'pending' | 'partial' | 'completed' | 'overdue'
}

export interface PaymentInstallment {
  id: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'pending' | 'paid' | 'overdue'
  paymentMethod?: 'cash' | 'card' | 'credit'
  notes?: string
}
