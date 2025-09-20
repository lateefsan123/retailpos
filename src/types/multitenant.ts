// =====================================================
// MULTI-TENANT POS SYSTEM TYPES
// =====================================================
// Updated TypeScript interfaces for the new multi-tenant schema
// =====================================================

// =====================================================
// CORE BUSINESS TYPES
// =====================================================

export interface BusinessInfo {
  business_id: number
  name: string
  logo_url?: string
  address: string
  phone_number?: string
  vat_number?: string
  receipt_footer?: string
  updated_at: string
}

export interface User {
  user_id: number
  username: string
  password_hash: string
  role: 'admin' | 'cashier' | 'manager'
  active: boolean
  icon?: string
  business_id: number
  auth_user_id?: string // UUID from Supabase auth
}

// =====================================================
// PRODUCT TYPES (Updated)
// =====================================================

export interface Product {
  product_id: string // Now TEXT (UUID format)
  name: string
  category?: string
  price: number
  stock_quantity: number
  supplier_info?: string
  reorder_level: number
  tax_rate: number
  last_updated: string
  image_url?: string
  is_weighted: boolean
  price_per_unit?: number
  weight_unit?: string
  description?: string
  sku?: string
  sales_count: number
  total_revenue: number
  last_sold_date?: string
  business_id: number // Multi-tenant support
}

export interface NewProduct {
  product_name: string
  category: string
  price: string
  stock_quantity: string
  reorder_level: string
  supplier_info: string
  tax_rate: string
  description: string
  sku: string
  is_weighted: boolean
  weight_unit: string
  price_per_unit: string
}

// =====================================================
// CUSTOMER TYPES (Updated)
// =====================================================

export interface Customer {
  customer_id: number
  name: string
  phone_number: string
  email?: string
  loyalty_points: number
  credit_balance: number
  business_id: number // Multi-tenant support
}

export interface NewCustomer {
  name: string
  phone_number: string
  email?: string
  loyalty_points?: number
  credit_balance?: number
}

// =====================================================
// SALES TYPES (Updated)
// =====================================================

export interface Sale {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: 'cash' | 'card' | 'credit'
  cashier_id?: number
  customer_id?: number
  discount_applied: number
  partial_payment: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
  notes?: string
  business_id: number // Multi-tenant support
}

export interface SaleItem {
  sale_item_id: number
  sale_id: number
  product_id: string // Now TEXT
  quantity: number
  price_each: number
  weight?: number
  calculated_price?: number
}

export interface OrderItem {
  product?: Product
  sideBusinessItem?: SideBusinessItem
  quantity: number
  customPrice?: number
  weight?: number
  calculatedPrice?: number
}

export interface Order {
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
}

// =====================================================
// PAYMENT TYPES (Updated)
// =====================================================

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

// =====================================================
// SIDE BUSINESS TYPES (Updated)
// =====================================================

export interface SideBusiness {
  business_id: number
  owner_id: number
  name: string
  description?: string
  business_type?: string
  created_at: string
  image_url?: string
  parent_shop_id: number
}

export interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price?: number
  stock_qty?: number
  created_at: string
  notes?: string
  parent_shop_id: number
  side_businesses?: {
    name: string
    business_type: string
  }
}

export interface SideBusinessSale {
  sale_id: number
  business_id: number
  quantity: number
  total_amount: number
  payment_method: string
  date_time: string
  item_id: number
  parent_shop_id: number
}

// =====================================================
// REMINDER TYPES (Updated)
// =====================================================

export interface Reminder {
  reminder_id: number
  owner_id: number
  title: string
  body: string
  remind_date: string
  created_at: string
  resolved: boolean
  business_id: number // Multi-tenant support
}

export interface NewReminder {
  title: string
  body: string
  remind_date: string
}

// =====================================================
// VAULT TYPES (New)
// =====================================================

export interface Vault {
  vault_id: number
  owner_id: number
  pin_hash: string
  created_at: string
  business_id: number
}

export interface VaultEntry {
  entry_id: number
  vault_id: number
  label: string
  email: string
  password_enc: string
  created_at: string
  link?: string
}

// =====================================================
// INVENTORY MOVEMENT TYPES (New)
// =====================================================

export interface InventoryMovement {
  movement_id: number
  product_id: string
  quantity_change: number
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'return'
  datetime: string
  reference_id?: number
  business_id: number
}

// =====================================================
// TRANSACTION TYPES (Updated)
// =====================================================

export interface Transaction {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  cashier_id?: number
  customer_id?: number
  discount_applied: number
  partial_payment: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
  notes?: string
  business_id: number
  items: TransactionItem[]
  customer?: Customer
  cashier?: User
}

export interface TransactionItem {
  sale_item_id: number
  sale_id: number
  product_id: string
  quantity: number
  price_each: number
  weight?: number
  calculated_price?: number
  product?: Product
}

// =====================================================
// BUSINESS ANALYTICS TYPES (New)
// =====================================================

export interface BusinessAnalytics {
  business_id: number
  total_sales: number
  total_revenue: number
  total_customers: number
  total_products: number
  low_stock_items: number
  recent_sales: Sale[]
  top_products: Product[]
}

// =====================================================
// FORM TYPES
// =====================================================

export interface BusinessForm {
  name: string
  address: string
  phone_number?: string
  vat_number?: string
  receipt_footer?: string
  logo_url?: string
}

export interface UserForm {
  username: string
  password: string
  role: 'admin' | 'cashier' | 'manager'
  icon?: string
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// =====================================================
// CONTEXT TYPES
// =====================================================

export interface BusinessContextType {
  currentBusiness: BusinessInfo | null
  businesses: BusinessInfo[]
  switchBusiness: (businessId: number) => void
  loading: boolean
  error: string | null
}

export interface MultiTenantAuthContextType {
  user: User | null
  currentBusiness: BusinessInfo | null
  businesses: BusinessInfo[]
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  switchBusiness: (businessId: number) => void
  loading: boolean
  error: string | null
}
