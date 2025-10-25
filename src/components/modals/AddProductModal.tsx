import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useBusinessId } from '../../hooks/useBusinessId'
import { useBranch } from '../../contexts/BranchContext'
import { useSuppliers } from '../../hooks/useSuppliers'
import styles from './AddProductModal.module.css'
import { ProductVariation } from '../../types/productVariation'

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
  variations?: ProductVariation[] | null
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded: (product: Product) => void
  categories: string[]
  onCategoryAdded?: (category: string) => void
}

interface ProductVariationForm {
  id: string
  label: string
  price: string
  sku: string
  barcode: string
}

async function uploadProductImage(file: File, productId: string, businessId: number | null, branchId: number | null) {
  if (businessId == null || branchId == null) {
    throw new Error('Business ID and Branch ID are required for image upload')
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}.${fileExt}`
    const filePath = `product-images/${businessId}/${branchId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      })
      throw uploadError
    }

    const { data } = supabase.storage
      .from('products')
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
  const [hasFormChanged, setHasFormChanged] = useState(false)
  const [variationsEnabled, setVariationsEnabled] = useState(false)
  const [variationForms, setVariationForms] = useState<ProductVariationForm[]>([])

  const generateVariationId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return Math.random().toString(36).slice(2, 10)
  }

  const createEmptyVariation = (): ProductVariationForm => ({
    id: generateVariationId(),
    label: '',
    price: '',
    sku: '',
    barcode: ''
  })

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
  setVariationsEnabled(false)
  setVariationForms([])
  setError(null)
  setSelectedImage(null)
  setImagePreview(null)
  setShowCategorySuggestions(false)
  setHasFormChanged(false)
}

  const handleToggleVariations = (checked: boolean) => {
    setVariationsEnabled(checked)
    setHasFormChanged(true)
    if (checked && variationForms.length === 0) {
      setVariationForms([createEmptyVariation()])
    }
  }

  const handleAddVariation = () => {
    setVariationForms(prev => [...prev, createEmptyVariation()])
    setHasFormChanged(true)
  }

  const handleVariationChange = <T extends keyof ProductVariationForm>(id: string, field: T, value: ProductVariationForm[T]) => {
    setVariationForms(prev =>
      prev.map(variation =>
        variation.id === id ? { ...variation, [field]: value } : variation
      )
    )
    setHasFormChanged(true)
  }

  const handleRemoveVariation = (id: string) => {
    setVariationForms(prev => prev.filter(variation => variation.id !== id))
    setHasFormChanged(true)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleInputChange = (field: string, value: any) => {
    setNewProduct(prev => ({ ...prev, [field]: value }))
    setHasFormChanged(true)
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
      setHasFormChanged(true)
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
    setHasFormChanged(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!businessId) {
        throw new Error('Business ID is required')
      }

      // Generate a unique product ID
      const productId = crypto.randomUUID()

      const sanitizedVariations = variationsEnabled
        ? variationForms
            .map(({ label, price, sku, barcode }) => ({
              label: label.trim(),
              price: parseFloat(price),
              sku: sku.trim() || null,
              barcode: barcode.trim() || null
            }))
            .filter(
              variation =>
                variation.label.length > 0 &&
                Number.isFinite(variation.price) &&
                variation.price >= 0
            )
        : []

      const productData = {
        product_id: productId,
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
        price_per_unit: newProduct.is_weighted ? parseFloat(newProduct.price_per_unit.toString()) : null,
        last_updated: new Date().toISOString(),
        sales_count: 0,
        total_revenue: 0,
        variations: sanitizedVariations.length > 0 ? sanitizedVariations : null
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

      insertedProduct.variations = sanitizedVariations.length > 0 ? sanitizedVariations : null

      // Upload image if selected
      if (selectedImage && insertedProduct.product_id) {
        try {
          const imageUrl = await uploadProductImage(selectedImage, insertedProduct.product_id, businessId, selectedBranchId)
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
                  value={newProduct.product_name}
                  onChange={(e) => handleInputChange('product_name', e.target.value)}
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
                      handleInputChange('category', e.target.value)
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
                  onChange={(e) => handleInputChange('is_weighted', e.target.checked)}
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
                      onChange={(e) => handleInputChange('weight_unit', e.target.value)}
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
                      onChange={(e) => handleInputChange('price_per_unit', parseFloat(e.target.value))}
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
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
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
                  onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value))}
                  className={styles.formInput}
                  placeholder="100"
                />
            </div>
          </div>

            <div className={styles.variationsSection}>
              <div className={styles.variationsHeader}>
                <div>
                  <p className={styles.variationsTitle}>Product Variations</p>
                  <p className={styles.variationsDescription}>
                    Define alternate pack sizes like "Full Box" or "Half Box" with their own pricing.
                  </p>
                </div>
                <label className={styles.variationsToggle}>
                  <input
                    type="checkbox"
                    checked={variationsEnabled}
                    onChange={(e) => handleToggleVariations(e.target.checked)}
                  />
                  <span>Enable variations</span>
                </label>
              </div>

              {variationsEnabled ? (
                <>
                  {variationForms.length > 0 ? (
                    <div className={styles.variationList}>
                      {variationForms.map((variation) => (
                        <div key={variation.id} className={styles.variationRow}>
                          <div className={styles.variationField}>
                            <label className={styles.formLabel}>Label</label>
                            <input
                              type="text"
                              value={variation.label}
                              onChange={(e) => handleVariationChange(variation.id, 'label', e.target.value)}
                              className={styles.formInput}
                              placeholder="e.g., Full Box"
                            />
                          </div>
                          <div className={styles.variationField}>
                            <label className={styles.formLabel}>Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variation.price}
                              onChange={(e) => handleVariationChange(variation.id, 'price', e.target.value)}
                              className={styles.formInput}
                              placeholder="0.00"
                            />
                          </div>
                          <div className={styles.variationField}>
                            <label className={styles.formLabel}>SKU (optional)</label>
                            <input
                              type="text"
                              value={variation.sku}
                              onChange={(e) => handleVariationChange(variation.id, 'sku', e.target.value)}
                              className={styles.formInput}
                              placeholder="Variation SKU"
                            />
                          </div>
                          <div className={styles.variationField}>
                            <label className={styles.formLabel}>Barcode (optional)</label>
                            <input
                              type="text"
                              value={variation.barcode}
                              onChange={(e) => handleVariationChange(variation.id, 'barcode', e.target.value)}
                              className={styles.formInput}
                              placeholder="Scan or enter"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariation(variation.id)}
                            className={styles.removeVariationButton}
                            aria-label="Remove variation"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.variationsEmpty}>
                      <i className="fa-solid fa-layer-group"></i>
                      <span>Add different pack sizes like boxes or bundles to keep pricing organised.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className={styles.addVariationButton}
                  >
                    <i className="fa-solid fa-plus"></i>
                    {variationForms.length > 0 ? 'Add another variation' : 'Add a variation'}
                  </button>
                </>
              ) : (
                <p className={styles.variationsHint}>
                  Toggle this on to capture alternate configurations such as box, half box or bundle pricing.
                </p>
              )}
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
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={styles.formTextarea}
                placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                rows={3}
              />
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
            className={`${styles.addButton} ${hasFormChanged ? styles.active : ''}`}
            onClick={handleSubmit}
          >
            <i className={`fa-solid fa-plus ${styles.addButtonIcon}`}></i>
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddProductModal
