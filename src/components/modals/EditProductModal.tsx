import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useBusinessId } from '../../hooks/useBusinessId'
import { useBranch } from '../../contexts/BranchContext'
import { useSuppliers } from '../../hooks/useSuppliers'
import styles from './AddProductModal.module.css'

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
  weight_unit?: string | null
  price_per_unit?: number | null
  is_weighted?: boolean
  description?: string
  sku?: string
  barcode?: string | null
  sales_count?: number
  total_revenue?: number
  last_sold_date?: string
}

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductUpdated: (product: Product) => void
  editingProduct: Product | null
  categories: string[]
  onCategoryAdded?: (category: string) => void
}

async function uploadProductImage(file: File, productId: string, businessId: number | null, branchId: number | null) {
  if (businessId == null || branchId == null) {
    throw new Error('Business ID and Branch ID are required for image upload')
  }

  try {
    // Create a unique filename with multi-tenant path structure
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}-${Date.now()}.${fileExt}`
    const filePath = `product-images/${businessId}/${branchId}/${fileName}`

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, file)

    if (error) {
      console.error('Upload error:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      })
      throw error
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading product image:', error)
    throw error
  }
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  editingProduct,
  categories,
  onCategoryAdded
}) => {
  const { user } = useAuth()
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { suppliers } = useSuppliers(businessId, selectedBranchId)

  const [editProduct, setEditProduct] = useState({
    product_name: '',
    category: '',
    price: 0,
    stock_quantity: 100,
    reorder_level: 10,
    tax_rate: 0,
    supplier_id: '',
    supplier_info: '',
    sku: '',
    barcode: '',
    description: '',
    is_weighted: false,
    weight_unit: 'kg',
    price_per_unit: 0
  })

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)

  // Initialize form with editing product data
  useEffect(() => {
    if (editingProduct) {
      setEditProduct({
        product_name: editingProduct.name || '',
        category: editingProduct.category || '',
        price: editingProduct.price || 0,
        stock_quantity: editingProduct.stock_quantity || 100,
        reorder_level: editingProduct.reorder_level || 10,
        tax_rate: editingProduct.tax_rate || 0,
        supplier_id: editingProduct.supplier_info || '',
        supplier_info: editingProduct.supplier_info || '',
        sku: editingProduct.sku || '',
        barcode: editingProduct.barcode || '',
        description: editingProduct.description || '',
        is_weighted: editingProduct.is_weighted || false,
        weight_unit: editingProduct.weight_unit || 'kg',
        price_per_unit: editingProduct.price_per_unit || 0
      })
      setImagePreview(editingProduct.image_url || null)
    }
  }, [editingProduct])

  const resetForm = () => {
    setEditProduct({
      product_name: '',
      category: '',
      price: 0,
      stock_quantity: 100,
      reorder_level: 10,
      tax_rate: 0,
      supplier_id: '',
      supplier_info: '',
      sku: '',
      barcode: '',
      description: '',
      is_weighted: false,
      weight_unit: 'kg',
      price_per_unit: 0
    })
    setError(null)
    setSelectedImage(null)
    setImagePreview(null)
    setShowCategorySuggestions(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getCategorySuggestions = (input: string) => {
    if (!input || input.length < 2) return []
    
    const suggestions = categories
      .filter(category => 
        category.toLowerCase().includes(input.toLowerCase()) && 
        category.toLowerCase() !== input.toLowerCase()
      )
      .sort()
    
    return suggestions.slice(0, 5)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !user || !businessId || !selectedBranchId) return

    setLoading(true)
    setError(null)

    try {
      let imageUrl = editingProduct.image_url

      // Upload new image if selected
      if (selectedImage) {
        imageUrl = await uploadProductImage(selectedImage, editingProduct.product_id, businessId, selectedBranchId)
      }

      // Update product in database
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: editProduct.product_name,
          category: editProduct.category,
          price: editProduct.price,
          stock_quantity: editProduct.stock_quantity,
          reorder_level: editProduct.reorder_level,
          tax_rate: editProduct.tax_rate,
          supplier_info: editProduct.supplier_info,
          sku: editProduct.sku,
          barcode: editProduct.barcode,
          description: editProduct.description,
          is_weighted: editProduct.is_weighted,
          weight_unit: editProduct.weight_unit,
          price_per_unit: editProduct.price_per_unit,
          image_url: imageUrl,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', editingProduct.product_id)
        .eq('business_id', businessId)
        .eq('branch_id', selectedBranchId)

      if (updateError) {
        throw updateError
      }

      // Call the callback with updated product
      onProductUpdated({
        ...editingProduct,
        name: editProduct.product_name,
        category: editProduct.category,
        price: editProduct.price,
        stock_quantity: editProduct.stock_quantity,
        reorder_level: editProduct.reorder_level,
        tax_rate: editProduct.tax_rate,
        supplier_info: editProduct.supplier_info,
        sku: editProduct.sku,
        barcode: editProduct.barcode,
        description: editProduct.description,
        is_weighted: editProduct.is_weighted,
        weight_unit: editProduct.weight_unit,
        price_per_unit: editProduct.price_per_unit,
        image_url: imageUrl,
        last_updated: new Date().toISOString()
      })

      handleClose()
    } catch (error: any) {
      console.error('Error updating product:', error)
      setError(error.message || 'Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Product</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formContent}>
            <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editProduct.product_name}
                  onChange={(e) => setEditProduct({...editProduct, product_name: e.target.value})}
                  className={styles.formInput}
                  placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Category *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={editProduct.category}
                    onChange={(e) => {
                      setEditProduct({...editProduct, category: e.target.value})
                      setShowCategorySuggestions(true)
                    }}
                    onFocus={() => setShowCategorySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                    className={styles.formInput}
                    placeholder="e.g., Food & Beverages"
                  />
                  
                  {showCategorySuggestions && getCategorySuggestions(editProduct.category).length > 0 && (
                    <div className={styles.suggestions}>
                      {getCategorySuggestions(editProduct.category).map((suggestion, index) => (
                        <div
                          key={index}
                          className={styles.suggestionItem}
                          onClick={() => {
                            setEditProduct({...editProduct, category: suggestion})
                            setShowCategorySuggestions(false)
                          }}
                          onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                          onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                        >
                          <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#7d8d86', fontSize: '12px' }}></i>
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Price (€) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={editProduct.price}
                  onChange={(e) => setEditProduct({...editProduct, price: parseFloat(e.target.value) || 0})}
                  className={styles.formInput}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editProduct.stock_quantity}
                  onChange={(e) => setEditProduct({...editProduct, stock_quantity: parseInt(e.target.value) || 0})}
                  className={styles.formInput}
                  placeholder="100"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={editProduct.reorder_level}
                  onChange={(e) => setEditProduct({...editProduct, reorder_level: parseInt(e.target.value) || 0})}
                  className={styles.formInput}
                  placeholder="10"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editProduct.tax_rate}
                  onChange={(e) => setEditProduct({...editProduct, tax_rate: parseFloat(e.target.value) || 0})}
                  className={styles.formInput}
                  placeholder="0.00"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  SKU
                </label>
                <input
                  type="text"
                  value={editProduct.sku}
                  onChange={(e) => setEditProduct({...editProduct, sku: e.target.value})}
                  className={styles.formInput}
                  placeholder="Product SKU"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Barcode
                </label>
                <input
                  type="text"
                  value={editProduct.barcode}
                  onChange={(e) => setEditProduct({...editProduct, barcode: e.target.value})}
                  className={styles.formInput}
                  placeholder="Product barcode"
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  value={editProduct.description}
                  onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                  className={styles.formInput}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel}>
                  Product Image
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '120px',
                        height: '120px',
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: '#f9fafb',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#7d8d86'
                        e.target.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.backgroundColor = '#f9fafb'
                      }}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '6px'
                          }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6b7280' }}>
                          <i className="fa-solid fa-camera" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                          <div style={{ fontSize: '12px' }}>Upload Image</div>
                        </div>
                      )}
                    </label>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>
                      Upload a product image to help customers identify your items. 
                      Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editProduct.is_weighted}
                    onChange={(e) => setEditProduct({...editProduct, is_weighted: e.target.checked})}
                    className={styles.weightCheckbox}
                  />
                  <span className={styles.formLabel} style={{ margin: 0 }}>
                    This is a weighted item (sold by weight)
                  </span>
                </label>
              </div>

              {editProduct.is_weighted && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Weight Unit
                    </label>
                    <select
                      value={editProduct.weight_unit}
                      onChange={(e) => setEditProduct({...editProduct, weight_unit: e.target.value})}
                      className={styles.formInput}
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="g">Grams (g)</option>
                      <option value="lb">Pounds (lb)</option>
                      <option value="oz">Ounces (oz)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Price per Unit (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editProduct.price_per_unit}
                      onChange={(e) => setEditProduct({...editProduct, price_per_unit: parseFloat(e.target.value) || 0})}
                      className={styles.formInput}
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}
            </div>

          </form>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            className={styles.submitButton}
            onClick={handleSubmit}
          >
            {loading ? 'Updating...' : 'Update Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProductModal
