import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Package, Eye, CheckCircle, Settings, ThumbsUp, ThumbsDown, Clock, AlertCircle } from 'lucide-react';
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
  const [approvingOrder, setApprovingOrder] = useState<number | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

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

        for (const item of order.items) {
          if (!item.product_id) continue;

          const quantityUsed =
            item.products?.is_weighted && item.weight
              ? item.weight
              : item.quantity ?? 1;

          const { data: productRecord, error: productFetchError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('product_id', item.product_id)
            .eq('business_id', businessId)
            .single();

          if (productFetchError && productFetchError.code !== 'PGRST116') {
            throw productFetchError;
          }

          const currentStock = productRecord?.stock_quantity ?? 0;
          const newStock = Math.max(0, currentStock - quantityUsed);

          const { error: stockError } = await supabase
            .from('products')
            .update({
              stock_quantity: newStock,
              last_updated: getLocalDateTime()
            })
            .eq('product_id', item.product_id)
            .eq('business_id', businessId);

          if (stockError) {
            throw stockError;
          }

          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert([{
              product_id: item.product_id,
              quantity_change: -quantityUsed,
              movement_type: 'Sale',
              reference_id: saleRecord.sale_id,
              business_id: businessId
            }]);

          if (movementError) {
            throw movementError;
          }
        }
      }

      // Award loyalty points if customer exists
      if (order.customer_id && totalAmount > 0) {
        try {
          const pointsToAward = Math.floor(totalAmount);
          
          const { data: currentCustomer } = await supabase
            .from('customers')
            .select('loyalty_points')
            .eq('customer_id', order.customer_id)
            .single();

          if (currentCustomer) {
            const newPoints = currentCustomer.loyalty_points + pointsToAward;
            const { error: pointsError } = await supabase
              .from('customers')
              .update({ loyalty_points: newPoints })
              .eq('customer_id', order.customer_id);

            if (pointsError) {
              console.error('Error updating loyalty points:', pointsError);
            }
          }
        } catch (error) {
          console.error('Error awarding loyalty points:', error);
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
      setError('Failed to mark order as collected. Please try again.');
      throw err;
    } finally {
      setMarkingAsCollected(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleApprovalAction = (customerId: number, action: 'approve' | 'reject') => {
    setSelectedOrder(orders.find(o => o.customer_id === customerId) || null);
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedOrder || !approvalAction) return;

    try {
      const status = approvalAction === 'approve' ? 'approved' : 'rejected';
      const timestamp = new Date().toISOString();
      
      // Get current user ID (you might need to adjust this based on your auth system)
      const { data: { user } } = await supabase.auth.getUser();
      const approvedBy = user?.id ? parseInt(user.id) : null;

      // Update all items in the order
      const itemIds = selectedOrder.items.map(item => item.list_item_id);
      
      const { error } = await supabase
        .from('customer_shopping_lists')
        .update({
          approval_status: status,
          approval_notes: approvalNotes.trim() || null,
          approval_timestamp: timestamp,
          approved_by: approvedBy
        })
        .in('list_item_id', itemIds);

      if (error) {
        throw error;
      }

      // Refresh orders
      await fetchPendingOrders();
      
      // Close modal
      setShowApprovalModal(false);
      setSelectedOrder(null);
      setApprovalAction(null);
      setApprovalNotes('');
      
    } catch (err) {
      console.error('Error updating approval status:', err);
      setError(`Failed to ${approvalAction} order. Please try again.`);
    }
  };

  const handleMarkAsReady = async (customerId: number) => {
    try {
      const order = orders.find(o => o.customer_id === customerId);
      if (!order) return;

      const itemIds = order.items.map(item => item.list_item_id);
      
      const { error } = await supabase
        .from('customer_shopping_lists')
        .update({
          approval_status: 'ready_for_pickup',
          approval_timestamp: new Date().toISOString()
        })
        .in('list_item_id', itemIds);

      if (error) {
        throw error;
      }

      await fetchPendingOrders();
    } catch (err) {
      console.error('Error marking as ready:', err);
      setError('Failed to mark order as ready. Please try again.');
    }
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
          {orders.map((order) => {
            const approvalStatus = order.items[0]?.approval_status || 'pending';
            const getStatusColor = (status: string) => {
              switch (status) {
                case 'pending': return '#f59e0b';
                case 'approved': return '#10b981';
                case 'rejected': return '#ef4444';
                case 'ready_for_pickup': return '#3b82f6';
                case 'collected': return '#6b7280';
                default: return '#6b7280';
              }
            };

            const getStatusIcon = (status: string) => {
              switch (status) {
                case 'pending': return <Clock style={{ width: '0.75rem', height: '0.75rem' }} />;
                case 'approved': return <ThumbsUp style={{ width: '0.75rem', height: '0.75rem' }} />;
                case 'rejected': return <ThumbsDown style={{ width: '0.75rem', height: '0.75rem' }} />;
                case 'ready_for_pickup': return <Package style={{ width: '0.75rem', height: '0.75rem' }} />;
                case 'collected': return <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />;
                default: return <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} />;
              }
            };

            return (
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

                {/* Status Badge */}
                <div style={{
                  backgroundColor: getStatusColor(approvalStatus),
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  flexShrink: 0
                }}>
                  {getStatusIcon(approvalStatus)}
                  {approvalStatus.replace('_', ' ').toUpperCase()}
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

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {approvalStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprovalAction(order.customer_id, 'approve')}
                        disabled={approvingOrder === order.customer_id}
                        style={{
                          padding: '0.5rem',
                          border: 'none',
                          borderRadius: '0.375rem',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: approvingOrder === order.customer_id ? 0.6 : 1
                        }}
                      >
                        <ThumbsUp style={{ width: '1rem', height: '1rem' }} />
                      </button>
                      <button
                        onClick={() => handleApprovalAction(order.customer_id, 'reject')}
                        disabled={rejectingOrder === order.customer_id}
                        style={{
                          padding: '0.5rem',
                          border: 'none',
                          borderRadius: '0.375rem',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: rejectingOrder === order.customer_id ? 0.6 : 1
                        }}
                      >
                        <ThumbsDown style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </>
                  )}
                  
                  {approvalStatus === 'approved' && (
                    <button
                      onClick={() => handleMarkAsReady(order.customer_id)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Package style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  )}

                  {/* View Order Button */}
                  <button
                    onClick={() => handleViewOrder(order)}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      backgroundColor: '#6b7280',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Eye style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* Approval Modal */}
      {showApprovalModal && selectedOrder && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              margin: '0 0 1rem 0',
              color: 'var(--text-primary)'
            }}>
              {approvalAction === 'approve' ? 'Approve Order' : 'Reject Order'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: '0 0 0.5rem 0'
              }}>
                Customer: {selectedOrder.customer_name}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: '0 0 1rem 0'
              }}>
                Items: {selectedOrder.total_items}
              </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem'
              }}>
                Notes (optional):
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={`Add a note for the customer...`}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedOrder(null);
                  setApprovalAction(null);
                  setApprovalNotes('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: approvalAction === 'approve' ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClickAndCollectWidget;
