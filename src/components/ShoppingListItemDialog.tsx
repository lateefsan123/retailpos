import React, { useState, useEffect } from 'react';
import { X, Package, Scale, Calculator } from 'lucide-react';
import { Product } from '../types/multitenant';

interface ShoppingListItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddItem: (product: Product | null, quantity: number, weight?: number, calculatedPrice?: number, customText?: string) => void;
}

const ShoppingListItemDialog: React.FC<ShoppingListItemDialogProps> = ({
  isOpen,
  onClose,
  product,
  onAddItem
}) => {
  const [quantity, setQuantity] = useState('1');
  const [weight, setWeight] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (isOpen) {
      setQuantity('1');
      setWeight('');
      setCalculatedPrice(null);
      setCustomText('');
    }
  }, [isOpen, product]);

  // Calculate price for weighted products
  useEffect(() => {
    if (product?.is_weighted && product.price_per_unit && weight) {
      const weightValue = parseFloat(weight);
      if (!isNaN(weightValue) && weightValue > 0) {
        const calculated = weightValue * product.price_per_unit;
        setCalculatedPrice(calculated);
      } else {
        setCalculatedPrice(null);
      }
    } else {
      setCalculatedPrice(null);
    }
  }, [product, weight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantityValue = parseInt(quantity);
    const weightValue = product?.is_weighted ? parseFloat(weight) : undefined;

    // Validation for product mode
    if (product) {
      if (isNaN(quantityValue) || quantityValue <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      if (product.is_weighted) {
        if (!weightValue || isNaN(weightValue) || weightValue <= 0) {
          alert('Please enter a valid weight');
          return;
        }
      }
    }

    // Validation for custom text mode
    if (!product && !customText.trim()) {
      alert('Please enter an item name');
      return;
    }

    onAddItem(product, quantityValue, weightValue, calculatedPrice || undefined, customText.trim() || undefined);
    onClose();
  };

  const handleClose = () => {
    setQuantity('1');
    setWeight('');
    setCalculatedPrice(null);
    setCustomText('');
    onClose();
  };

  if (!isOpen) return null;

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
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {product ? (
              product.is_weighted ? (
                <Scale style={{ width: '1.5rem', height: '1.5rem', color: '#3b82f6' }} />
              ) : (
                <Package style={{ width: '1.5rem', height: '1.5rem', color: '#3b82f6' }} />
              )
            ) : (
              <Package style={{ width: '1.5rem', height: '1.5rem', color: '#3b82f6' }} />
            )}
            {product ? 'Add to Shopping List' : 'Add Custom Item'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>

        {/* Product Info or Custom Item Input */}
        {product ? (
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                style={{
                  width: '4rem',
                  height: '4rem',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 0.25rem 0'
              }}>
                {product.name}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0 0 0.5rem 0'
              }}>
                {product.category && `${product.category} • `}
                Stock: {product.stock_quantity}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#059669'
                }}>
                  ${product.price?.toFixed(2)}
                </span>
                {product.is_weighted && product.price_per_unit && (
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    backgroundColor: '#e5e7eb',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem'
                  }}>
                    ${product.price_per_unit.toFixed(2)}/{product.weight_unit || 'lb'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Item Name
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter item name..."
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
              }}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            {product ? (
              product.is_weighted ? (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Weight ({product.weight_unit || 'lbs'})
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter weight"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <Scale style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                </div>
                {calculatedPrice !== null && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #d1fae5',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Calculator style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#065f46',
                      fontWeight: '500'
                    }}>
                      Calculated Price: ${calculatedPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Quantity
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <Package style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                </div>
              </div>
            )
            ) : (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Quantity
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <Package style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              <Package style={{ width: '1rem', height: '1rem' }} />
              Add to List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShoppingListItemDialog;
