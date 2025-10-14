import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { hashPassword } from '../utils/auth'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import VaultModal from '../components/VaultModal'
import BranchSelector from '../components/BranchSelector'
import PageHeader from '../components/PageHeader'
import ActionDropdown from '../components/ActionDropdown'
import { ICON_PACKS, DEFAULT_ICON_NAME } from '../constants/userIcons'

interface User {
  user_id: number
  username: string
  password_hash: string
  role: string
  active: boolean
  icon?: string
  business_id: number
  branch_id?: number
  branch_name?: string
}

interface NewUser {
  username: string
  password: string
  role: string
  icon: string
  branch_id?: number
  pin?: string
}

interface Branch {
  branch_id: number
  branch_name: string
  address: string
  phone: string
  manager_id?: number
  shop_image: string
  business_id: number
  active: boolean
  created_at: string
}

interface NewBranch {
  branch_name: string
  address: string
  phone: string
  manager_id?: number
  shop_image: string
}

const Admin = () => {
  const navigate = useNavigate()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [showEditBranchModal, setShowEditBranchModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'stats'>('details')
  const [userStats, setUserStats] = useState<any>(null)
  const [showTransactionDetailModal, setShowTransactionDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [transactionItems, setTransactionItems] = useState<any[]>([])
  const [loadingTransactionItems, setLoadingTransactionItems] = useState(false)
  const [showBranchStatsModal, setShowBranchStatsModal] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [branchStats, setBranchStats] = useState<any>(null)
  const [branchStatsTab, setBranchStatsTab] = useState<'overview' | 'sales' | 'products' | 'customers' | 'users'>('overview')
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    password: '',
    role: 'Cashier',
    icon: DEFAULT_ICON_NAME,
    branch_id: selectedBranchId || undefined
  })
  const [newBranch, setNewBranch] = useState<NewBranch>({
    branch_name: '',
    address: '',
    phone: '',
    manager_id: undefined,
    shop_image: 'shop1'
  })

  const [selectedIconPack, setSelectedIconPack] = useState<keyof typeof ICON_PACKS>('default')
  const availableIcons = ICON_PACKS[selectedIconPack].icons

  // Available shop images
  const availableShopImages = [
    { name: 'shop1', label: 'Shop 1' },
    { name: 'shop2', label: 'Shop 2' },
    { name: 'shop3', label: 'Shop 3' },
    { name: 'shop4', label: 'Shop 4' }
  ]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showVaultModal, setShowVaultModal] = useState(false)

  // Reset form to default values
  const resetNewUserForm = () => {
    setNewUser({
      username: '',
      password: '',
      role: 'Cashier',
      icon: DEFAULT_ICON_NAME,
      branch_id: selectedBranchId || undefined,
      pin: ''
    })
    setError('')
    setSelectedIconPack('default')
  }

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchUsers()
      fetchBranches()
    }
  }, [businessId, businessLoading, selectedBranchId])

  // Update newUser branch_id when selectedBranchId changes
  useEffect(() => {
    setNewUser(prev => ({
      ...prev,
      branch_id: selectedBranchId || undefined
    }))
  }, [selectedBranchId])

  const fetchUsers = async () => {
    if (!businessId) {
      setUsers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('*')
        .eq('business_id', businessId)
        .order('user_id', { ascending: false })

      // Add branch filtering if branch is selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: users, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
        setError('Failed to fetch users')
        return
      }

      // Get branch information for users
      const usersWithBranches = await Promise.all((users || []).map(async (user) => {
        if (user.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('branch_name')
            .eq('branch_id', user.branch_id)
            .single();
          
          return {
            ...user,
            branch_name: branchData?.branch_name || 'Branch Not Found'
          };
        }
        
        return {
          ...user,
          branch_name: 'No Branch Assigned'
        };
      }));

      setUsers(usersWithBranches)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    if (!businessId) {
      setBranches([])
      return
    }

    try {
      const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .order('branch_id', { ascending: false })

      if (error) {
        console.error('Error fetching branches:', error)
        setError('Failed to fetch branches')
        return
      }

      setBranches(branches || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      setError('Failed to fetch branches')
    }
  }

  // Helper function to get manager name by ID
  const getManagerName = (managerId: number | undefined): string => {
    if (!managerId) return 'Not assigned'
    
    const manager = users.find(user => user.user_id === managerId)
    return manager ? manager.username : `User #${managerId}`
  }

  // Fetch branch statistics
  const fetchBranchStats = async (branchId: number) => {
    try {
      setLoading(true)
      
      // Fetch sales data for the branch with proper joins
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          users!fk_sales_cashier_id(username, role),
          customers(name)
        `)
        .eq('branch_id', branchId)
        .order('datetime', { ascending: false })

      if (salesError) {
        console.error('Error fetching branch sales:', salesError)
        return
      }

      // Fetch sale items to get product information
      const { data: saleItemsData, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products(name, category)
        `)
        .in('sale_id', salesData?.map(sale => sale.sale_id) || [])

      if (saleItemsError) {
        console.error('Error fetching sale items:', saleItemsError)
      }

      // Fetch users in this branch
      const { data: branchUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('branch_id', branchId)
        .eq('active', true)

      if (usersError) {
        console.error('Error fetching branch users:', usersError)
        return
      }

      // Fetch products in this branch
      const { data: branchProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('branch_id', branchId)

      if (productsError) {
        console.error('Error fetching branch products:', productsError)
        return
      }

      // Fetch customers in this branch
      const { data: branchCustomers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('branch_id', branchId)

      if (customersError) {
        console.error('Error fetching branch customers:', customersError)
      }

      // Fetch refunds for this branch
      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select('*')
        .eq('branch_id', branchId)

      if (refundsError) {
        console.error('Error fetching refunds:', refundsError)
      }

      // Calculate statistics
      const totalSales = salesData?.length || 0
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      const totalUsers = branchUsers?.length || 0
      const totalProducts = branchProducts?.length || 0
      const totalCustomers = branchCustomers?.length || 0
      const totalRefunds = refundsData?.length || 0
      const totalRefundAmount = refundsData?.reduce((sum, refund) => sum + (refund.refund_amount || 0), 0) || 0

      // Calculate recent sales (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSales = salesData?.filter(sale => 
        new Date(sale.datetime) >= thirtyDaysAgo
      ) || []

      // Calculate daily averages
      const recentRevenue = recentSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const avgDailySales = recentSales.length / 30
      const avgDailyRevenue = recentRevenue / 30

      // Get top selling products from sale items with full product data
      const productSales = saleItemsData?.reduce((acc: any, item: any) => {
        const productName = item.products?.name || 'Unknown Product'
        const productId = item.product_id
        if (!acc[productName]) {
          acc[productName] = {
            quantity: 0,
            product_id: productId,
            category: item.products?.category,
            image_url: null
          }
        }
        acc[productName].quantity += (item.quantity || 0)
        return acc
      }, {})

      // Get product images for top products
      const topProductNames = Object.entries(productSales || {})
        .sort(([,a]: any, [,b]: any) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(([name]) => name)

      // Fetch product images for top products
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('products')
        .select('product_id, name, image_url, category')
        .in('name', topProductNames)
        .eq('branch_id', branchId)

      if (topProductsError) {
        console.error('Error fetching top products data:', topProductsError)
      }

      // Merge product data with sales data
      const topProducts = Object.entries(productSales || {})
        .sort(([,a]: any, [,b]: any) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(([name, data]: any) => {
          const productInfo = topProductsData?.find(p => p.name === name)
          return {
            name,
            quantity: data.quantity,
            product_id: data.product_id,
            category: data.category,
            image_url: productInfo?.image_url || null
          }
        })

      // Calculate net revenue (total revenue - refunds)
      const netRevenue = totalRevenue - totalRefundAmount

      const stats = {
        totalSales,
        totalRevenue,
        netRevenue,
        totalUsers,
        totalProducts,
        totalCustomers,
        totalRefunds,
        totalRefundAmount,
        recentSales: recentSales.length,
        recentRevenue,
        avgDailySales: Math.round(avgDailySales * 10) / 10,
        avgDailyRevenue: Math.round(avgDailyRevenue * 10) / 10,
        topProducts,
        salesData: salesData?.slice(0, 10) || [], // Last 10 sales for preview
        branchUsers,
        branchProducts,
        branchCustomers: branchCustomers?.slice(0, 10) || [], // Last 10 customers
        refundsData: refundsData?.slice(0, 5) || [] // Last 5 refunds
      }

      setBranchStats(stats)
    } catch (error) {
      console.error('Error fetching branch stats:', error)
      setError('Failed to fetch branch statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async (userId: number) => {
    try {
      // Fetch sales data for the user
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('cashier_id', userId)
        .order('datetime', { ascending: false })

      if (salesError) {
        console.error('Error fetching user sales:', salesError)
        return
      }

      // Fetch recent transactions (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: recentSales, error: recentError } = await supabase
        .from('sales')
        .select('*')
        .eq('cashier_id', userId)
        .gte('datetime', thirtyDaysAgo.toISOString())

      if (recentError) {
        console.error('Error fetching recent sales:', recentError)
        return
      }

      // Calculate stats
      const totalSales = salesData?.length || 0
      const recentSalesCount = recentSales?.length || 0
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      const recentRevenue = recentSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

      // Get user's first sale date
      const firstSale = salesData && salesData.length > 0 ? salesData[salesData.length - 1] : null
      const firstSaleDate = firstSale ? new Date(firstSale.datetime) : null

      setUserStats({
        totalSales,
        recentSalesCount,
        totalRevenue,
        recentRevenue,
        averageOrderValue,
        firstSaleDate,
        salesData: salesData?.slice(0, 10) || [] // Last 10 sales for recent activity
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const fetchTransactionItems = async (saleId: number) => {
    try {
      setLoadingTransactionItems(true)
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (
            name,
            category,
            weight_unit,
            price_per_unit,
            is_weighted,
            image_url
          )
        `)
        .eq('sale_id', saleId)

      if (itemsError) {
        console.error('Error fetching transaction items:', itemsError)
        setTransactionItems([])
        return
      }

      const transformedItems = (itemsData || []).map(item => ({
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price_each,
        total_price: item.calculated_price || (item.quantity * item.price_each),
        product_name: item.products?.name || 'Unknown Product',
        product_category: item.products?.category || 'Unknown Category',
        product_image: item.products?.image_url || null,
        weight: item.weight || undefined,
        weight_unit: item.products?.weight_unit || undefined,
        price_per_unit: item.products?.price_per_unit || undefined,
        is_weighted: item.products?.is_weighted || false
      }))

      setTransactionItems(transformedItems)
    } catch (error) {
      console.error('Error fetching transaction items:', error)
      setTransactionItems([])
    } finally {
      setLoadingTransactionItems(false)
    }
  }

  const handleEditTransaction = () => {
    if (selectedTransaction) {
      // Close the modal and navigate to sales page with transaction loaded
      setShowTransactionDetailModal(false)
      setSelectedTransaction(null)
      setTransactionItems([])
      navigate(`/sales?transaction=${selectedTransaction.sale_id}`)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validate required fields
    if (!newUser.username.trim()) {
      setError('Username is required')
      setIsSubmitting(false)
      return
    }

    if (!newUser.password.trim()) {
      setError('Password is required')
      setIsSubmitting(false)
      return
    }

    // Validate PIN if provided
    if (newUser.pin && newUser.pin.trim()) {
      if (!/^\d{4,6}$/.test(newUser.pin)) {
        setError('PIN must be 4-6 digits')
        setIsSubmitting(false)
        return
      }
    }

    if (!businessId) {
      setError('Business ID is not available. Please refresh the page and try again.')
      setIsSubmitting(false)
      return
    }

    try {
      // Check if username already exists within this business
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', newUser.username.trim())
        .eq('business_id', businessId)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking username:', checkError)
        throw new Error('Failed to check if username exists')
      }

      if (existingUser) {
        throw new Error('Username already exists. Please choose a different username.')
      }

      const passwordHash = await hashPassword(newUser.password)

      // Prepare user data - only include icon if column exists
      const userData: any = {
        username: newUser.username.trim(),
        password_hash: passwordHash,
        role: newUser.role,
        active: true,
        business_id: businessId,
        branch_id: newUser.branch_id
      }

      // Hash and add PIN if provided
      if (newUser.pin && newUser.pin.trim()) {
        const pinHash = await hashPassword(newUser.pin)
        userData.pin_hash = pinHash
        userData.pin = newUser.pin // Keep legacy pin for backward compatibility
      }

      // Only add icon if the column exists (will be handled by database migration)
      // For now, we'll try to include it and let the database handle it
      userData.icon = newUser.icon

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()

      if (error) {
        console.error('Supabase error adding user:', error)
        
        // Handle specific error cases
        if (error.code === '23505') {
          throw new Error('Username already exists. Please choose a different username.')
        } else if (error.code === '23503') {
          throw new Error('Invalid business ID. Please refresh the page and try again.')
        } else if (error.code === '23502') {
          throw new Error('Required field is missing. Please fill in all required fields.')
        } else if (error.message.includes('duplicate key value violates unique constraint')) {
          throw new Error('Username already exists. Please choose a different username.')
        } else if (error.message.includes('violates foreign key constraint')) {
          throw new Error('Invalid business ID. Please refresh the page and try again.')
        } else if (error.message.includes("Could not find the 'icon' column")) {
          throw new Error('Database schema is outdated. Please run the database migration to add the icon column.')
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation')
      }

      // Reset form and close modal
      setNewUser({
        username: '',
        password: '',
        role: 'Cashier',
        icon: DEFAULT_ICON_NAME
      })
      setShowAddModal(false)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error adding user:', error)
      if (error instanceof Error) {
        setError(`Failed to add user: ${error.message}`)
      } else {
        setError('Failed to add user: Unknown error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting user:', error)
        throw error
      }

      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: !currentStatus })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating user status:', error)
        throw error
      }

      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditUser = (user: User) => {
    setEditingUser(user)
    setNewUser({
      username: user.username,
      password: '', // Don't pre-fill password
      role: user.role,
      icon: user.icon || DEFAULT_ICON_NAME,
      branch_id: user.branch_id,
      pin: '' // Don't pre-fill PIN for security
    })
    setShowEditModal(true)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSubmitting(true)
    setError('')

    try {
      const updateData: any = {
        username: newUser.username,
        role: newUser.role,
        icon: newUser.icon,
        branch_id: newUser.branch_id
      }

      // Only update password if provided
      if (newUser.password.trim()) {
        const newPasswordHash = await hashPassword(newUser.password)
        updateData.password_hash = newPasswordHash
      }

      // Only update PIN if provided
      if (newUser.pin && newUser.pin.trim()) {
        // Validate PIN format
        if (!/^\d{4,6}$/.test(newUser.pin)) {
          throw new Error('PIN must be 4-6 digits')
        }
        const newPinHash = await hashPassword(newUser.pin)
        updateData.pin_hash = newPinHash
        updateData.pin = newUser.pin // Keep legacy pin for backward compatibility
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', editingUser.user_id)

      if (error) {
        console.error('Error updating user:', error)
        throw error
      }

      // Reset form and close modal
      setNewUser({
        username: '',
        password: '',
        role: 'Cashier',
        icon: DEFAULT_ICON_NAME,
        branch_id: selectedBranchId || undefined,
        pin: ''
      })
      setEditingUser(null)
      setShowEditModal(false)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validate required fields
    if (!newBranch.branch_name.trim()) {
      setError('Branch name is required')
      setIsSubmitting(false)
      return
    }

    if (!newBranch.address.trim()) {
      setError('Address is required')
      setIsSubmitting(false)
      return
    }

    if (!businessId) {
      setError('Business ID is not available. Please refresh the page and try again.')
      setIsSubmitting(false)
      return
    }

    try {
      const branchData = {
        branch_name: newBranch.branch_name.trim(),
        address: newBranch.address.trim(),
        phone: newBranch.phone.trim() || null,
        manager_id: newBranch.manager_id || null,
        shop_image: newBranch.shop_image,
        business_id: businessId,
        active: true,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('branches')
        .insert([branchData])
        .select()

      if (error) {
        console.error('Supabase error adding branch:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation')
      }

      // Reset form and close modal
      setNewBranch({
        branch_name: '',
        address: '',
        phone: '',
        manager_id: undefined,
        shop_image: 'shop1'
      })
      setShowAddBranchModal(false)
      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error adding branch:', error)
      if (error instanceof Error) {
        setError(`Failed to add branch: ${error.message}`)
      } else {
        setError('Failed to add branch: Unknown error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBranch = async (branchId: number) => {
    if (!confirm('Are you sure you want to delete this branch?')) return

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('branch_id', branchId)

      if (error) {
        console.error('Error deleting branch:', error)
        throw error
      }

      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error deleting branch:', error)
      setError(`Failed to delete branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setNewBranch({
      branch_name: branch.branch_name,
      address: branch.address,
      phone: branch.phone,
      manager_id: branch.manager_id,
      shop_image: branch.shop_image
    })
    setShowEditBranchModal(true)
  }

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch) return

    setIsSubmitting(true)
    setError('')

    try {
      const updateData = {
        branch_name: newBranch.branch_name.trim(),
        address: newBranch.address.trim(),
        phone: newBranch.phone.trim() || null,
        manager_id: newBranch.manager_id || null,
        shop_image: newBranch.shop_image
      }

      const { error } = await supabase
        .from('branches')
        .update(updateData)
        .eq('branch_id', editingBranch.branch_id)

      if (error) {
        console.error('Error updating branch:', error)
        throw error
      }

      // Reset form and close modal
      setNewBranch({
        branch_name: '',
        address: '',
        phone: '',
        manager_id: undefined,
        shop_image: 'shop1'
      })
      setEditingBranch(null)
      setShowEditBranchModal(false)
      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error updating branch:', error)
      setError(`Failed to update branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }


  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#ef4444' // Red
      case 'Owner': return '#8b5cf6' // Purple
      case 'Manager': return '#f59e0b' // Orange
      case 'Cashier': return '#3b82f6' // Blue
      default: return '#6b7280' // Gray
    }
  }

  const getRoleBackgroundColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#fef2f2' // Light red background
      case 'Owner': return '#f3e8ff' // Light purple background
      case 'Manager': return '#fef3c7' // Light orange background
      case 'Cashier': return '#eff6ff' // Light blue background
      default: return '#f3f4f6' // Light gray background
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: 'var(--text-primary)'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '12px' }}></i>
        Loading users...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage system users and their permissions"
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BranchSelector size="sm" />
        </div>
        <button
          onClick={() => {
            resetNewUserForm()
            setShowAddModal(true)
          }}
          style={{
            background: '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="fa-solid fa-plus"></i>
          Add User
        </button>
        
        <button
          onClick={() => setShowAddBranchModal(true)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="fa-solid fa-building"></i>
          Add Branch
        </button>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
        </div>
      )}


      {/* Users Table */}
      <div style={{
        background: 'var(--bg-container)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid #d1d5db',
          background: 'var(--bg-nested)'
        }}>
          <h3 style={{ 
            margin: '0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            <i className="fa-solid fa-list" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
            All Users ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-primary)'
          }}>
            <img 
              src="/images/vectors/manage users.png" 
              alt="No users" 
              style={{ 
                width: '300px', 
                height: 'auto',
                opacity: 0.85
              }} 
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'var(--bg-nested)' }}>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '25%'
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '15%'
                  }}>
                    Icon
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '20%'
                  }}>
                    Role
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '20%'
                  }}>
                    Status
                  </th>
                   <th style={{ 
                     padding: '16px 24px', 
                     textAlign: 'left', 
                     fontWeight: '600',
                    color: 'var(--text-primary)',
                     borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '20%'
                   }}>
                     User ID
                  </th>
                </tr>
              </thead>
              <tbody>
                 {users.map((user, index) => (
                   <tr 
                     key={user.user_id} 
                     style={{ 
                       borderBottom: index < users.length - 1 ? '1px solid #f3f4f6' : 'none',
                       cursor: 'pointer',
                       transition: 'background-color 0.2s ease'
                     }}
                     onClick={async () => {
                       setSelectedUser(user)
                       setActiveTab('details')
                       setShowUserDetailsModal(true)
                       await fetchUserStats(user.user_id)
                     }}
                     onMouseEnter={(e) => {
                       e.currentTarget.style.backgroundColor = 'var(--bg-nested)'
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.backgroundColor = 'transparent'
                     }}
                   >
                     <td style={{ padding: '16px 24px' }}>
                       <div>
                         <div style={{ 
                           fontWeight: '700', 
                           color: 'var(--text-primary)',
                           marginBottom: '4px',
                           fontSize: '16px'
                         }}>
                           {user.username}
                         </div>
                         <div style={{ 
                           fontSize: '15px', 
                           color: 'var(--text-secondary)' 
                         }}>
                           ID: {user.user_id}
                         </div>
                       </div>
                     </td>
                     <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                       <div style={{
                         width: '48px',
                         height: '48px',
                         borderRadius: '50%',
                         background: 'var(--bg-nested)',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         margin: '0 auto',
                         overflow: 'hidden',
                         border: '2px solid #e5e7eb'
                       }}>
                         {user.icon ? (
                           <img 
                             src={`/images/icons/${user.icon}.png`} 
                             alt={user.icon}
                             style={{
                               width: '40px',
                               height: '40px',
                               objectFit: 'cover',
                               borderRadius: '50%'
                             }}
                           />
                         ) : (
                           <i className="fa-solid fa-user" style={{ 
                             fontSize: '20px', 
                             color: 'var(--text-secondary)' 
                           }}></i>
                         )}
                       </div>
                     </td>
                    <td style={{ padding: '16px 24px' }}>
                       <span style={{
                         background: getRoleBackgroundColor(user.role),
                         color: getRoleColor(user.role),
                         padding: '4px 12px',
                         borderRadius: '20px',
                         fontSize: '14px',
                         fontWeight: '700',
                         textTransform: 'capitalize'
                       }}>
                         {user.role}
                       </span>
                    </td>
                     <td style={{ padding: '16px 24px' }}>
                       <span style={{
                         background: user.active ? '#dcfce720' : '#fef2f220',
                         color: user.active ? '#16a34a' : '#dc2626',
                         padding: '4px 12px',
                         borderRadius: '20px',
                         fontSize: '14px',
                         fontWeight: '700'
                       }}>
                         {user.active ? 'Active' : 'Inactive'}
                       </span>
                     </td>
                     <td 
                       style={{ padding: '16px 24px', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                       onClick={(e) => e.stopPropagation()}
                     >
                       <span>User #{user.user_id}</span>
                       <ActionDropdown
                         actions={[
                           {
                             label: 'Edit',
                             icon: 'fa-solid fa-pen-to-square',
                             onClick: () => startEditUser(user)
                           },
                           {
                             label: user.active ? 'Deactivate' : 'Activate',
                             icon: `fa-solid fa-${user.active ? 'ban' : 'check'}`,
                             onClick: () => toggleUserStatus(user.user_id, user.active)
                           },
                           {
                             label: 'Delete',
                             icon: 'fa-solid fa-trash',
                             onClick: () => handleDeleteUser(user.user_id),
                             destructive: true
                           }
                         ]}
                         size="sm"
                       />
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branches Section */}
      <div style={{
        background: 'var(--bg-container)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        marginTop: '32px'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid #d1d5db',
          background: 'var(--bg-nested)'
        }}>
          <h3 style={{ 
            margin: '0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
            Branches ({branches.length})
          </h3>
        </div>

        {branches.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-primary)'
          }}>
            <i className="fa-solid fa-building" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p style={{ fontSize: '20px', margin: '0 0 8px 0' }}>No branches found</p>
            <p style={{ fontSize: '16px', margin: '0' }}>Add your first branch to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'var(--bg-nested)' }}>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '25%'
                  }}>
                    Branch Name
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '15%'
                  }}>
                    Shop Image
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '25%'
                  }}>
                    Address
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '15%'
                  }}>
                    Phone
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px',
                    width: '20%'
                  }}>
                    Manager
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch, index) => (
                  <tr 
                    key={branch.branch_id} 
                    style={{ 
                      borderBottom: index < branches.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedBranch(branch)
                      setBranchStatsTab('overview')
                      setShowBranchStatsModal(true)
                      fetchBranchStats(branch.branch_id)
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          color: 'var(--text-primary)',
                          marginBottom: '4px',
                          fontSize: '16px'
                        }}>
                          {branch.branch_name}
                        </div>
                        <div style={{ 
                          fontSize: '15px', 
                          color: 'var(--text-secondary)' 
                        }}>
                          ID: {branch.branch_id}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        overflow: 'hidden',
                        border: '2px solid #e5e7eb'
                      }}>
                        {branch.shop_image ? (
                          <div 
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundImage: `url(images/shop/${branch.shop_image}.png)`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              backgroundColor: 'white',
                              borderRadius: '10px'
                            }}
                          />
                        ) : (
                          <i className="fa-solid fa-building" style={{ 
                            fontSize: '24px', 
                            color: 'var(--text-primary)' 
                          }}></i>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontSize: '15px' }}>
                      {branch.address}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontSize: '15px' }}>
                      {branch.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', verticalAlign: 'top' }}>
                      <span style={{ paddingTop: '2px' }}>{getManagerName(branch.manager_id)}</span>
                      <ActionDropdown
                        actions={[
                          {
                            label: 'Edit',
                            icon: 'fa-solid fa-pen-to-square',
                            onClick: () => startEditBranch(branch)
                          },
                          {
                            label: 'Delete',
                            icon: 'fa-solid fa-trash',
                            onClick: () => handleDeleteBranch(branch.branch_id),
                            destructive: true
                          }
                        ]}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                margin: '0', 
                fontSize: '26px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <i className="fa-solid fa-user-plus" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
                Add New User
              </h2>
              <button
                onClick={() => {
                  resetNewUserForm()
                  setShowAddModal(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

             <form onSubmit={handleAddUser}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Username *
                 </label>
                 <input
                   type="text"
                   value={newUser.username}
                   onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter username"
                 />
               </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  PIN (Optional)
                </label>
                <input
                  type="text"
                  value={newUser.pin || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow numbers and limit to 6 digits
                    if (value === '' || /^\d{0,6}$/.test(value)) {
                      setNewUser({ ...newUser, pin: value })
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="4-6 digit PIN for quick login (optional)"
                  maxLength={6}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px',
                  marginBottom: 0
                }}>
                  <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                  PIN allows quick user switching without entering the full password
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Branch *
                </label>
                <select
                  value={newUser.branch_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '16px',
                  fontWeight: '600',
                  color: '#000000',
                  fontSize: '16px'
                }}>
                  Character Icon *
                </label>
                
                {/* Icon Pack Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '700',
                    color: '#000000',
                    fontSize: '14px'
                  }}>
                    Icon Pack
                  </label>
                  <select
                    value={selectedIconPack}
                    onChange={(e) => setSelectedIconPack(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      fontSize: '14px',
                      color: '#000000',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                    }}
                  >
                    {Object.entries(ICON_PACKS).map(([key, pack]) => (
                      <option key={key} value={key}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}>
                  {availableIcons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, icon: icon.name })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        border: newUser.icon === icon.name ? '3px solid #7d8d86' : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: newUser.icon === icon.name 
                          ? 'linear-gradient(135deg, #7d8d86 0%, #5a6b5f 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: newUser.icon === icon.name ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: newUser.icon === icon.name 
                          ? '0 8px 25px rgba(125, 141, 134, 0.3), 0 0 0 1px rgba(125, 141, 134, 0.1)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}>
                        <img 
                          src={`/images/icons/${icon.name}.png`} 
                          alt={icon.label}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: newUser.icon === icon.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                          }}
                        />
                      </div>
                      {newUser.icon === icon.name && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          zIndex: 10
                        }}>
                          <i className="fa-solid fa-check" style={{ 
                            fontSize: '10px', 
                            color: 'white' 
                          }}></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f3f4f6',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus"></i>
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
           </div>
         </div>
       )}

       {/* Edit User Modal */}
       {showEditModal && editingUser && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: 'rgba(0, 0, 0, 0.5)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '24px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-user-pen" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
                 Edit User
               </h2>
               <button
                 onClick={() => {
                   setShowEditModal(false)
                   setEditingUser(null)
                 }}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleEditUser}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Username *
                 </label>
                 <input
                   type="text"
                   value={newUser.username}
                   onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter username"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   New Password (leave blank to keep current)
                 </label>
                 <input
                   type="password"
                   value={newUser.password}
                   onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter new password (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   PIN (Optional)
                 </label>
                 <input
                   type="text"
                   value={newUser.pin || ''}
                   onChange={(e) => {
                     const value = e.target.value
                     // Only allow numbers and limit to 6 digits
                     if (value === '' || /^\d{0,6}$/.test(value)) {
                       setNewUser({ ...newUser, pin: value })
                     }
                   }}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="4-6 digit PIN for quick login (optional)"
                   maxLength={6}
                 />
                 <p style={{
                   fontSize: '12px',
                   color: '#6b7280',
                   marginTop: '4px',
                   marginBottom: 0
                 }}>
                   <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                   Leave blank to keep current PIN, or enter new PIN to update
                 </p>
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Role *
                 </label>
                 <select
                   value={newUser.role}
                   onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="Cashier">Cashier</option>
                   <option value="Manager">Manager</option>
                   <option value="Admin">Admin</option>
                 </select>
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch *
                 </label>
                 <select
                   value={newUser.branch_id || ''}
                   onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="">Select a branch</option>
                   {branches.map((branch) => (
                     <option key={branch.branch_id} value={branch.branch_id}>
                       {branch.branch_name}
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Character Icon *
                 </label>
                 
                 {/* Icon Pack Selector */}
                 <div style={{ marginBottom: '16px' }}>
                   <label style={{
                     display: 'block',
                     marginBottom: '8px',
                     fontWeight: '700',
                     color: '#000000',
                     fontSize: '14px'
                   }}>
                     Icon Pack
                   </label>
                   <select
                     value={selectedIconPack}
                     onChange={(e) => setSelectedIconPack(e.target.value)}
                     style={{
                       width: '100%',
                       padding: '12px 16px',
                       border: '2px solid #e5e7eb',
                       borderRadius: '8px',
                       backgroundColor: '#ffffff',
                       fontSize: '14px',
                       color: '#000000',
                       cursor: 'pointer',
                       outline: 'none',
                       transition: 'border-color 0.2s ease'
                     }}
                     onFocus={(e) => {
                       e.target.style.borderColor = '#7d8d86'
                     }}
                     onBlur={(e) => {
                       e.target.style.borderColor = '#e5e7eb'
                     }}
                   >
                   {Object.entries(ICON_PACKS).map(([key, pack]) => (
                       <option key={key} value={key}>
                         {pack.name}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(3, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableIcons.map((icon) => (
                     <button
                       key={icon.name}
                       type="button"
                       onClick={() => setNewUser({ ...newUser, icon: icon.name })}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newUser.icon === icon.name ? '3px solid #7d8d86' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newUser.icon === icon.name 
                           ? 'linear-gradient(135deg, #7d8d86 0%, #5a6b5f 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newUser.icon === icon.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newUser.icon === icon.name 
                           ? '0 8px 25px rgba(125, 141, 134, 0.3), 0 0 0 1px rgba(125, 141, 134, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '56px',
                         height: '56px',
                         borderRadius: '50%',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                       }}>
                         <img 
                           src={`/images/icons/${icon.name}.png`} 
                           alt={icon.label}
                           style={{
                             width: '100%',
                             height: '100%',
                             objectFit: 'cover',
                             filter: newUser.icon === icon.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       {newUser.icon === icon.name && (
                         <div style={{
                           position: 'absolute',
                           top: '4px',
                           right: '4px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowEditModal(false)
                     setEditingUser(null)
                   }}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : '#7d8d86',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Updating...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-floppy-disk"></i>
                       Update User
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Add Branch Modal */}
       {showAddBranchModal && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: 'rgba(0, 0, 0, 0.5)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '26px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                 Add New Branch
               </h2>
               <button
                 onClick={() => setShowAddBranchModal(false)}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleAddBranch}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch Name *
                 </label>
                 <input
                   type="text"
                   value={newBranch.branch_name}
                   onChange={(e) => setNewBranch({ ...newBranch, branch_name: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter branch name"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Address *
                 </label>
                 <textarea
                   value={newBranch.address}
                   onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                   required
                   rows={3}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     resize: 'vertical'
                   }}
                   placeholder="Enter branch address"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Phone Number
                 </label>
                 <input
                   type="tel"
                   value={newBranch.phone}
                   onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter phone number (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Manager (Optional)
                 </label>
                 <select
                   value={newBranch.manager_id || ''}
                   onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff',
                     appearance: 'none',
                     backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                     backgroundRepeat: 'no-repeat',
                     backgroundPosition: 'right 12px center',
                     backgroundSize: '16px',
                     paddingRight: '40px'
                   }}
                 >
                   <option value="">👤 Select a manager (optional)</option>
                   {users.filter(user => user.role === 'manager' || user.role === 'admin').map(user => (
                     <option key={user.user_id} value={user.user_id}>
                       👤 {user.username} ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Shop Image *
                 </label>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(2, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableShopImages.map((shop) => (
                     <button
                       key={shop.name}
                       type="button"
                       onClick={() => setNewBranch({ ...newBranch, shop_image: shop.name })}
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newBranch.shop_image === shop.name ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newBranch.shop_image === shop.name 
                           ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newBranch.shop_image === shop.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newBranch.shop_image === shop.name 
                           ? '0 8px 25px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '80px',
                         height: '80px',
                         borderRadius: '12px',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                         marginBottom: '8px'
                       }}>
                         <div 
                           style={{
                             width: '100%',
                             height: '100%',
                             backgroundImage: `url(images/shop/${shop.name}.png)`,
                             backgroundSize: 'contain',
                             backgroundRepeat: 'no-repeat',
                             backgroundPosition: 'center',
                             backgroundColor: 'white',
                             filter: newBranch.shop_image === shop.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       <span style={{
                         fontSize: '14px',
                         fontWeight: '700',
                         color: newBranch.shop_image === shop.name ? 'white' : '#000000'
                       }}>
                         {shop.label}
                       </span>
                       {newBranch.shop_image === shop.name && (
                         <div style={{
                           position: 'absolute',
                           top: '8px',
                           right: '8px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => setShowAddBranchModal(false)}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Adding...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-building"></i>
                       Add Branch
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Edit Branch Modal */}
       {showEditBranchModal && editingBranch && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: 'rgba(0, 0, 0, 0.5)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '24px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                 Edit Branch
               </h2>
               <button
                 onClick={() => {
                   setShowEditBranchModal(false)
                   setEditingBranch(null)
                 }}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleEditBranch}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch Name *
                 </label>
                 <input
                   type="text"
                   value={newBranch.branch_name}
                   onChange={(e) => setNewBranch({ ...newBranch, branch_name: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter branch name"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Address *
                 </label>
                 <textarea
                   value={newBranch.address}
                   onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                   required
                   rows={3}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     resize: 'vertical'
                   }}
                   placeholder="Enter branch address"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Phone Number
                 </label>
                 <input
                   type="tel"
                   value={newBranch.phone}
                   onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter phone number (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Manager (Optional)
                 </label>
                 <select
                   value={newBranch.manager_id || ''}
                   onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff',
                     appearance: 'none',
                     backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                     backgroundRepeat: 'no-repeat',
                     backgroundPosition: 'right 12px center',
                     backgroundSize: '16px',
                     paddingRight: '40px'
                   }}
                 >
                   <option value="">👤 Select a manager (optional)</option>
                   {users.filter(user => user.role === 'manager' || user.role === 'admin').map(user => (
                     <option key={user.user_id} value={user.user_id}>
                       👤 {user.username} ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Shop Image *
                 </label>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(2, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableShopImages.map((shop) => (
                     <button
                       key={shop.name}
                       type="button"
                       onClick={() => setNewBranch({ ...newBranch, shop_image: shop.name })}
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newBranch.shop_image === shop.name ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newBranch.shop_image === shop.name 
                           ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newBranch.shop_image === shop.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newBranch.shop_image === shop.name 
                           ? '0 8px 25px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '80px',
                         height: '80px',
                         borderRadius: '12px',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                         marginBottom: '8px'
                       }}>
                         <div 
                           style={{
                             width: '100%',
                             height: '100%',
                             backgroundImage: `url(images/shop/${shop.name}.png)`,
                             backgroundSize: 'contain',
                             backgroundRepeat: 'no-repeat',
                             backgroundPosition: 'center',
                             backgroundColor: 'white',
                             filter: newBranch.shop_image === shop.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       <span style={{
                         fontSize: '14px',
                         fontWeight: '700',
                         color: newBranch.shop_image === shop.name ? 'white' : '#000000'
                       }}>
                         {shop.label}
                       </span>
                       {newBranch.shop_image === shop.name && (
                         <div style={{
                           position: 'absolute',
                           top: '8px',
                           right: '8px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowEditBranchModal(false)
                     setEditingBranch(null)
                   }}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : '#3b82f6',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Updating...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-floppy-disk"></i>
                       Update Branch
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* FontAwesome Icon - Bottom Right */}
       <div 
         onClick={() => setShowVaultModal(true)}
         title="Access Secure Vault - Manage sensitive operations and settings"
         style={{
           position: 'fixed',
           bottom: '24px',
           right: '24px',
           zIndex: 50,
           width: '120px',
           height: '120px',
           borderRadius: '50%',
           background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           cursor: 'pointer',
           transition: 'all 0.2s ease'
         }}
       >
         <i className="fa-solid fa-vault" style={{ 
           fontSize: '48px', 
           color: '#f1f0e4' 
         }}></i>
       </div>

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-container)',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-elevated)',
            border: 'var(--border-primary)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                margin: '0', 
                fontSize: '24px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <i className="fa-solid fa-user" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                User Details
              </h2>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false)
                  setSelectedUser(null)
                  setUserStats(null)
                  // Reopen branch stats modal if we have a selected branch
                  if (selectedBranch) {
                    setShowBranchStatsModal(true)
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #e5e7eb',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => setActiveTab('details')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: activeTab === 'details' ? '#3b82f6' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'details' ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-solid fa-info-circle" style={{ marginRight: '8px' }}></i>
                Details
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: activeTab === 'stats' ? '#3b82f6' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'stats' ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fa-solid fa-chart-bar" style={{ marginRight: '8px' }}></i>
                Stats
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--bg-nested)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '3px solid #e5e7eb'
                  }}>
                    {selectedUser.icon ? (
                      <img 
                        src={`/images/icons/${selectedUser.icon}.png`} 
                        alt={selectedUser.username}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-user" style={{ fontSize: '32px', color: 'var(--text-secondary)' }}></i>
                    )}
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '24px', 
                      fontWeight: '700',
                      color: 'var(--text-primary)'
                    }}>
                      {selectedUser.username}
                    </h3>
                    <span style={{
                      background: getRoleBackgroundColor(selectedUser.role),
                      color: getRoleColor(selectedUser.role),
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textTransform: 'capitalize'
                    }}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div style={{ 
                  background: 'var(--bg-card)', 
                  borderRadius: '8px', 
                  padding: '20px',
                  border: 'var(--border-subtle)'
                }}>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    User Information
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>User ID:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>#{selectedUser.user_id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Status:</span>
                      <span style={{
                        background: selectedUser.active ? '#dcfce720' : '#fef2f220',
                        color: selectedUser.active ? '#16a34a' : '#dc2626',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        {selectedUser.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Business ID:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>#{selectedUser.business_id}</span>
                    </div>
                    {selectedUser.branch_id && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Branch ID:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>#{selectedUser.branch_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'stats' && (
              <div>
                {userStats ? (
                  <>
                    {/* Stats Overview */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                      gap: '16px', 
                      marginBottom: '24px' 
                    }}>
                      <div style={{ 
                        background: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {userStats.totalSales}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          Total Sales
                        </div>
                      </div>
                      <div style={{ 
                        background: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {userStats.recentSalesCount}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          Last 30 Days
                        </div>
                      </div>
                      <div style={{ 
                        background: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          ${userStats.totalRevenue.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          Total Revenue
                        </div>
                      </div>
                      <div style={{ 
                        background: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          ${userStats.averageOrderValue.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          Avg Order Value
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div style={{ 
                      background: 'var(--bg-card)', 
                      borderRadius: '8px', 
                      padding: '20px',
                      border: 'var(--border-subtle)'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        Recent Activity
                      </h4>
                      {userStats.salesData.length > 0 ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {userStats.salesData.map((sale: any, index: number) => (
                            <div key={index} 
                              onClick={() => {
                                setSelectedTransaction(sale)
                                setShowTransactionDetailModal(true)
                                fetchTransactionItems(sale.sale_id)
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                background: 'var(--bg-nested)',
                                borderRadius: '6px',
                                border: 'var(--border-subtle)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover)'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--bg-nested)'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                  Sale #{sale.sale_id}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {new Date(sale.datetime).toLocaleDateString()} at {new Date(sale.datetime).toLocaleTimeString()}
                                </div>
                              </div>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ${sale.total_amount?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '40px 20px',
                          color: 'var(--text-secondary)'
                        }}>
                          <i className="fa-solid fa-chart-line" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                          <div>No sales data available</div>
                        </div>
                      )}
                    </div>

                    {/* User Timeline */}
                    {userStats.firstSaleDate && (
                      <div style={{ 
                        background: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        marginTop: '16px'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          User Timeline
                        </h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>First Sale:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                              {userStats.firstSaleDate.toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Days Active:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                              {Math.ceil((Date.now() - userStats.firstSaleDate.getTime()) / (1000 * 60 * 60 * 24))} days
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                    <div>Loading stats...</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false)
                  setSelectedUser(null)
                }}
                style={{
                  background: 'var(--bg-nested)',
                  color: 'var(--text-primary)',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-nested)'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false)
                  startEditUser(selectedUser)
                }}
                style={{
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333333'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a1a1a'
                }}
              >
                <i className="fa-solid fa-pen-to-square" style={{ marginRight: '8px' }}></i>
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTransactionDetailModal && selectedTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'var(--bg-container)',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-elevated)',
            border: 'var(--border-primary)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                margin: '0', 
                fontSize: '24px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <i className="fa-solid fa-receipt" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                Transaction Details
              </h2>
              <button
                onClick={() => {
                  setShowTransactionDetailModal(false)
                  setSelectedTransaction(null)
                  setTransactionItems([])
                  // Reopen branch stats modal if we have a selected branch
                  if (selectedBranch) {
                    setShowBranchStatsModal(true)
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Transaction Information */}
            <div style={{ 
              background: 'var(--bg-card)', 
              borderRadius: '8px', 
              padding: '20px',
              border: 'var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Transaction Information
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Transaction ID:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>#{selectedTransaction.sale_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Date & Time:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {new Date(selectedTransaction.datetime).toLocaleDateString()} at {new Date(selectedTransaction.datetime).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Payment Method:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                    {selectedTransaction.payment_method}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Amount:</span>
                  <span style={{ color: '#10b981', fontWeight: '700', fontSize: '18px' }}>
                    ${selectedTransaction.total_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {selectedTransaction.discount_applied > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Discount Applied:</span>
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                      -${selectedTransaction.discount_applied.toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedTransaction.customer_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Customer ID:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>#{selectedTransaction.customer_id}</span>
                  </div>
                )}
                {selectedTransaction.notes && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Notes:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{selectedTransaction.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Items */}
            <div style={{ 
              background: 'var(--bg-card)', 
              borderRadius: '8px', 
              padding: '20px',
              border: 'var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-shopping-cart"></i>
                Items Purchased
              </h3>

              {/* Edit in Sales Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                  onClick={handleEditTransaction}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className="fa-solid fa-edit" style={{ marginRight: '6px' }}></i>
                  Edit
                </button>
              </div>

              {loadingTransactionItems ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: 'var(--text-secondary)'
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
                  <div>Loading items...</div>
                </div>
              ) : transactionItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {transactionItems.map((item, index) => (
                    <div key={index} style={{
                      background: 'var(--bg-nested)',
                      borderRadius: '8px',
                      padding: '16px',
                      border: 'var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Product Image */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: item.product_image 
                            ? `url(${item.product_image})` 
                            : item.is_weighted ? '#f59e0b' : '#7d8d86',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          {!item.product_image && (item.product_name?.charAt(0)?.toUpperCase() || '•')}
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Qty: {item.quantity}
                            {item.is_weighted && item.weight && ` · ${item.weight}${item.weight_unit || ''}`}
                            {' '}
                            × ${item.unit_price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '700', 
                        color: 'var(--text-primary)',
                        textAlign: 'right'
                      }}>
                        ${item.total_price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: 'var(--text-secondary)'
                }}>
                  <i className="fa-solid fa-shopping-cart" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                  <div>No items found for this transaction</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={handleEditTransaction}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6'
                }}
              >
                <i className="fa-solid fa-edit" style={{ marginRight: '8px' }}></i>
                Edit
              </button>
              <button
                onClick={() => {
                  setShowTransactionDetailModal(false)
                  setSelectedTransaction(null)
                  setTransactionItems([])
                  // Reopen branch stats modal if we have a selected branch
                  if (selectedBranch) {
                    setShowBranchStatsModal(true)
                  }
                }}
                style={{
                  background: '#f3f4f6',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Stats Modal */}
      {showBranchStatsModal && selectedBranch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-container)',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-elevated)',
            border: 'var(--border-primary)'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '8px 8px 0 0',
              padding: '20px 24px',
              borderBottom: 'var(--border-subtle)',
              margin: '-32px -32px 24px -32px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ 
                  margin: '0', 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                  Branch Statistics
                </h2>
                <button
                  onClick={() => {
                    setShowBranchStatsModal(false)
                    setSelectedBranch(null)
                    setBranchStats(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #e5e7eb',
              marginBottom: '24px',
              overflowX: 'auto'
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: 'fa-solid fa-chart-pie' },
                { id: 'sales', label: 'Sales', icon: 'fa-solid fa-receipt' },
                { id: 'products', label: 'Products', icon: 'fa-solid fa-box' },
                { id: 'customers', label: 'Customers', icon: 'fa-solid fa-user-friends' },
                { id: 'users', label: 'Users', icon: 'fa-solid fa-users' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBranchStatsTab(tab.id as any)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: branchStatsTab === tab.id ? '#3b82f6' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    borderBottom: branchStatsTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className={tab.icon}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Branch Info Header */}
            <div style={{ 
              background: 'var(--bg-card)', 
              borderRadius: '8px', 
              padding: '20px',
              border: 'var(--border-subtle)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  background: 'var(--bg-nested)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '3px solid #e5e7eb'
                }}>
                  {selectedBranch.shop_image ? (
                    <div 
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(images/shop/${selectedBranch.shop_image}.png)`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundColor: 'white',
                        borderRadius: '8px'
                      }}
                    />
                  ) : (
                    <i className="fa-solid fa-building" style={{ fontSize: '32px', color: 'var(--text-secondary)' }}></i>
                  )}
                </div>
                <div>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700',
                    color: 'var(--text-primary)'
                  }}>
                    {selectedBranch.branch_name}
                  </h3>
                  <p style={{ 
                    margin: '0 0 4px 0', 
                    color: 'var(--text-secondary)',
                    fontSize: '16px'
                  }}>
                    <i className="fa-solid fa-map-marker-alt" style={{ marginRight: '8px', color: '#6b7280' }}></i>
                    {selectedBranch.address}
                  </p>
                  <p style={{ 
                    margin: '0', 
                    color: 'var(--text-secondary)',
                    fontSize: '16px'
                  }}>
                    <i className="fa-solid fa-phone" style={{ marginRight: '8px', color: '#6b7280' }}></i>
                    {selectedBranch.phone || 'No phone number'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {branchStats && (
              <>
                {branchStatsTab === 'overview' && (
                  <>
                    {/* Statistics Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '20px',
                      marginBottom: '32px'
                    }}>
                  {/* Total Sales */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                      {branchStats.totalSales}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Sales
                    </div>
                  </div>

                  {/* Total Revenue */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a', marginBottom: '8px' }}>
                      €{branchStats.totalRevenue.toFixed(2)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Revenue
                    </div>
                  </div>

                  {/* Total Users */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
                      {branchStats.totalUsers}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Users
                    </div>
                  </div>

                  {/* Total Products */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
                      {branchStats.totalProducts}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Products
                    </div>
                  </div>

                  {/* Total Customers */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
                      {branchStats.totalCustomers}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Customers
                    </div>
                  </div>

                  {/* Net Revenue */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
                      €{branchStats.netRevenue?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Net Revenue
                    </div>
                  </div>

                  {/* Total Refunds */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
                      {branchStats.totalRefunds}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Total Refunds
                    </div>
                  </div>

                  {/* Recent Sales (30 days) */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#ea580c', marginBottom: '8px' }}>
                      {branchStats.recentSales}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Sales (30 days)
                    </div>
                  </div>

                  {/* Average Daily Sales */}
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    padding: '20px',
                    border: 'var(--border-subtle)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#0891b2', marginBottom: '8px' }}>
                      {branchStats.avgDailySales}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
                      Avg Daily Sales
                    </div>
                  </div>
                </div>

                    {/* Top Products */}
                    {branchStats.topProducts && branchStats.topProducts.length > 0 && (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        padding: '20px',
                        border: 'var(--border-subtle)',
                        marginBottom: '24px'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          <i className="fa-solid fa-trophy" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
                          Top Selling Products
                        </h4>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {branchStats.topProducts.map((product: any, index: number) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--bg-nested)',
                              borderRadius: '8px'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '2px solid #e5e7eb',
                                flexShrink: 0
                              }}>
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <i className="fa-solid fa-box" style={{ fontSize: '16px', color: '#9ca3af' }}></i>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                                  #{index + 1} {product.name}
                                </div>
                                {product.category && (
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    {product.category}
                                  </div>
                                )}
                              </div>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>
                                {product.quantity} sold
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {branchStatsTab === 'sales' && (
                  <div>
                    {/* Recent Sales */}
                    {branchStats.salesData && branchStats.salesData.length > 0 && (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        padding: '20px',
                        border: 'var(--border-subtle)'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          <i className="fa-solid fa-clock" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                          Recent Sales
                        </h4>
                        <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                          {branchStats.salesData.map((sale: any, index: number) => (
                            <div 
                              key={index} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '12px',
                                background: 'var(--bg-nested)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onClick={() => {
                                setSelectedTransaction(sale)
                                setShowBranchStatsModal(false) // Hide branch modal
                                setShowTransactionDetailModal(true)
                                fetchTransactionItems(sale.sale_id)
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-nested)'
                              }}
                            >
                              <div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                  Sale #{sale.sale_id}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                  {new Date(sale.datetime).toLocaleString()}
                                </div>
                                {sale.users && (
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    Cashier: {sale.users.username} ({sale.users.role})
                                  </div>
                                )}
                                {sale.customers && (
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    Customer: {sale.customers.name}
                                  </div>
                                )}
                              </div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px' }}>
                                €{sale.total_amount?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {branchStatsTab === 'products' && (
                  <div>
                    {/* Products List */}
                    {branchStats.branchProducts && branchStats.branchProducts.length > 0 && (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        padding: '20px',
                        border: 'var(--border-subtle)'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          <i className="fa-solid fa-box" style={{ marginRight: '8px', color: '#7c3aed' }}></i>
                          Branch Products
                        </h4>
                        <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                          {branchStats.branchProducts.map((product: any, index: number) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              background: 'var(--bg-nested)',
                              borderRadius: '8px'
                            }}>
                              <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '2px solid #e5e7eb'
                              }}>
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <i className="fa-solid fa-box" style={{ fontSize: '24px', color: '#9ca3af' }}></i>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                                  {product.name}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '2px' }}>
                                  Category: {product.category || 'Uncategorized'}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                  Stock: {product.stock_quantity || 0} | Price: €{product.price?.toFixed(2) || '0.00'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px' }}>
                                  €{product.total_revenue?.toFixed(2) || '0.00'}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                  {product.sales_count || 0} sales
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {branchStatsTab === 'customers' && (
                  <div>
                    {/* Customers List */}
                    {branchStats.branchCustomers && branchStats.branchCustomers.length > 0 && (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        padding: '20px',
                        border: 'var(--border-subtle)'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          <i className="fa-solid fa-user-friends" style={{ marginRight: '8px', color: '#059669' }}></i>
                          Branch Customers
                        </h4>
                        <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                          {branchStats.branchCustomers.map((customer: any, index: number) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '16px',
                              background: 'var(--bg-nested)',
                              borderRadius: '8px'
                            }}>
                              <div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                                  {customer.name}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                  {customer.phone_number}
                                </div>
                                {customer.email && (
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#f59e0b', fontWeight: '600', fontSize: '16px' }}>
                                  {customer.loyalty_points || 0} points
                                </div>
                                <div style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                                  €{customer.credit_balance || 0} credit
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {branchStatsTab === 'users' && (
                  <div>
                    {/* Branch Users */}
                    {branchStats.branchUsers && branchStats.branchUsers.length > 0 && (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        padding: '20px',
                        border: 'var(--border-subtle)'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>
                          <i className="fa-solid fa-users" style={{ marginRight: '8px', color: '#dc2626' }}></i>
                          Branch Users
                        </h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {branchStats.branchUsers.map((user: any, index: number) => (
                            <div 
                              key={index} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '16px',
                                background: 'var(--bg-nested)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onClick={() => {
                                setSelectedUser(user)
                                setShowBranchStatsModal(false) // Hide branch modal
                                setShowUserDetailsModal(true)
                                fetchUserStats(user.user_id)
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--hover-bg)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-nested)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {user.icon ? (
                                  <img 
                                    src={`/images/icons/${user.icon}.png`} 
                                    alt={user.username}
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      borderRadius: '50%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-nested)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <i className="fa-solid fa-user" style={{ fontSize: '24px', color: 'var(--text-secondary)' }}></i>
                                  </div>
                                )}
                                <div>
                                  <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                                    {user.username}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    {user.role} | User ID: #{user.user_id}
                                  </div>
                                  {user.full_name && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                      {user.full_name}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span style={{
                                background: user.active ? '#dcfce720' : '#fef2f220',
                                color: user.active ? '#16a34a' : '#dc2626',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: '700'
                              }}>
                                {user.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </>
            )}

            {loading && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '40px'
              }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#3b82f6' }}></i>
                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Loading statistics...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vault Modal */}
      <VaultModal 
        isOpen={showVaultModal} 
        onClose={() => setShowVaultModal(false)} 
      />
    </div>
  )
}
 
 export default Admin
