import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useBranch } from '../contexts/BranchContext'
import SearchContainer from '../components/SearchContainer'
import PageHeader from '../components/PageHeader'
import styles from './SideBusinesses.module.css'

async function uploadSideBusinessImage(file: File, businessId: string, userId: number) {
  console.log("🔄 Starting image upload for side business:", businessId)
  console.log("📁 File details:", {
    name: file.name,
    size: file.size,
    type: file.type
  })
  console.log("👤 User ID:", userId)
  
  try {
    // User authentication is handled by the calling component
    if (!userId) {
      console.error("❌ No user ID provided")
      return null
    }
    console.log("✅ User ID provided:", userId)
    
    // Check available buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) {
      console.error("❌ Error listing buckets:", bucketsError)
    } else {
      console.log("📦 Available buckets:", buckets?.map(b => b.name))
    }
    
    // Upload original file directly to Supabase Storage
    const fileName = `sidebusiness-images/${businessId}.${file.name.split('.').pop()}`
    console.log("📤 Uploading to Supabase Storage:", fileName)

    const { error: uploadError } = await supabase.storage
      .from('products') // Using 'products' bucket
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)

    console.log("✅ Image uploaded successfully:", publicUrl)

    // Update database with public URL
    console.log("💾 Updating database with public URL...")
    const { error: dbError } = await supabase
      .from('side_businesses')
      .update({ image_url: publicUrl })
      .eq('business_id', businessId)

    if (dbError) {
      console.error("❌ DB update failed:", dbError)
      return null
    } else {
      console.log("✅ Database updated with public URL")
    }

    return publicUrl
  } catch (error) {
    console.error("💥 Unexpected error during upload:", error)
    return null
  }
}

interface SideBusiness {
  business_id: number
  owner_id: number
  name: string
  description: string | null
  business_type: string | null
  icon: string | null
  image_url: string | null
  created_at: string
}

interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price: number | null
  stock_qty: number | null
  notes: string | null
  created_at: string
  side_businesses?: {
    name: string
  }
}

interface SideBusinessSale {
  sale_id: number
  item_id: number
  quantity: number
  total_amount: number
  payment_method: string
  date_time: string
  side_business_items?: {
    name: string
    side_businesses?: {
      name: string
    }
  }
}

