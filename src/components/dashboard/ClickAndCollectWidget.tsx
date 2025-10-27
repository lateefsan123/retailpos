import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Package, Eye, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useBusinessId } from '../../hooks/useBusinessId';
import { useBranch } from '../../contexts/BranchContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { CustomerOrder, ShoppingListItem } from '../../types/multitenant';
import ClickAndCollectOrderModal from './ClickAndCollectOrderModal';

const getLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const calculateItemTotal = (item: ShoppingListItem) => {
  if (typeof item.calculated_price === 'number' && !Number.isNaN(item.calculated_price)) {
    return item.calculated_price;
  }

  const unitPrice = item.products?.price ?? 0;
  const quantity = item.quantity ?? 1;
  return unitPrice * quantity;
};

const ClickAndCollectWidget: React.FC = () => {
  const { businessId, businessLoading } = useBusinessId();
  const { selectedBranchId } = useBranch();
  const { currentBusiness } = useBusiness();
  
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [markingAsCollected, setMarkingAsCollected] = useState(false);

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchPendingOrders();
    }
  }, [businessId, businessLoading, selectedBranchId]);

  const fetchPendingOrders = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch pending click & collect items with customer and product details
      const { data, error: fetchError } = await supabase
        .from('customer_shopping_lists')
        .select(`
          *,
          customers (
            customer_id,
            name,
            phone_number,
            icon
          ),
          products (
            product_id,
            name,
            price,
            image_url,
            is_weighted,
            price_per_unit,
            weight_unit
          )
        `)
        .eq('business_id', businessId)
        .eq('completed', false)
        .eq('is_click_and_collect', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Group items by customer
      const ordersMap = new Map<number, CustomerOrder>();
      
      (data || []).forEach((item: any) => {
        const customerId = item.customer_id;
        
        if (!ordersMap.has(customerId)) {
          const rawIcon = item.customers?.icon as string | undefined;
          const iconUrl = rawIcon
            ? (rawIcon.startsWith('http') || rawIcon.startsWith('/')
                ? rawIcon
                : `/images/icons/${rawIcon}.png`)
            : undefined;
          ordersMap.set(customerId, {
            customer_id: customerId,
            customer_name: item.customers?.name || 'Unknown Customer',
            customer_phone: item.customers?.phone_number || '',
            customer_icon: iconUrl,
            items: [],
            total_items: 0,
            created_at: item.created_at
          });
        }

        const order = ordersMap.get(customerId)!;
        if (!order.customer_icon && item.customers?.icon) {
          const rawIcon = item.customers.icon as string;
          order.customer_icon =
            rawIcon.startsWith('http') || rawIcon.startsWith('/')
              ? rawIcon
              : `/images/icons/${rawIcon}.png`;
        }
        order.items.push({
          ...item,
          products: item.products
        });
        order.total_items += 1;
      });

      // Convert to array and sort by creation date
      const ordersArray = Array.from(ordersMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(ordersArray);
    } catch (err) {
      console.error('Error fetching pending orders:', err);
      setError('Failed to load pending orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleMarkAsCollected = async (customerId: number) => {
    try {
      setMarkingAsCollected(true);

      if (!businessId) {
        throw new Error('Business context unavailable for click & collect completion.');
      }

      const order = orders.find(o => o.customer_id === customerId);
      if (!order) {
        throw new Error('Unable to find click & collect order for this customer.');
      }

      const totalAmount = order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

      const { data: saleRecord, error: saleError } = await supabase
        .from('sales')
        .insert([{
          datetime: getLocalDateTime(),
          total_amount: totalAmount,
          payment_method: 'card',
          cashier_id: null,
          customer_id: order.customer_id,
          discount_applied: 0,
          partial_payment: false,
          partial_amount: null,
          remaining_amount: null,
          partial_notes: null,
          notes: 'Click & Collect order completed via dashboard',
          business_id: businessId,
          branch_id: selectedBranchId
        }])
        .select()
        .single();

      if (saleError) {
        throw saleError;
      }

      if (saleRecord?.sale_id) {
        const saleItemsPayload = order.items
          .filter(item => item.product_id)
          .map(item => ({
            sale_id: saleRecord.sale_id,
            product_id: item.product_id as string,
            quantity: item.quantity ?? 1,
            price_each: item.products?.price ?? 0,
            weight: item.weight ?? null,
            calculated_price:
              typeof item.calculated_price === 'number' ? item.calculated_price : null
          }));

        if (saleItemsPayload.length > 0) {
          const { error: saleItemsError } = await supabase
            .from('sale_items')
            .insert(saleItemsPayload);

          if (saleItemsError) {
            throw saleItemsError;
          }
        }
      }
      
      const itemIds = order.items.map(item => item.list_item_id);
      if (itemIds.length > 0) {
        const { error: updateError } = await supabase
          .from('customer_shopping_lists')
          .update({ completed: true, is_click_and_collect: false })
          .in('list_item_id', itemIds);

        if (updateError) {
          throw updateError;
        }
      }

      await fetchPendingOrders();
    } catch (err) {
      console.error('Error marking order as collected:', err);
      throw err;
    } finally {
      setMarkingAsCollected(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  // Check if Click & Collect is enabled
  if (!currentBusiness?.click_and_collect_enabled) {
    return (
      <div>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShoppingCart style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-secondary)' }} />
            Click & Collect
          </h3>
        </div>

        {/* Disabled State */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '0.5rem',
          border: 'var(--border-subtle)'
        }}>
          <Settings style={{ width: '2rem', height: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
            Click & Collect is disabled
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>
            Enable this feature in Business Settings
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
                     <div style={{
             width: '1rem',
             height: '1rem',
             border: `2px solid var(--border-color)`,
             borderTop: `2px solid #bca88d`,
             borderRadius: '50%'
           }} className="animate-spin" />
          Loading orders...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#ef4444',
        textAlign: 'center'
      }}>
        <div>
          <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem' }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: 'var(--text-primary)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <ShoppingCart style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-primary)' }} />
          Click & Collect
        </h3>
        <div style={{
          backgroundColor: orders.length > 0 ? '#ef4444' : '#6b7280',
          color: '#ffffff',
          fontSize: '0.75rem',
          fontWeight: '600',
          padding: '0.25rem 0.5rem',
          borderRadius: '999px',
          minWidth: '1.5rem',
          textAlign: 'center'
        }}>
          {orders.length}
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <CheckCircle style={{ width: '2rem', height: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            No pending orders
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {orders.map((order) => (
            <div
              key={order.customer_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '0.5rem',
                border: 'var(--border-subtle)'
              }}
            >
              {/* Customer Icon */}
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: '600',
                flexShrink: 0,
                overflow: 'hidden'
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
                  <User style={{ width: '1.25rem', height: '1.25rem' }} />
                )}
              </div>

              {/* Customer Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: '0 0 0.25rem 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {order.customer_name}
                </h4>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {order.customer_phone}
                </p>
              </div>

              {/* Item Count Badge */}
              <div style={{
                backgroundColor: 'var(--secondary-bg)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '0.25rem 0.5rem',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                flexShrink: 0
              }}>
                <Package style={{ width: '0.75rem', height: '0.75rem' }} />
                {order.total_items}
              </div>

              {/* View Order Button */}
              <button
                onClick={() => handleViewOrder(order)}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Eye style={{ width: '1rem', height: '1rem' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <ClickAndCollectOrderModal
        isOpen={showModal}
        onClose={handleCloseModal}
        order={selectedOrder}
        onMarkAsCollected={handleMarkAsCollected}
        loading={markingAsCollected}
      />
    </div>
  );
};

export default ClickAndCollectWidget;
