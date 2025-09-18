import React from 'react'

interface NewProduct {
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

interface ProductFormModalProps {
  isOpen: boolean
  isEdit: boolean
  newProduct: NewProduct
  setNewProduct: React.Dispatch<React.SetStateAction<NewProduct>>
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isSubmitting: boolean
  error: string | null
  showCategorySuggestions: boolean
  setShowCategorySuggestions: React.Dispatch<React.SetStateAction<boolean>>
  getCategorySuggestions: (input: string) => string[]
  selectedImage: File | null
  setSelectedImage: React.Dispatch<React.SetStateAction<File | null>>
  imagePreview: string | null
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  editingProduct?: any
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  isEdit,
  newProduct,
  setNewProduct,
  onSubmit,
  onClose,
  isSubmitting,
  error,
  showCategorySuggestions,
  setShowCategorySuggestions,
  getCategorySuggestions,
  selectedImage,
  setSelectedImage,
  imagePreview,
  setImagePreview,
  onImageChange,
  editingProduct
}) => {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#374151'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#6b7280'}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Product Name */}
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
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              placeholder="Enter product name"
            />
          </div>

          {/* Category */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
              Category *
            </label>
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
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              placeholder="Enter category"
            />
            
            {/* Category Suggestions */}
            {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 10,
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setNewProduct({...newProduct, category: suggestion})
                      setShowCategorySuggestions(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#3e3f29',
                      borderBottom: index < getCategorySuggestions(newProduct.category).length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weighted Item Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="is_weighted"
              checked={newProduct.is_weighted}
              onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="is_weighted" style={{ fontSize: '14px', color: '#3e3f29' }}>
              This is a weighted item (sold by weight)
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
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">Select unit</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="oz">Ounces (oz)</option>
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
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Price */}
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
                border: '1px solid #d1d5db',
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

          {/* Stock Quantity and Reorder Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                placeholder="0"
              />
            </div>
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
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                placeholder="0"
              />
            </div>
          </div>

          {/* Tax Rate */}
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
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="0.00"
            />
          </div>

          {/* Supplier Info */}
          <div>
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
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="Enter supplier details"
            />
          </div>

          {/* SKU */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
              SKU
            </label>
            <input
              type="text"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="Enter SKU"
            />
          </div>

          {/* Description */}
          <div>
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
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Enter product description"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            {imagePreview && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#e5e7eb'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#f3f4f6'}
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
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  (e.target as HTMLButtonElement).style.background = '#2563eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  (e.target as HTMLButtonElement).style.background = '#3b82f6'
                }
              }}
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