const SideBusinesses = () => {
  const { user } = useAuth()
  const { selectedBranchId } = useBranch()
  const [businesses, setBusinesses] = useState<SideBusiness[]>([])
  const [items, setItems] = useState<SideBusinessItem[]>([])
  const [sales, setSales] = useState<SideBusinessSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('all')
  const [selectedBusinessTypeFilter, setSelectedBusinessTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'price'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Modal states
  const [showAddBusiness, setShowAddBusiness] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  
  // Image upload states
  const [uploadingImages, setUploadingImages] = useState<Set<number>>(new Set())
  
  // Handle image upload for side business
  const handleImageUpload = async (businessId: number, file: File) => {
    if (!user?.user_id) {
      setError('User not authenticated. Please log in again.')
      return
    }
    
    setUploadingImages(prev => new Set(prev).add(businessId))
    
    try {
      const imageUrl = await uploadSideBusinessImage(file, businessId.toString(), user.user_id)
      
      if (imageUrl) {
        // Update the business in the state
        setBusinesses(prev => prev.map(business => 
          business.business_id === businessId 
            ? { ...business, image_url: imageUrl }
            : business
        ))
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(businessId)
        return newSet
      })
    }
  }
  const [showAddSale, setShowAddSale] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<SideBusiness | null>(null)
  const [showBusinessDetail, setShowBusinessDetail] = useState(false)
  const [businessToDelete, setBusinessToDelete] = useState<SideBusiness | null>(null)
  const [saleToDelete, setSaleToDelete] = useState<any>(null)
  const [businessAnalytics, setBusinessAnalytics] = useState<{
    currentStock: number
    dailySales: { count: number; revenue: number }
    weeklySales: { count: number; revenue: number }
    monthlySales: { count: number; revenue: number }
  } | null>(null)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockItem, setRestockItem] = useState<{
    item_id: number | null
    current_stock: number
    restock_quantity: string
  }>({
    item_id: null,
    current_stock: 0,
    restock_quantity: ''
  })
  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<SideBusinessItem | null>(null)

  // Form states
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    description: '',
    business_type: 'service',
    icon: 'fa-solid fa-briefcase'
  })
  const [newBusinessImage, setNewBusinessImage] = useState<File | null>(null)
  const [uploadingNewBusinessImage, setUploadingNewBusinessImage] = useState(false)

  const [newItem, setNewItem] = useState({
    business_id: '',
    name: '',
    price: '',
    stock_qty: '',
    notes: ''
  })

  const [newSale, setNewSale] = useState({
    item_id: '',
    quantity: 1,
    total_amount: '',
    payment_method: 'cash'
  })

  // Auto-calculate total amount when item or quantity changes
  useEffect(() => {
    if (newSale.item_id && newSale.quantity > 0) {
      const selectedItem = items.find(item => item.item_id.toString() === newSale.item_id)
      if (selectedItem && selectedItem.price && selectedItem.price > 0) {
        // Only auto-calculate for items with fixed prices (not services)
        const business = businesses.find(b => b.name === selectedItem.side_businesses?.name)
        if (business && business.business_type !== 'service') {
          const totalAmount = (selectedItem.price * newSale.quantity).toFixed(2)
          setNewSale(prev => ({ ...prev, total_amount: totalAmount }))
        }
      }
    }
  }, [newSale.item_id, newSale.quantity, items, businesses])

  useEffect(() => {
    fetchData()
  }, [selectedBranchId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user?.business_id) {
        setBusinesses([])
        setItems([])
        setSales([])
        setLoading(false)
        return
      }

      // Fetch side businesses for current business
      let businessesQuery = supabase
        .from('side_businesses')
        .select('*')
        .eq('parent_shop_id', user.business_id)

      if (selectedBranchId) {
        businessesQuery = businessesQuery.eq('branch_id', selectedBranchId)
      }

      const { data: businessesData, error: businessesError } = await businessesQuery
        .order('created_at', { ascending: false })

      if (businessesError) throw businessesError

      // Fetch items with business names for current business
      let itemsQuery = supabase
        .from('side_business_items')
        .select(`
          *,
          side_businesses (name)
        `)
        .eq('parent_shop_id', user.business_id)

      if (selectedBranchId) {
        itemsQuery = itemsQuery.eq('branch_id', selectedBranchId)
      }

      const { data: itemsData, error: itemsError } = await itemsQuery
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Fetch recent sales with item and business names for current business
      let salesQuery = supabase
        .from('side_business_sales')
        .select(`
          *,
          side_business_items (
            name,
            side_businesses (name)
          )
        `)
        .eq('parent_shop_id', user.business_id)

      if (selectedBranchId) {
        salesQuery = salesQuery.eq('branch_id', selectedBranchId)
      }

      const { data: salesData, error: salesError } = await salesQuery
        .order('date_time', { ascending: false })
        .limit(10)

      if (salesError) throw salesError

      setBusinesses(businessesData || [])
      setItems(itemsData || [])
      setSales(salesData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newBusiness.name.trim()) {
      setError('Business name is required')
      return
    }
    
    if (!newBusiness.business_type) {
      setError('Business type is required')
      return
    }
    
    if (!user?.user_id) {
      setError('User not authenticated')
      return
    }

    try {
      setError(null) // Clear any previous errors
      
      const { data, error } = await supabase
        .from('side_businesses')
        .insert({
          owner_id: user.user_id,
          name: newBusiness.name.trim(),
          description: newBusiness.description.trim() || null,
          business_type: newBusiness.business_type,
          parent_shop_id: user.business_id,
          branch_id: selectedBranchId
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert')
      }

      const newBusinessId = data[0].business_id

      // Upload image if provided
      if (newBusinessImage) {
        setUploadingNewBusinessImage(true)
        try {
          await uploadSideBusinessImage(newBusinessImage, newBusinessId.toString(), user.user_id)
        } catch (imageError) {
          console.error('Error uploading image:', imageError)
          // Don't fail the entire operation if image upload fails
        } finally {
          setUploadingNewBusinessImage(false)
        }
      }

      // Reset form and close modal
      setNewBusiness({ name: '', description: '', business_type: 'service', icon: 'fa-solid fa-briefcase' })
      setNewBusinessImage(null)
      setShowAddBusiness(false)
      
      // Refresh data
      await fetchData()
      
    } catch (err) {
      console.error('Error adding business:', err)
      setError(err instanceof Error ? err.message : 'Failed to add business')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('side_business_items')
        .insert({
          business_id: parseInt(newItem.business_id),
          name: newItem.name,
          price: newItem.price ? parseFloat(newItem.price) : null,
          stock_quantity: newItem.stock_qty ? parseInt(newItem.stock_qty) : null,
          notes: newItem.notes.trim() || null,
          parent_shop_id: user?.business_id,
          branch_id: selectedBranchId
        })

      if (error) throw error

      setNewItem({ business_id: '', name: '', price: '', stock_qty: '', notes: '' })
      setShowAddItem(false)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Find the selected item to get its business_id and price
      const selectedItem = items.find(item => item.item_id.toString() === newSale.item_id)
      if (!selectedItem) {
        throw new Error('Selected item not found')
      }

      const totalAmount = parseFloat(newSale.total_amount)
      const quantity = newSale.quantity
      const priceEach = quantity > 0 ? totalAmount / quantity : 0

      const { error } = await supabase
        .from('side_business_sales')
        .insert({
          item_id: parseInt(newSale.item_id),
          quantity: quantity,
          price_each: priceEach,
          total_amount: totalAmount,
          payment_method: newSale.payment_method,
          business_id: selectedItem.business_id,
          parent_shop_id: user?.business_id,
          branch_id: selectedBranchId
        })

      if (error) throw error

      setNewSale({ item_id: '', quantity: 1, total_amount: '', payment_method: 'cash' })
      setShowAddSale(false)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sale')
    }
  }

  const handleDeleteSale = async (saleId: number) => {
    try {
      console.log("🗑️ Starting delete for sale:", saleId)
      
      const { error } = await supabase
        .from('side_business_sales')
        .delete()
        .eq('sale_id', saleId)

      if (error) {
        console.error("❌ Error deleting sale:", error)
        throw error
      }
      
      console.log("✅ Sale deleted successfully")
      setSaleToDelete(null)
      fetchData()
    } catch (err) {
      console.error("💥 Delete sale failed:", err)
      setError(err instanceof Error ? err.message : 'Failed to delete sale')
    }
  }

  const handleDeleteBusiness = async (businessId: number) => {
    try {
      console.log("🗑️ Starting delete for business:", businessId)
      
      // First delete all sales for items in this business
      const { data: items, error: itemsError } = await supabase
        .from('side_business_items')
        .select('item_id')
        .eq('business_id', businessId)

      if (itemsError) {
        console.error("❌ Error fetching items:", itemsError)
        throw itemsError
      }

      console.log("📦 Found items to delete:", items?.length || 0)

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.item_id)
        console.log("🛒 Deleting sales for items:", itemIds)
        
        const { error: salesError } = await supabase
          .from('side_business_sales')
          .delete()
          .in('item_id', itemIds)

        if (salesError) {
          console.error("❌ Error deleting sales:", salesError)
          throw salesError
        }
        console.log("✅ Sales deleted successfully")
      }

      // Delete all items in this business
      console.log("📦 Deleting items for business:", businessId)
      const { error: itemsDeleteError } = await supabase
        .from('side_business_items')
        .delete()
        .eq('business_id', businessId)

      if (itemsDeleteError) {
        console.error("❌ Error deleting items:", itemsDeleteError)
        throw itemsDeleteError
      }
      console.log("✅ Items deleted successfully")

      // Finally delete the business
      console.log("🏢 Deleting business:", businessId)
      const { error } = await supabase
        .from('side_businesses')
        .delete()
        .eq('business_id', businessId)

      if (error) {
        console.error("❌ Error deleting business:", error)
        throw error
      }
      console.log("✅ Business deleted successfully")

      setBusinessToDelete(null)
      fetchData()
    } catch (err) {
      console.error("💥 Delete failed:", err)
      setError(err instanceof Error ? err.message : 'Failed to delete business')
    }
  }


  const fetchBusinessAnalytics = async (businessId: number) => {
    try {
      // Get current date ranges
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get all items for this business
      const { data: businessItems } = await supabase
        .from('side_business_items')
        .select('item_id, stock_quantity')
        .eq('business_id', businessId)

      // Calculate current stock
      const currentStock = businessItems?.reduce((total, item) => {
        return total + (item.stock_quantity || 0)
      }, 0) || 0

      // Get item IDs for this business
      const itemIds = businessItems?.map(item => item.item_id) || []

      if (itemIds.length === 0) {
        setBusinessAnalytics({
          currentStock: 0,
          dailySales: { count: 0, revenue: 0 },
          weeklySales: { count: 0, revenue: 0 },
          monthlySales: { count: 0, revenue: 0 }
        })
        return
      }

      // Fetch daily sales
      const { data: dailySales } = await supabase
        .from('side_business_sales')
        .select('total_amount')
        .in('item_id', itemIds)
        .gte('date_time', today.toISOString())

      // Fetch weekly sales
      const { data: weeklySales } = await supabase
        .from('side_business_sales')
        .select('total_amount')
        .in('item_id', itemIds)
        .gte('date_time', weekStart.toISOString())

      // Fetch monthly sales
      const { data: monthlySales } = await supabase
        .from('side_business_sales')
        .select('total_amount')
        .in('item_id', itemIds)
        .gte('date_time', monthStart.toISOString())

      setBusinessAnalytics({
        currentStock,
        dailySales: {
          count: dailySales?.length || 0,
          revenue: dailySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
        },
        weeklySales: {
          count: weeklySales?.length || 0,
          revenue: weeklySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
        },
        monthlySales: {
          count: monthlySales?.length || 0,
          revenue: monthlySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
        }
      })
    } catch (err) {
      console.error('Error fetching business analytics:', err)
      setBusinessAnalytics({
        currentStock: 0,
        dailySales: { count: 0, revenue: 0 },
        weeklySales: { count: 0, revenue: 0 },
        monthlySales: { count: 0, revenue: 0 }
      })
    }
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockItem.item_id || !restockItem.restock_quantity) return

    try {
      const newStockQuantity = restockItem.current_stock + parseInt(restockItem.restock_quantity)
      
      const { error } = await supabase
        .from('side_business_items')
        .update({ stock_quantity: newStockQuantity })
        .eq('item_id', restockItem.item_id)

      if (error) throw error

      // Reset form and close modal
      setRestockItem({
        item_id: null,
        current_stock: 0,
        restock_quantity: ''
      })
      setShowRestockModal(false)
      
      // Refresh data to show updated stock
      fetchData()
      if (selectedBusiness) {
        fetchBusinessAnalytics(selectedBusiness.business_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restock item')
    }
  }

  const openRestockModal = (item: SideBusinessItem) => {
    setRestockItem({
      item_id: item.item_id,
      current_stock: item.stock_qty || 0,
      restock_quantity: ''
    })
    setShowRestockModal(true)
  }

  const openEditItemModal = (item: SideBusinessItem) => {
    setEditingItem(item)
    setShowEditItemModal(true)
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    try {
      const { error } = await supabase
        .from('side_business_items')
        .update({ 
          name: editingItem.name,
          price: editingItem.price,
          notes: editingItem.notes
        })
        .eq('item_id', editingItem.item_id)

      if (error) throw error

      setShowEditItemModal(false)
      setEditingItem(null)
      
      // Refresh data to show updated item
      fetchData()
      if (selectedBusiness) {
        fetchBusinessAnalytics(selectedBusiness.business_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const handleBusinessClick = (business: SideBusiness) => {
    setSelectedBusiness(business)
    setShowBusinessDetail(true)
    fetchBusinessAnalytics(business.business_id)
  }

  const getBusinessTypeBadgeClass = (type: string | null) => {
    switch (type) {
      case 'rental': return styles.statusBadgeRental
      case 'resale': return styles.statusBadgeResale
      case 'service': return styles.statusBadgeService
      default: return styles.statusBadgeGray
    }
  }

  const getPaymentMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'cash': return styles.statusBadgeCash
      case 'card': return styles.statusBadgeCard
      case 'mobile': return styles.statusBadgeMobile
      default: return styles.statusBadgeGray
    }
  }

  // Filtered and sorted data
  const filteredItems = items
    .filter(item => {
      const matchesBusiness = selectedBusinessFilter === 'all' || 
        item.business_id.toString() === selectedBusinessFilter
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.side_businesses?.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesBusiness && matchesSearch
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.price || 0
          bValue = b.price || 0
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          return 0
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

  const filteredBusinesses = businesses
    .filter(business => {
      const matchesType = selectedBusinessTypeFilter === 'all' || business.business_type === selectedBusinessTypeFilter
      const matchesSearch = searchTerm === '' || 
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.description?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesType && matchesSearch
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          return 0
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

  const filteredSales = sales
    .filter(sale => {
      // Check if the sale's item belongs to a business that matches the business filter
      const saleBusinessId = items.find(item => item.item_id === sale.item_id)?.business_id
      const matchesBusiness = selectedBusinessFilter === 'all' || 
        saleBusinessId?.toString() === selectedBusinessFilter
      
      // Check if the sale's business matches the business type filter
      const saleBusiness = businesses.find(business => business.business_id === saleBusinessId)
      const matchesType = selectedBusinessTypeFilter === 'all' || 
        saleBusiness?.business_type === selectedBusinessTypeFilter
      
      // Check if the sale matches the search term
      const matchesSearch = searchTerm === '' || 
        sale.side_business_items?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.side_business_items?.side_businesses?.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesBusiness && matchesType && matchesSearch
    })
    .sort((a, b) => {
      const aValue = new Date(a.date_time)
      const bValue = new Date(b.date_time)
      return sortOrder === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime()
    })

  const businessTypes = [...new Set(businesses.map(b => b.business_type).filter(Boolean))]

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <div className={styles.loadingStateContainer}>
  //       <div className={styles.loadingStateText}>
  //         <i className={`fa-solid fa-spinner ${styles.loadingStateSpinner}`}></i>
  //         Loading side businesses...
  //       </div>
  //     </div>
  //   )
  // }

  if (error) {
    return (
      <div className={styles.errorStateContainer}>
        <div className={styles.errorStateContent}>
          <i className={`fa-solid fa-exclamation-triangle ${styles.errorStateIcon}`}></i>
          <h2 className={styles.errorStateTitle}>Error Loading Side Businesses</h2>
          <p className={styles.errorStateText}>{error}</p>
          <button className={styles.errorStateRetryButton} onClick={fetchData}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.sideBusinessesContainer}>
      <PageHeader
        title="Side Businesses"
        subtitle="Manage your additional business locations"
      >
        <button
          onClick={() => setShowAddBusiness(true)}
          className={styles.primaryButton}
        >
          <i className="fa-solid fa-plus"></i>
          Add Business
        </button>
      </PageHeader>

      {/* Search Container with integrated search bar */}
      <SearchContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search businesses, items, or sales..."
        showSearchResults={!!searchTerm}
        searchResultsCount={filteredItems.length + filteredBusinesses.length + filteredSales.length}
        onClearSearch={() => setSearchTerm('')}
        filters={[
          {
            label: "Business",
            value: selectedBusinessFilter,
            onChange: setSelectedBusinessFilter,
            options: [
              { value: 'all', label: 'All Businesses' },
              ...businesses.map(business => ({
                value: business.business_id.toString(),
                label: business.name
              }))
            ]
          },
          {
            label: "Type",
            value: selectedBusinessTypeFilter,
            onChange: setSelectedBusinessTypeFilter,
            options: [
              { value: 'all', label: 'All Types' },
              ...businessTypes.map(type => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1)
              }))
            ]
          }
        ]}
        sortOptions={[
          {
            label: "Sort",
            value: sortBy,
            onChange: (value) => setSortBy(value as 'name' | 'created_at' | 'price'),
            options: [
              { value: 'created_at', label: 'Date Created' },
              { value: 'name', label: 'Name' },
              { value: 'price', label: 'Price' }
            ]
          }
        ]}
        onSortToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        sortOrder={sortOrder}
        hasActiveFilters={selectedBusinessFilter !== 'all' || selectedBusinessTypeFilter !== 'all'}
        onClearFilters={() => {
          setSelectedBusinessFilter('all')
          setSelectedBusinessTypeFilter('all')
        }}
      />

      {/* Statistics Cards */}
      <div className={styles.statisticsGrid}>
        <div className={styles.statisticsCard}>
          <div className={styles.statisticsCardContent}>
            <div className={styles.statisticsInfo}>
              <p className={styles.statisticsLabel}>Total Businesses</p>
              <p className={styles.statisticsValue}>{filteredBusinesses.length}</p>
            </div>
            <i className={`fas fa-briefcase ${styles.statisticsIcon} ${styles.statisticsIconPurple}`}></i>
          </div>
        </div>
        
        <div className={styles.statisticsCard}>
          <div className={styles.statisticsCardContent}>
            <div className={styles.statisticsInfo}>
              <p className={styles.statisticsLabel}>Total Items</p>
              <p className={styles.statisticsValue}>{filteredItems.length}</p>
            </div>
            <i className={`fas fa-box ${styles.statisticsIcon} ${styles.statisticsIconBlue}`}></i>
          </div>
        </div>
        
        <div className={styles.statisticsCard}>
          <div className={styles.statisticsCardContent}>
            <div className={styles.statisticsInfo}>
              <p className={styles.statisticsLabel}>Total Sales</p>
              <p className={styles.statisticsValue}>{filteredSales.length}</p>
            </div>
            <i className={`fas fa-chart-line ${styles.statisticsIcon} ${styles.statisticsIconGreen}`}></i>
          </div>
        </div>
        
        <div className={styles.statisticsCard}>
          <div className={styles.statisticsCardContent}>
            <div className={styles.statisticsInfo}>
              <p className={styles.statisticsLabel}>Revenue</p>
              <p className={styles.statisticsValue}>€{filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)}</p>
            </div>
            <i className={`fas fa-euro-sign ${styles.statisticsIcon} ${styles.statisticsIconOrange}`}></i>
          </div>
        </div>
      </div>


      {/* Main Content Grid */}
      <div className={styles.mainContentGrid}>
        {/* Businesses List */}
        <div className={styles.contentPanel}>
          <div className={styles.contentPanelHeader}>
            <h2 className={styles.contentPanelTitle}>Businesses</h2>
          </div>
          <div className={styles.contentPanelBody}>
            {filteredBusinesses.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                <i className={`fa-solid fa-briefcase ${styles.emptyStateMessageIcon}`}></i>
                <p className={styles.emptyStateMessageText}>
                  No businesses found. Add your first side business to get started!
                </p>
              </div>
            ) : (
              <div className={`${styles.listContainer} ${styles.listContainerDivided}`}>
                {filteredBusinesses.map((business) => (
                  <div key={business.business_id} className={styles.listItemCard} onClick={() => handleBusinessClick(business)}>
                    <div className={styles.listItemCardContent}>
                      <div className={styles.listItemCardIcon}>
                        {business.image_url && (
                          <img 
                            src={business.image_url} 
                            alt={business.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                          />
                        )}
                      </div>
                      <div className={styles.listItemCardMain}>
                        <h3 className={styles.listItemCardTitle}>{business.name}</h3>
                        {business.description && (
                          <p className={styles.listItemCardSubtitle}>{business.description}</p>
                        )}
                        <div className={styles.listItemCardMeta}>
                          <span className={`${styles.statusBadge} ${getBusinessTypeBadgeClass(business.business_type)}`}>
                            {business.business_type || 'service'}
                          </span>
                          <span className={styles.listItemCardCount}>
                            {items.filter(item => item.business_id === business.business_id).length} items
                          </span>
                        </div>
                      </div>
                      <div className={styles.listItemCardActions}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setBusinessToDelete(business)
                          }}
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          title="Delete Business"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className={styles.contentPanel}>
          <div className={styles.contentPanelHeader}>
            <h2 className={styles.contentPanelTitle}>Items</h2>
            <button
              onClick={() => setShowAddItem(true)}
              className={styles.actionButton}
              style={{ marginLeft: 'auto' }}
            >
              <i className={`fas fa-plus ${styles.actionButtonIcon}`}></i>
              Add Item
            </button>
          </div>
          <div className={styles.contentPanelBody}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                <i className={`fa-solid fa-box ${styles.emptyStateMessageIcon}`}></i>
                <p className={styles.emptyStateMessageText}>
                  No items found. Add items to your businesses!
                </p>
              </div>
            ) : (
              <div className={`${styles.listContainer} ${styles.listContainerDivided}`}>
                {filteredItems.map((item) => (
                  <div key={item.item_id} className={styles.listItemCard}>
                    <div className={styles.listItemCardContent}>
                      <div className={styles.listItemCardMain}>
                        <h3 className={styles.listItemCardTitle}>{item.name}</h3>
                        <p className={styles.listItemCardSubtitle}>
                          {item.side_businesses?.name || 'Unknown Business'}
                        </p>
                        <div className={styles.listItemCardMeta}>
                          {item.price ? (
                            <span className={styles.listItemCardPrice}>€{item.price}</span>
                          ) : (
                            <span className={styles.listItemCardPrice} style={{ color: '#7d8d86', fontStyle: 'italic' }}>
                              Custom Amount
                            </span>
                          )}
                          {item.stock_qty !== null && (
                            <span className={styles.listItemCardStock}>Stock: {item.stock_qty}</span>
                          )}
                          {businesses.find(b => b.business_id === item.business_id)?.business_type === 'service' && (
                            <span className={`${styles.statusBadge} ${styles.statusBadgeService}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              Service
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.listItemCardActions}>
                        <button
                          onClick={() => {
                            setNewSale(prev => ({ ...prev, item_id: item.item_id.toString() }))
                            setShowAddSale(true)
                          }}
                          className={styles.actionButton}
                        >
                          <i className={`fas fa-plus ${styles.actionButtonIcon}`}></i>
                          Sale
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className={styles.contentPanel}>
          <div className={styles.contentPanelHeader}>
            <h2 className={styles.contentPanelTitle}>Recent Sales</h2>
          </div>
          <div className={styles.contentPanelBody}>
            {filteredSales.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                <i className={`fa-solid fa-receipt ${styles.emptyStateMessageIcon}`}></i>
                <p className={styles.emptyStateMessageText}>
                  No sales recorded yet.
                </p>
              </div>
            ) : (
              <div className={`${styles.listContainer} ${styles.listContainerDivided}`}>
                {filteredSales.map((sale) => (
                  <div key={sale.sale_id} className={styles.listItemCard}>
                    <div className={styles.listItemCardContent}>
                      <div className={styles.listItemCardMain}>
                        <h3 className={styles.listItemCardTitle}>
                          {sale.side_business_items?.name || 'Unknown Item'}
                        </h3>
                        <p className={styles.listItemCardSubtitle}>
                          {sale.side_business_items?.side_businesses?.name || 'Unknown Business'}
                        </p>
                        <p className={styles.listItemCardTime}>
                          {new Date(sale.date_time).toLocaleDateString()} at {new Date(sale.date_time).toLocaleTimeString()}
                        </p>
                        <div className={styles.listItemCardMeta}>
                          <span className={styles.listItemCardCount}>Qty: {sale.quantity}</span>
                          <span className={styles.listItemCardPrice}>€{sale.total_amount}</span>
                          <span className={`${styles.statusBadge} ${getPaymentMethodBadgeClass(sale.payment_method)}`}>
                            {sale.payment_method}
                          </span>
                        </div>
                      </div>
                      <div className={styles.listItemCardActions}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSaleToDelete(sale)
                          }}
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          title="Delete Sale"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Business Modal */}
      {showAddBusiness && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalDialogTitle}>Create New Business</h2>
              <button
                type="button"
                onClick={() => {
                  setNewBusiness({ name: '', description: '', business_type: 'service', icon: 'fa-solid fa-briefcase' })
                  setShowAddBusiness(false)
                  setError(null)
                }}
                className={styles.modalCloseButton}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {error && (
              <div className={styles.errorMessage}>
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            
            <form onSubmit={handleAddBusiness} className={styles.modalDialogForm}>
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>
                  Business Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBusiness.name}
                  onChange={(e) => setNewBusiness(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.formFieldInput}
                  placeholder="Enter business name"
                  maxLength={100}
                />
              </div>
              
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>Description</label>
                <textarea
                  value={newBusiness.description}
                  onChange={(e) => setNewBusiness(prev => ({ ...prev, description: e.target.value }))}
                  className={styles.formFieldTextarea}
                  rows={3}
                  placeholder="Brief description of your business"
                  maxLength={500}
                />
                <small className={styles.formFieldHelp}>
                  Optional: Describe what your business does
                </small>
              </div>
              
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>
                  Business Type <span className={styles.required}>*</span>
                </label>
                <select
                  value={newBusiness.business_type}
                  onChange={(e) => setNewBusiness(prev => ({ ...prev, business_type: e.target.value }))}
                  className={styles.formFieldSelect}
                  required
                >
                  <option value="">Select business type</option>
                  <option value="service">Service (Custom pricing per transaction)</option>
                  <option value="rental">Rental (Fixed pricing with stock)</option>
                  <option value="resale">Resale (Fixed pricing with stock)</option>
                </select>
                <small className={styles.formFieldHelp}>
                  {newBusiness.business_type === 'service' && 'Services allow custom pricing for each transaction'}
                  {newBusiness.business_type === 'rental' && 'Rentals have fixed prices and track stock quantities'}
                  {newBusiness.business_type === 'resale' && 'Resale items have fixed prices and track stock quantities'}
                </small>
              </div>
              
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>Business Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    setNewBusinessImage(file || null)
                  }}
                  className={styles.formFieldInput}
                />
                <small className={styles.formFieldHelp}>
                  Optional: Upload an image for your business (max 5MB, will be compressed)
                </small>
                {newBusinessImage && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                    <i className="fas fa-image" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
                    Selected: {newBusinessImage.name}
                  </div>
                )}
              </div>
              
              
              <div className={styles.modalDialogActions}>
                <button
                  type="button"
                  onClick={() => {
                    setNewBusiness({ name: '', description: '', business_type: 'service', icon: 'fa-solid fa-briefcase' })
                    setNewBusinessImage(null)
                    setShowAddBusiness(false)
                    setError(null)
                  }}
                  className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBusiness.name.trim() || !newBusiness.business_type || uploadingNewBusinessImage}
                  className={`${styles.standardButton} ${styles.standardButtonPrimary}`}
                >
                  {uploadingNewBusinessImage ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                      Create Business
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <h2 className={styles.modalDialogTitle}>Add Item</h2>
            <form onSubmit={handleAddItem} className={styles.modalDialogForm}>
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>Business</label>
                <select
                  required
                  value={newItem.business_id}
                  onChange={(e) => setNewItem(prev => ({ ...prev, business_id: e.target.value }))}
                  className={styles.formFieldSelect}
                >
                  <option value="">Select a business</option>
                  {businesses.map((business) => (
                    <option key={business.business_id} value={business.business_id}>
                      {business.name} ({business.business_type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formFieldGroup}>
                <label className={styles.formFieldLabel}>Item Name</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.formFieldInput}
                  placeholder="e.g., Haircut, Chair Rental, etc."
                />
              </div>
              
              {newItem.business_id && businesses.find(b => b.business_id.toString() === newItem.business_id)?.business_type !== 'service' && (
                <>
                  <div className={styles.formFieldGroup}>
                    <label className={styles.formFieldLabel}>Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                      className={styles.formFieldInput}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className={styles.formFieldGroup}>
                    <label className={styles.formFieldLabel}>Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.stock_qty}
                      onChange={(e) => setNewItem(prev => ({ ...prev, stock_qty: e.target.value }))}
                      className={styles.formFieldInput}
                      placeholder="0"
                    />
                  </div>
                </>
              )}
              
              {newItem.business_id && businesses.find(b => b.business_id.toString() === newItem.business_id)?.business_type === 'service' && (
                <>
                  <div className={styles.formFieldGroup}>
                    <p style={{ color: '#7d8d86', fontSize: '14px', margin: 0 }}>
                      <i className="fa-solid fa-info-circle" style={{ marginRight: '8px' }}></i>
                      Service items don't have fixed prices or stock. You'll enter the amount when recording a sale.
                    </p>
                  </div>
                  
                  <div className={styles.formFieldGroup}>
                    <label className={styles.formFieldLabel}>Service Notes</label>
                    <textarea
                      value={newItem.notes}
                      onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                      className={styles.formFieldTextarea}
                      rows={3}
                      placeholder="Add notes, instructions, or details for this service..."
                      maxLength={500}
                    />
                    <small className={styles.formFieldHelp}>
                      Optional: Add any special instructions, requirements, or details for this service
                    </small>
                  </div>
                </>
              )}
              
              <div className={styles.modalDialogActions}>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.standardButton} ${styles.standardButtonSuccess}`}
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      {showAddSale && (
        <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
          <div className={styles.modalDialog}>
            <h2 className={styles.modalDialogTitle}>Record Sale</h2>
            <form onSubmit={handleAddSale} className={styles.modalDialogForm}>
              <div className={styles.formGroup}>
                <label className={styles.formFieldLabel}>Item</label>
                <select
                  required
                  value={newSale.item_id}
                  onChange={(e) => setNewSale(prev => ({ ...prev, item_id: e.target.value }))}
                  className={styles.formFieldSelect}
                >
                  <option value="">Select an item</option>
                  {items.map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.name} - {item.side_businesses?.name}
                      {item.side_businesses && businesses.find(b => b.name === item.side_businesses?.name)?.business_type === 'service' 
                        ? ' (Service - Custom Amount)' 
                        : item.price ? ` (€${item.price})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formFieldLabel}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newSale.quantity}
                  onChange={(e) => setNewSale(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  className={styles.formFieldInput}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formFieldLabel}>Total Amount (€)</label>
                {(() => {
                  const selectedItem = items.find(item => item.item_id.toString() === newSale.item_id)
                  const business = selectedItem ? businesses.find(b => b.name === selectedItem.side_businesses?.name) : null
                  const isService = business?.business_type === 'service'
                  const hasFixedPrice = selectedItem && selectedItem.price && selectedItem.price > 0
                  
                  if (isService) {
                    // Service items require manual price input
                    return (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newSale.total_amount}
                          onChange={(e) => setNewSale(prev => ({ ...prev, total_amount: e.target.value }))}
                          className={styles.formFieldInput}
                          placeholder="0.00"
                        />
                        <p style={{ color: '#7d8d86', fontSize: '12px', margin: '4px 0 0 0' }}>
                          <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                          Enter the custom amount for this service
                        </p>
                      </>
                    )
                  } else if (hasFixedPrice) {
                    // Items with fixed prices show calculated amount (read-only)
                    return (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={newSale.total_amount}
                          readOnly
                          className={styles.formFieldInput}
                          style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
                        />
                      </>
                    )
                  } else {
                    // Items without price require manual input
                    return (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newSale.total_amount}
                          onChange={(e) => setNewSale(prev => ({ ...prev, total_amount: e.target.value }))}
                          className={styles.formFieldInput}
                          placeholder="0.00"
                        />
                        <p style={{ color: '#f59e0b', fontSize: '12px', margin: '4px 0 0 0' }}>
                          <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                          This item has no set price. Please enter the amount manually.
                        </p>
                      </>
                    )
                  }
                })()}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formFieldLabel}>Payment Method</label>
                <select
                  value={newSale.payment_method}
                  onChange={(e) => setNewSale(prev => ({ ...prev, payment_method: e.target.value }))}
                  className={styles.formFieldSelect}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              
              <div className={styles.modalDialogActions}>
                <button
                  type="button"
                  onClick={() => setShowAddSale(false)}
                  className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.standardButton} ${styles.standardButtonSuccess}`}
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Detail Modal */}
      {showBusinessDetail && selectedBusiness && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDialog} style={{ maxWidth: '600px' }}>
            <h2 className={styles.modalDialogTitle}>Business Details</h2>
            
            <div className={styles.businessDetailModalHeader}>
              <div className={styles.businessDetailModalIcon}>
                {selectedBusiness.image_url ? (
                  <img 
                    src={selectedBusiness.image_url} 
                    alt={selectedBusiness.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '16px',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <i className={selectedBusiness.icon || 'fa-solid fa-briefcase'}></i>
                )}
              </div>
              <div className={styles.businessDetailModalInfo}>
                <h3 className={styles.businessDetailModalName}>{selectedBusiness.name}</h3>
                <p className={styles.businessDetailModalDescription}>{selectedBusiness.description || 'No description provided'}</p>
                <div className={styles.businessDetailModalMeta}>
                  <span className={`${styles.statusBadge} ${getBusinessTypeBadgeClass(selectedBusiness.business_type)}`}>
                    {selectedBusiness.business_type || 'service'}
                  </span>
                  <span className={styles.businessDetailModalDate}>
                    Created: {new Date(selectedBusiness.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

             <div className={styles.businessDetailModalStats}>
               <div className={styles.statisticsCard}>
                 <div className={styles.statisticsCardContent}>
                   <div className={styles.statisticsInfo}>
                     <p className={styles.statisticsLabel}>Total Items</p>
                     <p className={styles.statisticsValue}>
                       {items.filter(item => item.business_id === selectedBusiness.business_id).length}
                     </p>
                   </div>
                   <i className={`fas fa-box ${styles.statisticsIcon} ${styles.statisticsIconBlue}`}></i>
                 </div>
               </div>
               
               <div className={styles.statisticsCard}>
                 <div className={styles.statisticsCardContent}>
                   <div className={styles.statisticsInfo}>
                     <p className={styles.statisticsLabel}>Current Stock</p>
                     <p className={styles.statisticsValue}>
                       {businessAnalytics?.currentStock || 0}
                     </p>
                   </div>
                   <i className={`fas fa-warehouse ${styles.statisticsIcon} ${styles.statisticsIconOrange}`}></i>
                 </div>
               </div>
             </div>

             {/* Sales Analytics */}
             <div className={styles.businessAnalyticsSection}>
               <h4 className={styles.analyticsSectionTitle}>Sales Analytics</h4>
               <div className={styles.analyticsGrid}>
                 <div className={styles.analyticsCard}>
                   <div className={styles.analyticsCardHeader}>
                     <i className={`fas fa-calendar-day ${styles.analyticsIcon} ${styles.analyticsIconBlue}`}></i>
                     <span className={styles.analyticsPeriod}>Today</span>
                   </div>
                   <div className={styles.analyticsCardContent}>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Sales</span>
                       <span className={styles.analyticsValue}>{businessAnalytics?.dailySales.count || 0}</span>
                     </div>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Revenue</span>
                       <span className={styles.analyticsValue}>€{(businessAnalytics?.dailySales.revenue || 0).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>

                 <div className={styles.analyticsCard}>
                   <div className={styles.analyticsCardHeader}>
                     <i className={`fas fa-calendar-week ${styles.analyticsIcon} ${styles.analyticsIconGreen}`}></i>
                     <span className={styles.analyticsPeriod}>This Week</span>
                   </div>
                   <div className={styles.analyticsCardContent}>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Sales</span>
                       <span className={styles.analyticsValue}>{businessAnalytics?.weeklySales.count || 0}</span>
                     </div>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Revenue</span>
                       <span className={styles.analyticsValue}>€{(businessAnalytics?.weeklySales.revenue || 0).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>

                 <div className={styles.analyticsCard}>
                   <div className={styles.analyticsCardHeader}>
                     <i className={`fas fa-calendar-alt ${styles.analyticsIcon} ${styles.analyticsIconPurple}`}></i>
                     <span className={styles.analyticsPeriod}>This Month</span>
                   </div>
                   <div className={styles.analyticsCardContent}>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Sales</span>
                       <span className={styles.analyticsValue}>{businessAnalytics?.monthlySales.count || 0}</span>
                     </div>
                     <div className={styles.analyticsMetric}>
                       <span className={styles.analyticsLabel}>Revenue</span>
                       <span className={styles.analyticsValue}>€{(businessAnalytics?.monthlySales.revenue || 0).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

            <div className={styles.businessDetailModalItems}>
              <div className={styles.itemsSectionHeader}>
                <h4>Items in this business:</h4>
                <button
                  onClick={() => setShowAddItem(true)}
                  className={styles.restockButton}
                  title="Add new item"
                >
                  <i className="fas fa-plus"></i>
                  Add Item
                </button>
              </div>
              {items.filter(item => item.business_id === selectedBusiness.business_id).length === 0 ? (
                <p className={styles.noItemsMessage}>No items added yet.</p>
              ) : (
                <div className={styles.listContainer}>
                  {items.filter(item => item.business_id === selectedBusiness.business_id).map(item => (
                    <div key={item.item_id} className={styles.listItemCard}>
                      <div className={styles.listItemCardContent}>
                        <div className={styles.listItemCardMain}>
                          <h4 className={styles.listItemCardTitle}>{item.name}</h4>
                          <div className={styles.listItemCardMeta}>
                            {item.price ? (
                              <span className={styles.listItemCardPrice}>€{item.price}</span>
                            ) : (
                              <span className={styles.listItemCardPrice} style={{ color: '#7d8d86', fontStyle: 'italic' }}>
                                Custom Amount
                              </span>
                            )}
                            {item.stock_qty !== null && (
                              <span className={styles.listItemCardStock}>Stock: {item.stock_qty}</span>
                            )}
                            {selectedBusiness?.business_type === 'service' && (
                              <span className={`${styles.statusBadge} ${styles.statusBadgeService}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                Service
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div className={styles.listItemCardNotes}>
                              <i className="fas fa-sticky-note" style={{ marginRight: '6px', color: '#6b7280' }}></i>
                              <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                                {item.notes.length > 100 ? `${item.notes.substring(0, 100)}...` : item.notes}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={styles.listItemCardActions}>
                          <button
                            onClick={() => openEditItemModal(item)}
                            className={`${styles.actionButton} ${styles.editActionButton}`}
                            title="Edit item"
                          >
                            <i className={`fas fa-edit ${styles.actionButtonIcon}`}></i>
                            Edit
                          </button>
                          {item.stock_qty !== null && (
                            <button
                              onClick={() => openRestockModal(item)}
                              className={`${styles.actionButton} ${styles.restockActionButton}`}
                              title="Restock item"
                            >
                              <i className={`fas fa-boxes-stacked ${styles.actionButtonIcon}`}></i>
                              Restock
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setNewSale(prev => ({ ...prev, item_id: item.item_id.toString() }))
                              setShowAddSale(true)
                            }}
                            className={styles.actionButton}
                            title="Record sale"
                          >
                            <i className={`fas fa-plus ${styles.actionButtonIcon}`}></i>
                            Sale
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalDialogActions}>
              <button
                type="button"
                onClick={() => setShowBusinessDetail(false)}
                className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBusinessDetail(false)
                  setBusinessToDelete(selectedBusiness)
                }}
                className={`${styles.standardButton} ${styles.standardButtonDanger}`}
              >
                Delete Business
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Delete Confirmation Modal */}
       {businessToDelete && (
         <div className={styles.modalOverlay}>
           <div className={styles.modalDialog}>
             <h2 className={styles.modalDialogTitle}>Delete Business</h2>
             <p className={styles.deleteConfirmationWarning}>
               Are you sure you want to delete <strong>{businessToDelete.name}</strong>?
             </p>
             <p className={styles.deleteConfirmationWarningText}>
               This will permanently delete the business, all its items, and all related sales records.
               This action cannot be undone.
             </p>
             
             <div className={styles.modalDialogActions}>
               <button
                 type="button"
                 onClick={() => setBusinessToDelete(null)}
                 className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={() => handleDeleteBusiness(businessToDelete.business_id)}
                 className={`${styles.standardButton} ${styles.standardButtonDanger}`}
               >
                 Delete Business
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Delete Sale Confirmation Modal */}
       {saleToDelete && (
         <div className={styles.modalOverlay}>
           <div className={styles.modalDialog}>
             <h2 className={styles.modalDialogTitle}>Delete Sale</h2>
             <p className={styles.deleteConfirmationWarning}>
               Are you sure you want to delete this sale?
             </p>
             <div style={{ 
               background: '#f8f9fa', 
               padding: '12px', 
               borderRadius: '8px', 
               margin: '16px 0',
               border: '1px solid #e9ecef'
             }}>
               <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
                 {saleToDelete.side_business_items?.name || 'Unknown Item'}
               </p>
               <p style={{ margin: '0 0 4px 0', color: '#6c757d', fontSize: '14px' }}>
                 {saleToDelete.side_business_items?.side_businesses?.name || 'Unknown Business'}
               </p>
               <p style={{ margin: '0 0 4px 0', color: '#6c757d', fontSize: '14px' }}>
                 Quantity: {saleToDelete.quantity} • Total: €{saleToDelete.total_amount}
               </p>
               <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                 {new Date(saleToDelete.date_time).toLocaleDateString()} at {new Date(saleToDelete.date_time).toLocaleTimeString()}
               </p>
             </div>
             <p className={styles.deleteConfirmationWarningText}>
               This will permanently delete the sale record. This action cannot be undone.
             </p>
             
             <div className={styles.modalDialogActions}>
               <button
                 type="button"
                 onClick={() => setSaleToDelete(null)}
                 className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={() => handleDeleteSale(saleToDelete.sale_id)}
                 className={`${styles.standardButton} ${styles.standardButtonDanger}`}
               >
                 Delete Sale
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Restock Modal */}
       {showRestockModal && restockItem.item_id && (
         <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
           <div className={styles.modalDialog}>
             <h2 className={styles.modalDialogTitle}>Restock Item</h2>
             <div className={styles.restockInfo}>
               <p className={styles.restockItemName}>
                 {items.find(item => item.item_id === restockItem.item_id)?.name}
               </p>
               <p className={styles.restockCurrentStock}>
                 Current Stock: <strong>{restockItem.current_stock}</strong>
               </p>
             </div>
             
             <form onSubmit={handleRestock} className={styles.modalDialogForm}>
               <div className={styles.formFieldGroup}>
                 <label className={styles.formFieldLabel}>Restock Quantity</label>
                 <input
                   type="number"
                   min="1"
                   required
                   value={restockItem.restock_quantity}
                   onChange={(e) => setRestockItem(prev => ({ ...prev, restock_quantity: e.target.value }))}
                   className={styles.formFieldInput}
                   placeholder="Enter quantity to add"
                 />
               </div>
               
               <div className={styles.restockPreview}>
                 <p className={styles.restockPreviewText}>
                   New stock will be: <strong>{restockItem.current_stock + (parseInt(restockItem.restock_quantity) || 0)}</strong>
                 </p>
               </div>
               
               <div className={styles.modalDialogActions}>
                 <button
                   type="button"
                   onClick={() => setShowRestockModal(false)}
                   className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className={`${styles.standardButton} ${styles.standardButtonSuccess}`}
                 >
                   <i className="fas fa-boxes-stacked" style={{ marginRight: '8px' }}></i>
                   Restock Item
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Edit Item Modal */}
       {showEditItemModal && editingItem && (
         <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
           <div className={styles.modalDialog}>
             <h2 className={styles.modalDialogTitle}>Edit Item</h2>
             
             <form onSubmit={handleEditItem} className={styles.modalDialogForm}>
               <div className={styles.formFieldGroup}>
                 <label className={styles.formFieldLabel}>Item Name</label>
                 <input
                   type="text"
                   required
                   value={editingItem.name}
                   onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                   className={styles.formFieldInput}
                   placeholder="Enter item name"
                 />
               </div>
               
               <div className={styles.formFieldGroup}>
                 <label className={styles.formFieldLabel}>Price (€)</label>
                 <input
                   type="number"
                   step="0.01"
                   min="0"
                   value={editingItem.price || ''}
                   onChange={(e) => setEditingItem(prev => prev ? { 
                     ...prev, 
                     price: e.target.value ? parseFloat(e.target.value) : null 
                   } : null)}
                   className={styles.formFieldInput}
                   placeholder="Enter price (leave empty for custom pricing)"
                 />
                 <small className={styles.formFieldHelp}>
                   Leave empty for service items with custom pricing
                 </small>
               </div>
               
               <div className={styles.formFieldGroup}>
                 <label className={styles.formFieldLabel}>Notes</label>
                 <textarea
                   value={editingItem.notes || ''}
                   onChange={(e) => setEditingItem(prev => prev ? { 
                     ...prev, 
                     notes: e.target.value 
                   } : null)}
                   className={styles.formFieldTextarea}
                   rows={3}
                   placeholder="Add notes, instructions, or details..."
                   maxLength={500}
                 />
                 <small className={styles.formFieldHelp}>
                   Optional: Add any special instructions, requirements, or details
                 </small>
               </div>
               
               <div className={styles.modalDialogActions}>
                 <button
                   type="button"
                   onClick={() => setShowEditItemModal(false)}
                   className={`${styles.standardButton} ${styles.standardButtonSecondary}`}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className={`${styles.standardButton} ${styles.standardButtonPrimary}`}
                 >
                   <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                   Update Item
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
     </div>
   )
 }
 
 export default SideBusinesses
