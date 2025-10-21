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
  opening_time?: string
  closing_time?: string
  updated_at: string
}

export interface User {
  user_id: number
  username: string
  password_hash: string
  role: 'Admin' | 'Owner' | 'Cashier' | 'Manager'
  active: boolean
  icon?: string
  business_id: number
  auth_user_id?: string // UUID from Supabase auth
  pin?: string // User PIN for quick authentication
  pin_hash?: string // Hashed PIN for secure authentication
  private_preview?: boolean // Private preview access gate
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
  supplier_id?: number
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
  supplier_id: string
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
  gender?: 'male' | 'female'
  icon?: string
  business_id: number // Multi-tenant support
  branch_id?: number // Branch support
}

export interface NewCustomer {
  name: string
  phone_number: string
  email?: string
  loyalty_points?: number
  gender?: 'male' | 'female'
  icon?: string
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
  method: 'cash' | 'card' | 'credit' | 'tap'
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

export interface TaskNote {
  note_id: number
  task_id: number
  author_id: number
  text: string
  created_at: string
  business_id: number
  // UI properties from joins
  author?: {
    user_id: number
    username: string
    full_name?: string
    icon?: string
  }
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Review' | 'Completed'

export interface Reminder {
  reminder_id: number
  owner_id: number
  title: string
  body: string
  remind_date: string
  created_at: string
  resolved?: boolean
  business_id?: number // Multi-tenant support
  sale_id?: number // Link to transaction for payment reminders
  // Task assignment fields
  assigned_to?: number
  assigned_by?: number
  is_task?: boolean
  completed_by?: number
  completed_at?: string
  branch_id?: number | null
  priority?: 'Low' | 'Medium' | 'High'
  notes?: string // Simple notes field
  status?: TaskStatus // Task status for kanban
  taskNotes?: TaskNote[] // Array of task notes with authors
  notesCount?: number // Cached count of notes for quick display
  // Product and icon assignment
  product_id?: string // Optional product assignment
  task_icon?: string // Icon for task categorization
  // UI fields
  x?: number
  y?: number
  rotation?: number
  transactionResolved?: boolean
  isEditing?: boolean
  color?: string
  assigned_to_user?: {
    user_id: number
    username: string
    role: string
    icon?: string
    full_name?: string
  }
  assigned_by_user?: {
    user_id: number
    username: string
    role: string
    icon?: string
    full_name?: string
  }
  completed_by_user?: {
    user_id: number
    username: string
    role: string
    icon?: string
    full_name?: string
  }
  // Product information for assigned product
  product?: {
    product_id: string
    name: string
    category?: string
    price: number
    stock_quantity: number
    image_url?: string
    sku?: string
  }
}

export interface NewReminder {
  title: string
  body: string
  remind_date: string
}

export interface NewTask {
  title: string
  body: string
  remind_date: string
  assigned_to: number
  priority?: 'Low' | 'Medium' | 'High'
  notes?: string
  product_id?: string
  task_icon?: string
}

export interface TaskFilters {
  assignedTo?: number
  status?: TaskStatus | 'All'
  priority?: 'Low' | 'Medium' | 'High' | 'All'
  search?: string
  dateRange?: {
    start: string
    end: string
  }
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
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'Restock' | 'Transaction Deletion'
  datetime: string
  reference_id?: number
  business_id: number
  branch_id?: number
  notes?: string
  created_by?: number
}

// =====================================================
// REFUND TYPES (New)
// =====================================================

export interface Refund {
  refund_id: number
  original_sale_id: number
  sale_item_id?: number
  customer_id?: number
  cashier_id?: number
  refund_amount: number
  refund_method: 'cash' | 'card' | 'store_credit' | 'gift_card'
  reason?: string
  notes?: string
  quantity_refunded?: number
  restock?: boolean
  created_at: string
  business_id: number
  branch_id: number
}

export interface RefundRequest {
  original_sale_id: number
  sale_item_id?: number
  customer_id?: number
  cashier_id?: number
  refund_amount: number
  refund_method: 'cash' | 'card' | 'store_credit' | 'gift_card'
  reason?: string
  notes?: string
  quantity_refunded?: number
  restock?: boolean
  business_id: number
  branch_id: number
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
  role: 'Admin' | 'Owner' | 'Cashier' | 'Manager'
  icon?: string
  pin?: string
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

// =====================================================
// SUPPLIER MANAGEMENT TYPES
// =====================================================

export interface Supplier {
  supplier_id: number
  business_id: number
  branch_id?: number
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  image_url?: string
  created_at: string
  active: boolean
}

export interface SupplierRequest {
  business_id: number
  branch_id?: number
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  image_url?: string
  active?: boolean
}

export interface PurchaseOrder {
  po_id: number
  supplier_id: number
  business_id: number
  branch_id?: number
  order_date: string
  expected_date?: string
  status: 'pending' | 'received' | 'cancelled'
  total_amount: number
  created_by?: number
  notes?: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  poi_id: number
  po_id: number
  product_id: string
  quantity: number
  unit_price: number
  received_quantity: number
  product?: Product
}

export interface PurchaseOrderRequest {
  supplier_id: number
  business_id: number
  branch_id?: number
  expected_date?: string
  notes?: string
  items: PurchaseOrderItemRequest[]
}

export interface PurchaseOrderItemRequest {
  product_id: string
  quantity: number
  unit_price: number
}

// =====================================================
// SUPPLIER VISITS TYPES
// =====================================================

export interface SupplierVisit {
  visit_id: number
  supplier_id: number
  business_id: number
  branch_id?: number
  visit_date: string
  start_time?: string
  end_time?: string
  visit_type: 'delivery' | 'meeting' | 'inspection' | 'other'
  notes?: string
  amount?: number
  paid?: boolean
  created_at: string
  created_by?: number
  supplier?: Supplier
}

export interface SupplierVisitRequest {
  supplier_id: number
  business_id: number
  branch_id?: number
  visit_date: string
  start_time?: string
  end_time?: string
  visit_type: 'delivery' | 'meeting' | 'inspection' | 'other'
  notes?: string
  amount?: number
  paid?: boolean
  created_by?: number
}

// =====================================================
// PROMOTIONS & DISCOUNTS TYPES
// =====================================================

export interface Promotion {
  promotion_id: number
  business_id: number
  branch_id?: number
  name: string
  description?: string
  promotion_type?: 'standard' | 'buy_x_discount' | 'buy_x_get_y_free'
  discount_type?: 'percentage' | 'fixed_amount'
  discount_value?: number
  quantity_required?: number
  quantity_reward?: number
  applies_to_categories?: boolean
  category_ids?: string[]
  start_date: string
  end_date: string
  active: boolean
  applies_to: 'all' | 'specific'
  min_purchase_amount: number
  max_discount_amount?: number
  usage_limit?: number
  usage_count: number
  created_at: string
  created_by?: number
  updated_at: string
  products?: Product[] // For specific promotions
}

export interface PromotionRequest {
  business_id: number
  branch_id?: number
  name: string
  description?: string
  promotion_type?: 'standard' | 'buy_x_discount' | 'buy_x_get_y_free'
  discount_type?: 'percentage' | 'fixed_amount'
  discount_value?: number
  quantity_required?: number
  quantity_reward?: number
  applies_to_categories?: boolean
  category_ids?: string[]
  start_date: string
  end_date: string
  active?: boolean
  applies_to: 'all' | 'specific'
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  product_ids?: string[] // For specific promotions
}

export interface PromotionProduct {
  promo_product_id: number
  promotion_id: number
  product_id: string
  created_at: string
  product?: Product
}

export interface PromotionApplication {
  application_id: number
  promotion_id: number
  sale_id: number
  sale_item_id?: number
  discount_amount: number
  applied_at: string
  promotion?: Promotion
}

export interface PromotionStats {
  promotion_id: number
  total_applications: number
  total_discount_given: number
  total_sales: number
  avg_discount_per_sale: number
}

export interface AppliedPromotion {
  promotion: Promotion
  discount_amount: number
  items_affected: string[] // product_ids
}

// =====================================================
// LOYALTY PRIZES TYPES
// =====================================================

export interface LoyaltyPrize {
  prize_id: number
  business_id: number
  branch_id?: number
  product_id: string
  points_required: number
  is_active: boolean
  created_at: string
  created_by?: number
  updated_at: string
  product?: Product // Joined from products table
}

export interface NewLoyaltyPrize {
  product_id: string
  points_required: number
  is_active?: boolean
}

export interface LoyaltyRedemption {
  redemption_id: number
  customer_id: number
  prize_id: number
  points_used: number
  quantity: number
  redeemed_at: string
  redeemed_by?: number
  business_id: number
  branch_id?: number
  notes?: string
  customer?: Customer // Joined from customers table
  prize?: LoyaltyPrize // Joined from loyalty_prizes table
}

export interface NewLoyaltyRedemption {
  customer_id: number
  prize_id: number
  quantity?: number
  notes?: string
}
