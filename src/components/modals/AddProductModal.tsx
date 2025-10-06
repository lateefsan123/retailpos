import React, { useState } from 'react'
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

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded: (product: Product) => void
  categories: string[]
  onCategoryAdded?: (category: string) => void
}

async function uploadProductImage(file: File, productId: string, businessId: number | null) {
  if (businessId == null) {
    throw new Error('Business ID is required for image upload')
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}.${fileExt}`
    const filePath = `product-images/${businessId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  categories,
  onCategoryAdded
}) => {
  const { user } = useAuth()
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { suppliers } = useSuppliers(businessId, selectedBranchId)

  const [newProduct, setNewProduct] = useState({
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

  const resetForm = () => {
    setNewProduct({
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

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!businessId) {
        throw new Error('Business ID is required')
      }

      const productData = {
        business_id: businessId,
        branch_id: selectedBranchId,
        name: newProduct.product_name,
        category: newProduct.category,
        price: parseFloat(newProduct.price.toString()),
        stock_quantity: parseInt(newProduct.stock_quantity.toString()),
        reorder_level: parseInt(newProduct.reorder_level.toString()),
        tax_rate: parseFloat(newProduct.tax_rate.toString()),
        supplier_id: newProduct.supplier_id || null,
        supplier_info: newProduct.supplier_info,
        sku: newProduct.sku || null,
        barcode: newProduct.barcode || null,
        description: newProduct.description,
        is_weighted: newProduct.is_weighted,
        weight_unit: newProduct.is_weighted ? newProduct.weight_unit : null,
        price_per_unit: newProduct.is_weighted ? parseFloat(newProduct.price_per_unit.toString()) : null
      }

      const { data, error: insertError } = await supabase
        .from('products')
        .insert([productData])
        .select()

      if (insertError) {
        throw insertError
      }

      const insertedProduct = data?.[0]
      if (!insertedProduct) {
        throw new Error('Failed to create product')
      }

      // Upload image if selected
      if (selectedImage && insertedProduct.product_id) {
        try {
          const imageUrl = await uploadProductImage(selectedImage, insertedProduct.product_id, businessId)
          const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('product_id', insertedProduct.product_id)

          if (updateError) {
            console.error('Error updating product with image URL:', updateError)
          } else {
            insertedProduct.image_url = imageUrl
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError)
        }
      }

      // Add category to list if it's new
      if (onCategoryAdded && !categories.includes(newProduct.category)) {
        onCategoryAdded(newProduct.category)
      }

      onProductAdded(insertedProduct)
      handleClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add product'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New Product</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
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
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                  className={styles.formInput}
                  placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Category *
                </label>
                <div className={styles.categoryInputContainer}>
                  <input
                    type="text"
                    required
                    value={newProduct.category}
                    onChange={(e) => {
                      setNewProduct({...newProduct, category: e.target.value})
                      setShowCategorySuggestions(e.target.value.length >= 2)
                    }}
                    onFocus={() => setShowCategorySuggestions(newProduct.category.length >= 2)}
                    onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                    className={styles.formInput}
                    placeholder="e.g., Grains, Spices, Beverages"
                  />
                  
                  {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
                    <div className={styles.categorySuggestions}>
                      {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setNewProduct({...newProduct, category: suggestion})
                            setShowCategorySuggestions(false)
                          }}
                          className={styles.categorySuggestion}
                        >
                          <i className={`fa-solid fa-tag ${styles.categorySuggestionIcon}`}></i>
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Weight Configuration Section */}
            <div className={styles.weightSection}>
              <div className={styles.weightHeader}>
                <input
                  type="checkbox"
                  id="is_weighted"
                  checked={newProduct.is_weighted}
                  onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
                  className={styles.weightCheckbox}
                />
                <label htmlFor="is_weighted" className={styles.weightLabel}>
                  This product is sold by weight (e.g., fruits, vegetables, meat)
                </label>
              </div>
              
              {newProduct.is_weighted && (
                <div className={styles.weightGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Weight Unit *
                    </label>
                    <select
                      value={newProduct.weight_unit}
                      onChange={(e) => setNewProduct({...newProduct, weight_unit: e.target.value})}
                      className={styles.formSelect}
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="g">Grams (g)</option>
                      <option value="lb">Pounds (lb)</option>
                      <option value="oz">Ounces (oz)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Price per {newProduct.weight_unit} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newProduct.price_per_unit}
                      onChange={(e) => setNewProduct({...newProduct, price_per_unit: parseFloat(e.target.value)})}
                      className={styles.formInput}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
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
                  min="0"
                  required
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value)})}
                  className={styles.formInput}
                  placeholder="100"
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Reorder Level *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newProduct.reorder_level}
                  onChange={(e) => setNewProduct({...newProduct, reorder_level: parseInt(e.target.value)})}
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
                  value={newProduct.tax_rate}
                  onChange={(e) => setNewProduct({...newProduct, tax_rate: parseFloat(e.target.value)})}
                  className={styles.formInput}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Supplier
                </label>
                <select
                  value={newProduct.supplier_id}
                  onChange={(e) => setNewProduct({...newProduct, supplier_id: e.target.value})}
                  className={styles.formSelect}
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Supplier Information (Legacy)
                </label>
                <input
                  type="text"
                  value={newProduct.supplier_info}
                  onChange={(e) => setNewProduct({...newProduct, supplier_info: e.target.value})}
                  className={styles.formInput}
                  placeholder="Legacy supplier info (optional)"
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  SKU (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  className={styles.formInput}
                  placeholder="Leave empty for auto-generation"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Barcode
                </label>
                <input
                  type="text"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  className={styles.formInput}
                  placeholder="Scan or enter barcode"
                />
              </div>
            </div>

            <div className={styles.imageUploadSection}>
              <label className={styles.formLabel}>
                Product Image
              </label>
              {imagePreview ? (
                <div className={styles.imagePreviewContainer}>
                  <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                  <button
                    type="button"
                    onClick={removeImage}
                    className={styles.removeImageButton}
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
              ) : (
                <label className={styles.imageUploadButton}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <i className={`fa-solid fa-camera ${styles.imageUploadIcon}`}></i>
                  Choose Image
                </label>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Description
              </label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className={styles.formTextarea}
                placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                rows={3}
              />
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
                type="submit"
                disabled={loading}
                className={styles.addButton}
              >
                <i className={`fa-solid fa-plus ${styles.addButtonIcon}`}></i>
                {loading ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddProductModal
