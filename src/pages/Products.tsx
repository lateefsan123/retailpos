import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRole } from '../contexts/RoleContext'
import { useAuth } from '../contexts/AuthContext'

async function uploadProductImage(file: File, productId: string) {
  console.log("🔄 Starting image upload for product:", productId)
  console.log("📁 File details:", {
    name: file.name,
    size: file.size,
    type: file.type
  })
  
  try {
    // Upload original file directly to Supabase Storage
    const fileName = `product-images/${productId}.${file.name.split('.').pop()}`
    console.log("📤 Uploading to Supabase Storage:", fileName)
    
    const { error: uploadError } = await supabase.storage
      .from('products')
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
      .from('products')
      .update({ image_url: publicUrl })
      .eq('product_id', productId)

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

interface Product {
  product_id: string
  name: string
  category: string
  price: number
  stock_quantity: number
  supplier_info: string
  reorder_level: number
  tax_rate: number
  image_url?: string
  last_updated: string
  weight_unit?: string | null // e.g., 'kg', 'g', 'lb', 'oz'
  price_per_unit?: number | null // price per weight unit (e.g., 3.00 for €3 per kg)
  is_weighted?: boolean // true if item is sold by weight
  description?: string
  sku?: string
}

const Products = () => {
  const { hasPermission } = useRole()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category: '',
    price: '',
    stock_quantity: '',
    reorder_level: '',
    supplier_info: '',
    tax_rate: '',
    description: '',
    sku: '',
    is_weighted: false,
    weight_unit: '',
    price_per_unit: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLilyMessage, setShowLilyMessage] = useState(false)
  const [lilyMessage, setLilyMessage] = useState("Hi! I'm Lily, your inventory assistant! I can help you understand your stock levels and manage your products. Hover over the stats cards to see what they mean!")
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalProducts, setTotalProducts] = useState(0)

  useEffect(() => {
    fetchProducts()
  }, [])

  // Search handlers
  const handleSearchSubmit = () => {
    setCurrentPage(1) // Reset to first page
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
    fetchProducts(1, itemsPerPage, '', selectedCategory)
  }

  // Only fetch when category changes (not on every search keystroke)
  useEffect(() => {
    setCurrentPage(1) // Reset to first page
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory)
  }, [selectedCategory])

  const fetchProducts = async (page: number = currentPage, perPage: number = itemsPerPage, search: string = searchTerm, category: string = selectedCategory) => {
    try {
      setLoading(true)
      setError(null)
      
      // Build the query with filters
      let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      let dataQuery = supabase
        .from('products')
        .select('*')
        .order('product_id', { ascending: true })

      // Apply search filter
      if (search && search.trim()) {
        const searchFilter = `name.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`
        countQuery = countQuery.or(searchFilter)
        dataQuery = dataQuery.or(searchFilter)
      }

      // Apply category filter
      if (category && category !== 'all') {
        countQuery = countQuery.eq('category', category)
        dataQuery = dataQuery.eq('category', category)
      }

      // Get total count with filters
      const { count, error: countError } = await countQuery

      if (countError) {
        throw countError
      }

      setTotalProducts(count || 0)

      // Calculate offset for pagination
      const offset = (page - 1) * perPage
      
      // Fetch products with pagination and filters
      const { data, error: fetchError } = await dataQuery.range(offset, offset + perPage - 1)

      if (fetchError) {
        throw fetchError
      }

      setProducts(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(errorMessage)
      console.error('Error fetching products:', err)
      // Show error to user
      alert(`Products loading error: ${errorMessage}. Please check your database permissions.`)
    } finally {
      setLoading(false)
    }
  }

  // Since we're now doing server-side filtering, we use products directly
  const filteredProducts = products

  // Calculate pagination values
  const totalPages = Math.ceil(totalProducts / itemsPerPage)
  const startItem = totalProducts > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts)

  // Get categories from all products (we'll need to fetch this separately for better performance)
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  const getCategorySuggestions = (input: string) => {
    if (!input || input.length < 2) return []
    
    const existingCategories = Array.from(new Set(products.map(p => p.category)))
    const suggestions = existingCategories.filter(category => 
      category.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(category.toLowerCase()) ||
      // Check for similar words (simple similarity check)
      category.toLowerCase().split(' ').some(word => 
        word.includes(input.toLowerCase()) || input.toLowerCase().includes(word)
      )
    )
    
    return suggestions.slice(0, 5) // Limit to 5 suggestions
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchProducts(newPage, itemsPerPage, searchTerm, selectedCategory)
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
    fetchProducts(1, newItemsPerPage, searchTerm, selectedCategory)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }


  const generateUniqueId = async () => {
    try {
      // Use a more robust approach with retry logic
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts) {
        // Get the current max ID
        const { data, error } = await supabase
          .from('products')
          .select('product_id')
          .order('product_id', { ascending: false })
          .limit(1)

        if (error) throw error

        const lastId = data && data.length > 0 ? parseInt(data[0].product_id) : 0
        const newId = (lastId + 1).toString()
        
        // Check if this ID already exists (race condition protection)
        const { data: existingData, error: checkError } = await supabase
          .from('products')
          .select('product_id')
          .eq('product_id', newId)
          .limit(1)

        if (checkError) throw checkError

        // If ID doesn't exist, we can use it
        if (!existingData || existingData.length === 0) {
          return newId
        }
        
        attempts++
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // If we've exhausted retries, use timestamp-based fallback
      return Date.now().toString()
    } catch (error) {
      console.error('Error generating unique ID:', error)
      return Date.now().toString() // Fallback to timestamp
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, newProduct:', newProduct)
    setIsSubmitting(true)

    try {
      const productId = await generateUniqueId()
      console.log('Generated product ID:', productId)
      
      const productData = {
        product_id: productId,
        name: newProduct.product_name,
        category: newProduct.category,
        price: newProduct.is_weighted ? 0 : parseFloat(newProduct.price), // Set price to 0 for weighted items
        stock_quantity: parseInt(newProduct.stock_quantity),
        supplier_info: newProduct.supplier_info,
        reorder_level: parseInt(newProduct.reorder_level),
        tax_rate: parseFloat(newProduct.tax_rate) || 0,
        last_updated: new Date().toISOString(),
        is_weighted: newProduct.is_weighted,
        weight_unit: newProduct.is_weighted ? newProduct.weight_unit : null,
        price_per_unit: newProduct.is_weighted ? parseFloat(newProduct.price_per_unit) : null
      }

      console.log('Inserting product data:', productData)
      
      // Try to insert with retry logic for race conditions
      let insertAttempts = 0
      const maxInsertAttempts = 3
      let insertError = null
      
      while (insertAttempts < maxInsertAttempts) {
        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (!error) {
          insertError = null
          break
        }
        
        // If it's a duplicate key error, regenerate ID and retry
        if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
          console.log(`Duplicate key error on attempt ${insertAttempts + 1}, regenerating ID...`)
          productData.product_id = await generateUniqueId()
          insertError = error
          insertAttempts++
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 200))
        } else {
          insertError = error
          break
        }
      }

      if (insertError) {
        console.error('Supabase error after retries:', insertError)
        throw insertError
      }
      
      console.log('Product added successfully!')

      // Upload image if selected
      if (selectedImage) {
        const imageUrl = await handleImageUpload(productId)
        if (imageUrl) {
          // Update the local products list with the image URL
          const updatedProduct = { ...productData, image_url: imageUrl }
          setProducts(prevProducts => [...prevProducts, updatedProduct])
        }
      } else {
        // If no image, just add the product to the list
        setProducts(prevProducts => [...prevProducts, productData])
      }

      // Reset form and close modal
      setNewProduct({
        product_name: '',
        category: '',
        price: '',
        stock_quantity: '',
        reorder_level: '',
        supplier_info: '',
        tax_rate: '',
        description: '',
        sku: '',
        is_weighted: false,
        weight_unit: '',
        price_per_unit: ''
      })
      setSelectedImage(null)
      setImagePreview(null)
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding product:', error)
      
      // Handle specific error types
      let errorMessage = 'Failed to add product'
      if (error instanceof Error && error.message) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'A product with this ID already exists. Please try again.'
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid data provided. Please check your input values.'
        } else if (error.message.includes('not-null constraint')) {
          errorMessage = 'Required fields are missing. Please fill in all required fields.'
        } else {
          errorMessage = `Failed to add product: ${error.message}`
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setIsSubmitting(true)
    setError(null)

    try {
      const productData = {
        name: newProduct.product_name,
        category: newProduct.category,
        price: newProduct.is_weighted ? 0 : parseFloat(newProduct.price), // Set price to 0 for weighted items
        stock_quantity: parseInt(newProduct.stock_quantity),
        reorder_level: parseInt(newProduct.reorder_level),
        supplier_info: newProduct.supplier_info,
        tax_rate: parseFloat(newProduct.tax_rate) || 0,
        last_updated: new Date().toISOString(),
        is_weighted: newProduct.is_weighted,
        weight_unit: newProduct.is_weighted ? newProduct.weight_unit : null,
        price_per_unit: newProduct.is_weighted ? parseFloat(newProduct.price_per_unit) : null
      }

      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('product_id', editingProduct.product_id)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Upload image if selected
      let updatedProduct = data[0]
      if (selectedImage) {
        const imageUrl = await handleImageUpload(editingProduct.product_id)
        if (imageUrl) {
          updatedProduct = { ...data[0], image_url: imageUrl }
        }
      }

      // Update the products list
      setProducts(products.map(p => 
        p.product_id === editingProduct.product_id ? updatedProduct : p
      ))
      
      resetForm()
      setShowEditModal(false)
      setEditingProduct(null)
    } catch (err) {
      console.error('Failed to update product:', err)
      setError(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log("🗑️ Starting delete for product:", productId)
      
      // Delete the product from the database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId)

      if (error) {
        console.error("❌ Error deleting product:", error)
        throw error
      }
      console.log("✅ Product deleted successfully")

      // Remove from local state
      setProducts(products.filter(p => p.product_id !== productId))
      setProductToDelete(null)
    } catch (err) {
      console.error("💥 Delete failed:", err)
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const resetForm = () => {
    setNewProduct({
      product_name: '',
      category: '',
      price: '',
      stock_quantity: '',
      reorder_level: '',
      supplier_info: '',
      tax_rate: '',
      description: '',
      sku: '',
      is_weighted: false,
      weight_unit: '',
      price_per_unit: ''
    })
    setSelectedImage(null)
    setImagePreview(null)
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingProduct(null)
  }

  const startEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      product_name: product.name,
      category: product.category,
      price: product.is_weighted ? (product.price_per_unit?.toString() || '') : product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      reorder_level: product.reorder_level.toString(),
      supplier_info: product.supplier_info || '',
      tax_rate: product.tax_rate?.toString() || '',
      description: product.description || '',
      sku: product.sku || '',
      is_weighted: product.is_weighted || false,
      weight_unit: product.weight_unit || '',
      price_per_unit: product.price_per_unit?.toString() || ''
    })
    setImagePreview(product.image_url || null)
    setSelectedImage(null)
    setShowEditModal(true)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async (productId: string) => {
    if (!selectedImage) return null
    
    setUploadingImage(true)
    try {
      const imageUrl = await uploadProductImage(selectedImage, productId)
      return imageUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const openFullSizeImage = (imageUrl: string) => {
    setFullSizeImage(imageUrl)
    setShowImageModal(true)
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setFullSizeImage(null)
  }

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock === 0) return { status: 'out', color: '#ef4444', bgColor: '#fef2f2', textColor: '#dc2626' }
    if (stock <= reorderLevel) return { status: 'low', color: '#f59e0b', bgColor: '#fffbeb', textColor: '#d97706' }
    return { status: 'good', color: '#10b981', bgColor: '#f0fdf4', textColor: '#059669' }
  }

  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('small')) return '#3b82f6' // Blue
    if (lowerCategory.includes('large')) return '#ef4444' // Red
    if (lowerCategory.includes('medium')) return '#f59e0b' // Orange/Yellow
    return '#7d8d86' // Default color
  }

  const highlightSizeKeywords = (text: string) => {
    const words = text.split(' ')
    return words.map((word, index) => {
      const lowerWord = word.toLowerCase()
      let color = '#1a1a1a' // Default color
      
      if (lowerWord === 'small') color = '#3b82f6' // Blue
      else if (lowerWord === 'large') color = '#ef4444' // Red
      else if (lowerWord === 'medium') color = '#f59e0b' // Orange/Yellow
      
      return (
        <span key={index} style={{ color }}>
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      )
    })
  }

  const LilyMascot = () => (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px'
    }}>
      {/* Speech Bubble */}
      {showLilyMessage && (
        <div style={{
          background: '#ffffff',
          border: '2px solid #7d8d86',
          borderRadius: '16px',
          padding: '12px 16px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '250px',
          fontSize: '14px',
          color: '#3e3f29',
          position: 'relative',
          marginBottom: '8px'
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>
            {lilyMessage}
          </p>
          {/* Speech bubble tail */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            right: '20px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #7d8d86'
          }}></div>
        </div>
      )}
      
      {/* Lily Image */}
      <div 
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '3px solid #7d8d86',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s ease'
        }}
        onClick={() => setShowLilyMessage(!showLilyMessage)}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        <img 
          src={user?.icon ? `/images/icons/${user.icon}.png` : "/images/backgrounds/lily.png"} 
          alt={user?.icon || "Lily"} 
          style={{ width: '50px', height: '50px', borderRadius: '50%' }}
        />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ 
          fontSize: '20px', 
          color: '#7d8d86',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fa-solid fa-spinner" style={{ 
            animation: 'spin 1s linear infinite',
            fontSize: '24px'
          }}></i>
          Loading inventory...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#3e3f29',
            margin: '0 0 8px 0'
          }}>
            Inventory Management
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#7d8d86',
            margin: 0
          }}>
            Manage your product inventory, stock levels, and suppliers.
          </p>
        </div>
        
        {hasPermission('canManageProducts') && (
          <button
            onClick={() => {
              console.log('Add Product button clicked')
              setShowAddModal(true)
              console.log('showAddModal set to true')
            }}
            style={{
              background: '#7d8d86',
              color: '#f1f0e4',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#bca88d'
              setLilyMessage("Click this button to add a new product to your inventory! You'll need to fill in details like name, price, stock quantity, and reorder level.")
              setShowLilyMessage(true)
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#7d8d86'
              setShowLilyMessage(false)
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '16px' }}></i>
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#7d8d86',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '18px', color: '#f1f0e4' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {products.length}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Total Products</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {products.filter(p => p.stock_quantity > p.reorder_level).length}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>In Stock</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {products.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0).length}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Low Stock</p>
            </div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-circle-xmark" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {products.filter(p => p.stock_quantity === 0).length}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fa-solid fa-search" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#7d8d86',
                  fontSize: '14px',
                  zIndex: 1
                }}></i>
                <input
                  type="text"
                  placeholder="Search products... (Press Enter to search)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  onBlur={handleSearchSubmit}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29',
                    boxSizing: 'border-box'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#7d8d86',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#ef4444'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#7d8d86'}
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearchSubmit}
                style={{
                  padding: '10px 16px',
                  background: '#7d8d86',
                  color: '#f1f0e4',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#bca88d'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#7d8d86'}
              >
                <i className="fa-solid fa-search" style={{ fontSize: '12px' }}></i>
                Search
              </button>
            </div>
          </div>
          
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #bca88d',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                color: '#3e3f29',
                cursor: 'pointer'
              }}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#3e3f29' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Product
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Category
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Price
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Stock
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#f1f0e4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#7d8d86' }}>
                    <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p style={{ fontSize: '16px', margin: 0 }}>No products found</p>
                    <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>Add your first product to get started!</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.reorder_level)
                  return (
                    <tr key={product.product_id} style={{ 
                      borderBottom: '1px solid rgba(125, 141, 134, 0.1)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.background = 'rgba(125, 141, 134, 0.05)'}
                    onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              onClick={() => product.image_url && openFullSizeImage(product.image_url)}
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #bca88d',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                (e.target as HTMLImageElement).style.transform = 'scale(1.05)'
                                (e.target as HTMLImageElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                                setLilyMessage("Click on the image to see it in full size! This helps you get a better look at the product.")
                                setShowLilyMessage(true)
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLImageElement).style.transform = 'scale(1)'
                                (e.target as HTMLImageElement).style.boxShadow = 'none'
                                setShowLilyMessage(false)
                              }}
                            />
                          )}
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                              {highlightSizeKeywords(product.name)}
                            </p>
                            <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>
                              ID: {product.product_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: '#f3f4f6',
                          color: getCategoryColor(product.category),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: `1px solid ${getCategoryColor(product.category)}`
                        }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                          {product.is_weighted && product.price_per_unit && product.weight_unit ? (
                            `€${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
                          ) : (
                            `€${product.price.toFixed(2)}`
                          )}
                        </p>
                        {product.is_weighted && (
                          <p style={{ fontSize: '12px', color: '#7d8d86', margin: '4px 0 0 0' }}>
                            Sold by weight
                          </p>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                          {product.stock_quantity}
                        </p>
                        <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>
                          Reorder: {product.reorder_level}
                        </p>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: stockStatus.bgColor,
                          color: stockStatus.textColor,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {stockStatus.status === 'good' ? 'In Stock' : 
                           stockStatus.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {hasPermission('canManageProducts') && (
                            <button
                              onClick={() => startEditProduct(product)}
                              style={{
                                background: '#7d8d86',
                                color: '#f1f0e4',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#bca88d'
                                setLilyMessage(`Click to edit "${product.name}". You can update the price, stock quantity, reorder level, and other details!`)
                                setShowLilyMessage(true)
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = '#7d8d86'
                                setShowLilyMessage(false)
                              }}
                            >
                              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }}></i>
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => setProductToDelete(product)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                            onMouseLeave={(e) => e.target.style.background = '#ef4444'}
                          >
                            <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      <div style={{ 
        marginTop: '16px', 
        fontSize: '14px', 
        color: '#7d8d86',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        {totalProducts > 0 ? (
          <>
            Showing {startItem}-{endItem} of {totalProducts} products
            {totalPages > 1 && (
              <span style={{ marginLeft: '16px' }}>
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </>
        ) : (
          'No products found'
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
          border: '1px solid rgba(125, 141, 134, 0.2)'
        }}>
          {/* Items per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#3e3f29', fontWeight: '500' }}>
              Show:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              style={{
                padding: '6px 12px',
                border: '1px solid #bca88d',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                color: '#3e3f29',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span style={{ fontSize: '14px', color: '#7d8d86' }}>per page</span>
          </div>

          {/* Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #bca88d',
                borderRadius: '6px',
                background: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#3e3f29',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  (e.target as HTMLButtonElement).style.background = 'white'
                }
              }}
            >
              <i className="fa-solid fa-chevron-left" style={{ marginRight: '4px' }}></i>
              Previous
            </button>

            {/* Page numbers */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '6px',
                      background: currentPage === pageNum ? '#7d8d86' : 'white',
                      color: currentPage === pageNum ? '#f1f0e4' : '#3e3f29',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: currentPage === pageNum ? '600' : '400',
                      transition: 'all 0.2s ease',
                      minWidth: '40px'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== pageNum) {
                        (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== pageNum) {
                        (e.target as HTMLButtonElement).style.background = 'white'
                      }
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #bca88d',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#f3f4f6' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : '#3e3f29',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  (e.target as HTMLButtonElement).style.background = 'white'
                }
              }}
            >
              Next
              <i className="fa-solid fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
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
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                Add New Product
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#7d8d86',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { 
                  e.target.style.background = '#f3f4f6'; 
                  e.target.style.color = '#3e3f29';
                  setLilyMessage("Click this X button to close the form without saving. It's the same as clicking Cancel!")
                  setShowLilyMessage(true)
                }}
                onMouseLeave={(e) => { 
                  e.target.style.background = 'none'; 
                  e.target.style.color = '#7d8d86';
                  setShowLilyMessage(false)
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({...newProduct, category: e.target.value})
                        setShowCategorySuggestions(e.target.value.length >= 2)
                      }}
                      onFocus={() => {
                        setShowCategorySuggestions(newProduct.category.length >= 2)
                        setLilyMessage("Start typing a category name and I'll suggest similar ones you've used before! This helps keep your categories consistent.")
                        setShowLilyMessage(true)
                      }}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #bca88d',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        color: '#3e3f29'
                      }}
                      placeholder="e.g., Grains, Spices, Beverages"
                    />
                    
                    {/* Category Suggestions */}
                    {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #bca88d',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setNewProduct({...newProduct, category: suggestion})
                              setShowCategorySuggestions(false)
                              setLilyMessage(`Great choice! I've selected "${suggestion}" for you. This helps keep your categories organized!`)
                              setShowLilyMessage(true)
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#3e3f29',
                              borderBottom: index < getCategorySuggestions(newProduct.category).length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#7d8d86', fontSize: '12px' }}></i>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight Configuration Section */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="is_weighted"
                    checked={newProduct.is_weighted}
                    onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_weighted" style={{ fontSize: '14px', fontWeight: '500', color: '#3e3f29', cursor: 'pointer' }}>
                    This product is sold by weight (e.g., fruits, vegetables, meat)
                  </label>
                </div>
                
                {newProduct.is_weighted && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Weight Unit *
                      </label>
                      <select
                        value={newProduct.weight_unit}
                        onChange={(e) => setNewProduct({...newProduct, weight_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          color: '#3e3f29'
                        }}
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Price per {newProduct.weight_unit || 'unit'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={newProduct.is_weighted}
                        value={newProduct.price_per_unit}
                        onChange={(e) => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          color: '#3e3f29'
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Price {newProduct.is_weighted ? '(Auto-set to 0 for weighted items)' : '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!newProduct.is_weighted}
                    value={newProduct.is_weighted ? '0' : newProduct.price}
                    onChange={(e) => {
                      if (!newProduct.is_weighted) {
                        setNewProduct({...newProduct, price: e.target.value})
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: newProduct.is_weighted ? '#f9fafb' : 'white',
                      color: newProduct.is_weighted ? '#6b7280' : '#3e3f29',
                      cursor: newProduct.is_weighted ? 'not-allowed' : 'text'
                    }}
                    placeholder={newProduct.is_weighted ? "0.00 (auto-set for weighted items)" : "0.00"}
                    disabled={newProduct.is_weighted}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({...newProduct, reorder_level: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.tax_rate}
                    onChange={(e) => setNewProduct({...newProduct, tax_rate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Supplier Information
                </label>
                <input
                  type="text"
                  value={newProduct.supplier_info}
                  onChange={(e) => setNewProduct({...newProduct, supplier_info: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29'
                  }}
                  placeholder="e.g., African Foods Ltd, +234-xxx-xxxx"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  SKU (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29'
                  }}
                  placeholder="Leave empty for auto-generation"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Product Image
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      padding: '10px 16px',
                      border: '2px dashed #bca88d',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#7d8d86',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      minWidth: '120px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                      e.target.style.color = '#3e3f29'
                      setLilyMessage("Click here to upload a product image! This helps customers see what they're buying.")
                      setShowLilyMessage(true)
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#bca88d'
                      e.target.style.color = '#7d8d86'
                      setShowLilyMessage(false)
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i>
                    Choose Image
                  </label>
                  {(imagePreview || editingProduct?.image_url) && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={imagePreview || editingProduct?.image_url}
                        alt="Preview"
                        onClick={() => openFullSizeImage(imagePreview || editingProduct?.image_url)}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #bca88d',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)'
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29',
                    resize: 'vertical'
                  }}
                  placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#f3f4f6',
                    color: '#3e3f29',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb'
                    setLilyMessage("This will close the form and clear all the information you've entered. Don't worry, you can always start over!")
                    setShowLilyMessage(true)
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6'
                    setShowLilyMessage(false)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : '#7d8d86',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      setLilyMessage("This will save your new product to the inventory! Make sure all required fields are filled out before clicking.")
                      setShowLilyMessage(true)
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      setShowLilyMessage(false)
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus"></i>
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                Edit Product
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#7d8d86',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { 
                  e.target.style.background = '#f3f4f6'; 
                  e.target.style.color = '#3e3f29';
                  setLilyMessage("Click this X button to close the edit form without saving. It's the same as clicking Cancel!")
                  setShowLilyMessage(true)
                }}
                onMouseLeave={(e) => { 
                  e.target.style.background = 'none'; 
                  e.target.style.color = '#7d8d86';
                  setShowLilyMessage(false)
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleEditProduct}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({...newProduct, category: e.target.value})
                        setShowCategorySuggestions(e.target.value.length >= 2)
                      }}
                      onFocus={() => {
                        setShowCategorySuggestions(newProduct.category.length >= 2)
                        setLilyMessage("Start typing a category name and I'll suggest similar ones you've used before! This helps keep your categories consistent.")
                        setShowLilyMessage(true)
                      }}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #bca88d',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        color: '#3e3f29'
                      }}
                      placeholder="e.g., Grains, Spices, Beverages"
                    />
                    
                    {/* Category Suggestions */}
                    {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #bca88d',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setNewProduct({...newProduct, category: suggestion})
                              setShowCategorySuggestions(false)
                              setLilyMessage(`Great choice! I've selected "${suggestion}" for you. This helps keep your categories organized!`)
                              setShowLilyMessage(true)
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#3e3f29',
                              borderBottom: index < getCategorySuggestions(newProduct.category).length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#7d8d86', fontSize: '12px' }}></i>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight Configuration Section */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="is_weighted_edit"
                    checked={newProduct.is_weighted}
                    onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_weighted_edit" style={{ fontSize: '14px', fontWeight: '500', color: '#3e3f29', cursor: 'pointer' }}>
                    This product is sold by weight (e.g., fruits, vegetables, meat)
                  </label>
                </div>
                
                {newProduct.is_weighted && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Weight Unit *
                      </label>
                      <select
                        value={newProduct.weight_unit}
                        onChange={(e) => setNewProduct({...newProduct, weight_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          color: '#3e3f29'
                        }}
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Price per {newProduct.weight_unit || 'unit'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={newProduct.is_weighted}
                        value={newProduct.price_per_unit}
                        onChange={(e) => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          color: '#3e3f29'
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Price {newProduct.is_weighted ? '(Auto-set to 0 for weighted items)' : '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!newProduct.is_weighted}
                    value={newProduct.is_weighted ? '0' : newProduct.price}
                    onChange={(e) => {
                      if (!newProduct.is_weighted) {
                        setNewProduct({...newProduct, price: e.target.value})
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: newProduct.is_weighted ? '#f9fafb' : 'white',
                      color: newProduct.is_weighted ? '#6b7280' : '#3e3f29',
                      cursor: newProduct.is_weighted ? 'not-allowed' : 'text'
                    }}
                    placeholder={newProduct.is_weighted ? "0.00 (auto-set for weighted items)" : "0.00"}
                    disabled={newProduct.is_weighted}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({...newProduct, reorder_level: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.tax_rate}
                    onChange={(e) => setNewProduct({...newProduct, tax_rate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      color: '#3e3f29'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Supplier Information
                </label>
                <input
                  type="text"
                  value={newProduct.supplier_info}
                  onChange={(e) => setNewProduct({...newProduct, supplier_info: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29'
                  }}
                  placeholder="e.g., African Foods Ltd, +234-xxx-xxxx"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Product Image
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      padding: '10px 16px',
                      border: '2px dashed #bca88d',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#7d8d86',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      minWidth: '120px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                      e.target.style.color = '#3e3f29'
                      setLilyMessage("Click here to upload a product image! This helps customers see what they're buying.")
                      setShowLilyMessage(true)
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#bca88d'
                      e.target.style.color = '#7d8d86'
                      setShowLilyMessage(false)
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i>
                    Choose Image
                  </label>
                  {(imagePreview || editingProduct?.image_url) && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={imagePreview || editingProduct?.image_url}
                        alt="Preview"
                        onClick={() => openFullSizeImage(imagePreview || editingProduct?.image_url)}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #bca88d',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)'
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#3e3f29',
                    resize: 'vertical'
                  }}
                  placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#f3f4f6',
                    color: '#3e3f29',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb'
                    setLilyMessage("This will close the edit form and discard any changes you've made. Don't worry, you can always edit again!")
                    setShowLilyMessage(true)
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6'
                    setShowLilyMessage(false)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : '#7d8d86',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      setLilyMessage("This will save your changes to the product! Make sure all required fields are filled out before clicking.")
                      setShowLilyMessage(true)
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      setShowLilyMessage(false)
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i>
                      Update Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {showImageModal && fullSizeImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={closeImageModal}
        >
          <div style={{
            position: 'relative',
            width: '400px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${fullSizeImage})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            backgroundColor: '#ffffff'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImageModal}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                color: '#3e3f29',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.9)'}
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Delete Product
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#1a1a1a',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Are you sure you want to delete <strong>{productToDelete.name}</strong>?
            </p>
            <p style={{
              fontSize: '14px',
              color: '#ef4444',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setProductToDelete(null)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#4b5563'}
                onMouseLeave={(e) => e.target.style.background = '#6b7280'}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(productToDelete.product_id)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lily Mascot */}
      <LilyMascot />
    </div>
  )
}

export default Products