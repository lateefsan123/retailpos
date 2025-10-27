import React, { useState } from 'react';
import { X, User, Phone, Package, Scale, Check, ShoppingBag } from 'lucide-react';
import { CustomerOrder, ShoppingListItem } from '../../types/multitenant';
import { formatCurrency } from '../../utils/currency';

interface ClickAndCollectOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomerOrder | null;
  onMarkAsCollected: (customerId: number) => Promise<void>;
  loading?: boolean;
}

const ClickAndCollectOrderModal: React.FC<ClickAndCollectOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onMarkAsCollected,
  loading = false
}) => {
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAsCollected = async () => {
    if (!order) return;
    
    try {
      setIsMarking(true);
      await onMarkAsCollected(order.customer_id);
      onClose();
    } catch (error) {
      console.error('Error marking order as collected:', error);
    } finally {
      setIsMarking(false);
    }
  };

  if (!isOpen || !order) return null;

  const getItemDisplayName = (item: ShoppingListItem) => {
    if (item.products) {
      return item.products.name;
    }
    return item.text;
  };

  const getItemImage = (item: ShoppingListItem) => {
    if (item.products?.image_url) {
      return item.products.image_url;
    }
    return null;
  };

  const getItemPrice = (item: ShoppingListItem) => {
    if (item.calculated_price) {
      return item.calculated_price;
    }
    if (item.products?.price) {
      return item.products.price * (item.quantity || 1);
    }
    return null;
  };

  const getItemDetails = (item: ShoppingListItem) => {
    if (item.products?.is_weighted && item.weight) {
      return `${item.weight} ${item.products.weight_unit || 'lbs'}`;
    }
    if (item.quantity) {
      return `Qty: ${item.quantity}`;
    }
    return '';
  };

  const totalValue = order.items.reduce((sum, item) => {
    const price = getItemPrice(item);
    return sum + (price || 0);
  }, 0);

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
        maxWidth: '600px',
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
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb'
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
            <ShoppingBag style={{ width: '1.5rem', height: '1.5rem', color: '#3b82f6' }} />
            Click & Collect Order
          </h2>
          <button
            onClick={onClose}
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

        {/* Customer Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.25rem',
            fontWeight: '600',
            flexShrink: 0
          }}>
            {order.customer_icon ? (
              <img
                src={order.customer_icon}
                alt={order.customer_name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <User style={{ width: '1.5rem', height: '1.5rem' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 0.25rem 0'
            }}>
              {order.customer_name}
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <Phone style={{ width: '1rem', height: '1rem' }} />
              {order.customer_phone}
            </div>
          </div>
          <div style={{
            textAlign: 'right',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <div>{order.total_items} items</div>
            <div style={{ fontWeight: '600', color: '#1f2937' }}>
              {formatCurrency(totalValue)}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0 0 1rem 0'
          }}>
            Order Items
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.items.map((item) => (
              <div
                key={item.list_item_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s'
                }}
              >
                {/* Item Image */}
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {getItemImage(item) ? (
                    <img
                      src={getItemImage(item)!}
                      alt={getItemDisplayName(item)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Package style={{ width: '1.5rem', height: '1.5rem', color: '#9ca3af' }} />
                  )}
                </div>

                {/* Item Details */}
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0 0 0.25rem 0'
                  }}>
                    {getItemDisplayName(item)}
                  </h4>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {item.products?.is_weighted ? (
                      <Scale style={{ width: '0.75rem', height: '0.75rem' }} />
                    ) : (
                      <Package style={{ width: '0.75rem', height: '0.75rem' }} />
                    )}
                    {getItemDetails(item)}
                  </div>
                </div>

                {/* Item Price */}
                <div style={{
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {getItemPrice(item) ? formatCurrency(getItemPrice(item)!) : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
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
            Close
          </button>
          <button
            onClick={handleMarkAsCollected}
            disabled={isMarking || loading}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              backgroundColor: isMarking || loading ? '#9ca3af' : '#10b981',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isMarking || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!isMarking && !loading) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMarking && !loading) {
                e.currentTarget.style.backgroundColor = '#10b981';
              }
            }}
          >
            <Check style={{ width: '1rem', height: '1rem' }} />
            {isMarking ? 'Marking...' : 'Mark as Collected'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClickAndCollectOrderModal;
