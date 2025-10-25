import React, { useState, useEffect } from 'react';
// Use a simple Card component with inline styles to avoid global CSS conflicts
const Card = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div 
    className={className}
    style={{
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      ...style
    }}
  >
    {children}
  </div>
);
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Download, Store, Phone, CreditCard, Calendar, LogOut, Mail, MessageSquare, User, Camera } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getAllAvailableIcons, getRandomCustomerIcon } from '../utils/customerIcons';
import { generateReceiptHTML } from '../utils/receiptUtils';
import { LoyaltyPrize, Product } from '../types/multitenant';

// Responsive styles
const getResponsiveStyles = (windowWidth: number) => {
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  
  return {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f1f0e4, #e0ded1)',
      padding: isMobile ? '0.5rem' : '1rem',
      paddingBottom: isMobile ? '1rem' : '2rem'
    },
    contentWrapper: {
      maxWidth: isMobile ? '100%' : isTablet ? '48rem' : '56rem',
      margin: '0 auto',
      padding: isMobile ? '0.5rem' : '0'
    },
    card: {
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    profileCard: {
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: isMobile ? '0.5rem' : '1rem'
    },
    profileInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '0.75rem' : '1rem'
    },
    avatar: {
      width: isMobile ? '3rem' : '4rem',
      height: isMobile ? '3rem' : '4rem',
      borderRadius: '50%',
      background: 'linear-gradient(to bottom right, #fbbf24, #d97706)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#ffffff',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      position: 'relative'
    },
    customerName: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#1f2937',
      margin: '0'
    },
    customerId: {
      color: '#6b7280',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      margin: '0.25rem 0 0 0'
    },
    pointsCard: {
      background: 'linear-gradient(to bottom right, #fbbf24, #d97706)',
      color: '#ffffff',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      borderRadius: '0.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    pointsContent: {
      padding: isMobile ? '1rem' : '1.5rem',
      paddingTop: isMobile ? '1rem' : '1.5rem'
    },
    pointsInfo: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    pointsText: {
      color: '#fef3c7',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      fontWeight: '500',
      margin: '0 0 0.25rem 0'
    },
    pointsValue: {
      fontSize: isMobile ? '2rem' : '2.25rem',
      fontWeight: '700',
      margin: '0'
    },
    pointsSubtext: {
      color: '#fef3c7',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      margin: '0.5rem 0 0 0'
    },
    salesCard: {
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
    salesHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: isMobile ? '0.5rem' : '1rem',
      padding: isMobile ? '1rem' : '1.5rem'
    },
    salesTitle: {
      fontSize: isMobile ? '1.125rem' : '1.25rem',
      fontWeight: '600',
      color: '#000000',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    salesDescription: {
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      color: '#6b7280',
      margin: '0'
    },
    filterContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    filterLabel: {
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      color: '#374151'
    },
    filterSelect: {
      padding: isMobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      backgroundColor: '#ffffff',
      color: '#374151'
    },
    salesList: {
      padding: isMobile ? '0 1rem 1rem 1rem' : '0 1.5rem 1.5rem 1.5rem'
    },
    saleItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0.75rem' : '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      marginBottom: '0.75rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    },
    saleItemInfo: {
      flex: '1'
    },
    saleItemTotal: {
      fontWeight: '500',
      color: '#1f2937',
      fontSize: isMobile ? '0.875rem' : '1rem',
      margin: '0'
    },
    saleItemDate: {
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      color: '#6b7280',
      margin: '0'
    },
    saleItemDetails: {
      fontSize: isMobile ? '0.625rem' : '0.75rem',
      color: '#9ca3af',
      margin: '0.25rem 0 0 0'
    },
    saleItemActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    actionButton: {
      padding: isMobile ? '0.25rem 0.5rem' : '0.375rem 0.75rem',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      borderRadius: '0.375rem',
      border: '1px solid #d1d5db',
      backgroundColor: 'transparent',
      color: '#374151',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    iconButton: {
      padding: isMobile ? '0.25rem' : '0.375rem',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      borderRadius: '0.375rem',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#6b7280',
      cursor: 'pointer'
    }
  };
};

// Simple Card sub-components with inline styles to avoid global CSS conflicts
const CardHeader = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div 
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.375rem',
      padding: '1.5rem',
      ...style
    }}
  >
    {children}
  </div>
);

const CardTitle = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <h3 
    className={className}
    style={{
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1',
      letterSpacing: '-0.025em',
      color: '#000000',
      margin: '0',
      ...style
    }}
  >
    {children}
  </h3>
);

const CardDescription = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <p 
    className={className}
    style={{
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: '0',
      ...style
    }}
  >
    {children}
  </p>
);

const CardContent = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div 
    className={className}
    style={{
      padding: '1.5rem',
      paddingTop: '0',
      ...style
    }}
  >
    {children}
  </div>
);

interface Branch {
  branch_id: number;
  branch_name: string;
  business_id: number;
}

interface BusinessInfo {
  business_id: number;
  name: string;
  business_name: string;
  logo_url?: string;
  address: string;
  phone_number?: string;
}

interface Customer {
  customer_id: number;
  name: string;
  phone_number: string;
  email?: string;
  loyalty_points: number;
  business_id: number;
  branch_id?: number;
  icon?: string;
  gender?: 'male' | 'female';
}

interface SaleItem {
  sale_item_id: number;
  product_id: string;
  quantity: number;
  price_each: number;
  calculated_price: number;
  products?: {
    name: string;
  };
}

interface Sale {
  sale_id: number;
  datetime: string;
  total_amount: number;
  payment_method: string;
  discount_applied: number;
  sale_items: SaleItem[];
}

const CustomerPortal = () => {
  const [view, setView] = useState<'login' | 'dashboard' | 'transaction-detail' | 'rewards'>('login');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [phoneOrLoyalty, setPhoneOrLoyalty] = useState('');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loyaltyPrizes, setLoyaltyPrizes] = useState<LoyaltyPrize[]>([]);

  const availableIcons = getAllAvailableIcons();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Close icon picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showIconPicker) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-icon-picker]')) {
          setShowIconPicker(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIconPicker]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, branch_name, business_id')
        .eq('active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchBusinessInfo = async (businessId: number) => {
    try {
      const { data, error } = await supabase
        .from('business_info')
        .select('business_id, name, business_name, logo_url, address, phone_number')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;
      setBusinessInfo(data);
    } catch (err) {
      console.error('Error fetching business info:', err);
    }
  };

  const fetchLoyaltyPrizes = async (businessId: number) => {
    try {
      const { data, error } = await supabase
        .from('loyalty_prizes')
        .select(`
          *,
          product:products(*)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (error) throw error;
      setLoyaltyPrizes(data || []);
    } catch (err) {
      console.error('Error fetching loyalty prizes:', err);
    }
  };

  const handleIconChange = async (icon: string) => {
    if (customer) {
      setCustomer({ ...customer, icon: icon });
      setShowIconPicker(false);
      
      // Update in database
      try {
        const { error } = await supabase
          .from('customers')
          .update({ icon: icon })
          .eq('customer_id', customer.customer_id);
        
        if (error) throw error;
      } catch (err) {
        console.error('Error updating customer icon:', err);
      }
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (!selectedBranch || !phoneOrLoyalty) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      // Clean the phone number input (remove any non-numeric characters except +)
      const cleanInput = phoneOrLoyalty.trim();
      
      // Try to find customer by phone number first, then by customer ID
      let customerData = null;
      let customerError = null;

      // First try by phone number
      const { data: phoneData, error: phoneError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', cleanInput)
        .eq('branch_id', parseInt(selectedBranch))
        .single();

      if (phoneData && !phoneError) {
        customerData = phoneData;
      } else {
        // If not found by phone, try by customer ID (if it's numeric)
        if (/^\d+$/.test(cleanInput)) {
          const { data: idData, error: idError } = await supabase
            .from('customers')
            .select('*')
            .eq('customer_id', parseInt(cleanInput))
            .eq('branch_id', parseInt(selectedBranch))
            .single();

          if (idData && !idError) {
            customerData = idData;
          } else {
            customerError = idError;
          }
        } else {
          customerError = phoneError;
        }
      }

      if (customerError || !customerData) {
        setError('Customer not found. Please check your details and try again.');
        setLoading(false);
        return;
      }

      setCustomer(customerData);
      
      // Fetch business information and loyalty prizes
      await Promise.all([
        fetchBusinessInfo(customerData.business_id),
        fetchLoyaltyPrizes(customerData.business_id)
      ]);
      
      // If customer doesn't have an icon, assign a random one
      if (!customerData.icon) {
        const randomIcon = getRandomCustomerIcon(customerData.gender || 'male');
        try {
          const { error: updateError } = await supabase
            .from('customers')
            .update({ icon: randomIcon })
            .eq('customer_id', customerData.customer_id);
          
          if (!updateError) {
            setCustomer({ ...customerData, icon: randomIcon });
          }
        } catch (err) {
          console.error('Error assigning random icon:', err);
        }
      }
      
      await fetchCustomerSales(customerData.customer_id);
      setView('dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerSales = async (customerId: number) => {
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (name)
          )
        `)
        .eq('customer_id', customerId)
        .order('datetime', { ascending: false })
        .limit(5);

      if (salesError) throw salesError;
      setSales(salesData || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const downloadReceipt = (sale: Sale) => {
    if (!businessInfo || !customer) return;

    // Convert sale data to the format expected by generateReceiptHTML
    const order = {
      items: sale.sale_items.map(item => ({
        product: {
          name: item.products?.name || 'Unknown Product',
          price: item.price_each || 0
        },
        quantity: item.quantity,
        customPrice: item.price_each || 0
      })),
      subtotal: sale.sale_items.reduce((sum, item) => sum + (item.calculated_price || 0), 0),
      tax: (sale.total_amount || 0) - sale.sale_items.reduce((sum, item) => sum + (item.calculated_price || 0), 0) + (sale.discount_applied || 0),
      discount: sale.discount_applied || 0,
      total: sale.total_amount || 0
    };

    const paymentInfo = {
      method: sale.payment_method,
      amountEntered: sale.total_amount?.toString() || '0',
      change: 0,
      customerName: customer.name,
      receiptNotes: '',
      allowPartialPayment: false
    };

    const user = {
      username: 'Customer Portal',
      email: customer.email || ''
    };

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(order, paymentInfo, user, businessInfo);

    // Create and download the receipt
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${sale.sale_id}-${new Date(sale.datetime).toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    setCustomer(null);
    setSales([]);
    setSelectedBranch('');
    setPhoneOrLoyalty('');
    setView('login');
    setSelectedSale(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredSales = filterMonth 
    ? sales.filter(sale => sale.datetime.startsWith(filterMonth))
    : sales;

  // Get responsive styles
  const styles = getResponsiveStyles(windowSize.width);

  // Transaction Detail View
  if (selectedSale) {
    const subtotal = selectedSale.sale_items.reduce((sum, item) => sum + (item.calculated_price || 0), 0);
    const tax = (selectedSale.total_amount || 0) - subtotal + (selectedSale.discount_applied || 0);
    const pointsEarned = Math.floor(selectedSale.total_amount || 0);

    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          {/* Store Header */}
          {businessInfo && (
            <div style={{
              ...styles.card,
              padding: '1rem 1.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.5rem',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {businessInfo.logo_url ? (
                  <img
                    src={businessInfo.logo_url}
                    alt={businessInfo.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        const fallback = document.createElement('div');
                        fallback.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>';
                        fallback.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280;';
                        target.parentElement.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <Store style={{ width: '1.5rem', height: '1.5rem', color: '#6b7280' }} />
                )}
              </div>
              <div style={{ flex: '1', minWidth: 0 }}>
                <h1 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 0.25rem 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {businessInfo.name || businessInfo.business_name}
                </h1>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: '0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  Transaction Details
                </p>
              </div>
            </div>
          )}

          <Button 
            variant="outline" 
            onClick={() => setSelectedSale(null)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Purchases
          </Button>

          <Card style={{ 
            ...styles.card, 
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
          }}>
            <CardHeader style={{ 
              borderBottom: '1px solid #e5e7eb',
              padding: '1.5rem',
              paddingBottom: '1rem'
            }}>
              <CardTitle style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#000000',
                margin: '0'
              }}>
                <span>Transaction Details</span>
                <span style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '400', 
                  color: '#6b7280' 
                }}>
                  #{selectedSale.sale_id}
                </span>
              </CardTitle>
              <CardDescription style={{ 
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0.5rem 0 0 0'
              }}>
                {formatDate(selectedSale.datetime)}
              </CardDescription>
            </CardHeader>
            <CardContent style={{ 
              padding: '1.5rem',
              paddingTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    margin: '0 0 0.75rem 0' 
                  }}>
                    Items Purchased
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSale.sale_items.map((item, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        padding: '0.5rem 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <div style={{ flex: '1' }}>
                          <p style={{ 
                            fontWeight: '500', 
                            color: '#1f2937', 
                            margin: '0',
                            fontSize: '0.875rem'
                          }}>
                            {item.products?.name || 'Unknown Product'}
                          </p>
                          <p style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280', 
                            margin: '0.25rem 0 0 0' 
                          }}>
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p style={{ 
                          fontWeight: '500', 
                          color: '#1f2937',
                          fontSize: '0.875rem'
                        }}>
                          ${(item.calculated_price || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {(selectedSale.discount_applied || 0) > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      color: '#059669',
                      fontSize: '0.875rem'
                    }}>
                      <span>Discount</span>
                      <span>-${(selectedSale.discount_applied || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #e5e7eb',
                    color: '#1f2937'
                  }}>
                    <span>Total</span>
                    <span>${(selectedSale.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      margin: '0 0 0.25rem 0' 
                    }}>
                      Payment Method
                    </p>
                    <p style={{ 
                      fontWeight: '500', 
                      color: '#1f2937',
                      margin: '0'
                    }}>
                      {selectedSale.payment_method}
                    </p>
                  </div>
                  <div>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      margin: '0 0 0.25rem 0' 
                    }}>
                      Points Earned
                    </p>
                    <p style={{ 
                      fontWeight: '500', 
                      color: '#d97706',
                      margin: '0'
                    }}>
                      +{pointsEarned} pts
                    </p>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem',
                  paddingTop: '1rem'
                }}>
                  <Button 
                    onClick={() => downloadReceipt(selectedSale)}
                    style={{ 
                      flex: '1',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    <Download style={{ width: '1rem', height: '1rem' }} />
                    Download Receipt
                  </Button>
                  <Button variant="outline" style={{ 
                    flex: '1',
                    backgroundColor: 'transparent',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    <Mail style={{ width: '1rem', height: '1rem' }} />
                    Email
                  </Button>
                  <Button variant="outline" style={{ 
                    flex: '1',
                    backgroundColor: 'transparent',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div 
        style={{
          ...styles.container,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Card style={{ 
          width: '100%', 
          maxWidth: '28rem', 
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          ...styles.card
        }}>
          <CardHeader style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.25rem', 
            padding: '1.5rem',
            paddingBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                background: 'linear-gradient(to bottom right, #fbbf24, #d97706)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Store style={{ width: '2rem', height: '2rem', color: '#ffffff' }} />
              </div>
            </div>
            <CardTitle style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#000000',
              margin: '0'
            }}>
              Customer Portal
            </CardTitle>
            <CardDescription style={{ 
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0'
            }}>
              Access your loyalty account and rewards
            </CardDescription>
          </CardHeader>
          <CardContent style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Label htmlFor="branch" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Store style={{ width: '1rem', height: '1rem' }} />
                  Select Your Store
                </Label>
                <select
                  id="branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#374151'
                  }}
                >
                  <option value="">Choose a location...</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Label htmlFor="identifier" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <Phone style={{ width: '1rem', height: '1rem' }} />
                  Phone Number or Customer ID
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="+1234567890 or 12345"
                  value={phoneOrLoyalty}
                  onChange={(e) => setPhoneOrLoyalty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#374151'
                  }}
                />
              </div>

              {error && (
                <Alert variant="destructive" style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  padding: '0.75rem'
                }}>
                  <AlertDescription style={{ 
                    color: '#dc2626',
                    fontSize: '0.875rem'
                  }}>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleLogin}
                disabled={loading}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Accessing...' : 'Access Portal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Store Header */}
        {businessInfo && (
          <div style={{
            ...styles.card,
            padding: '1rem 1.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.5rem',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {businessInfo.logo_url ? (
                <img
                  src={businessInfo.logo_url}
                  alt={businessInfo.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const fallback = document.createElement('div');
                      fallback.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>';
                      fallback.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280;';
                      target.parentElement.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <Store style={{ width: '1.5rem', height: '1.5rem', color: '#6b7280' }} />
              )}
            </div>
            <div style={{ flex: '1', minWidth: 0 }}>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 0.25rem 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {businessInfo.name || businessInfo.business_name}
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                Customer Portal
              </p>
            </div>
          </div>
        )}

        <div style={styles.profileCard}>
          <div style={styles.profileHeader}>
            <div style={styles.profileInfo}>
              <div style={{ position: 'relative' }}>
                <div style={styles.avatar}>
                  {customer?.icon ? (
                    <img
                      src={`/images/icons/${customer.icon}.png`}
                      alt={customer.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                      onError={(e) => {
                        // Fallback to User icon if image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          const userIcon = document.createElement('div');
                          userIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                          userIcon.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ffffff;';
                          target.parentElement.appendChild(userIcon);
                        }
                      }}
                    />
                  ) : (
                    <User style={{ width: '1.5rem', height: '1.5rem' }} />
                  )}
                </div>
                <button
                  data-icon-picker
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  style={{
                    position: 'absolute',
                    bottom: '-0.25rem',
                    right: '-0.25rem',
                    width: '1.5rem',
                    height: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                  }}
                  title="Change icon"
                >
                  <Camera style={{ width: '0.75rem', height: '0.75rem', color: '#6b7280' }} />
                </button>
                {showIconPicker && (
                  <div data-icon-picker style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '0.5rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '0.5rem',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    border: '1px solid #e5e7eb',
                    padding: '0.75rem',
                    zIndex: 10,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '0.5rem',
                    maxWidth: '18rem',
                    maxHeight: '20rem',
                    overflowY: 'auto'
                  }}>
                    {availableIcons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => handleIconChange(icon)}
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.5rem',
                          backgroundColor: customer?.icon === icon ? '#fbbf24' : 'transparent',
                          border: customer?.icon === icon ? '2px solid #d97706' : '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          if (customer?.icon !== icon) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (customer?.icon !== icon) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        title={icon}
                      >
                        <img
                          src={`/images/icons/${icon}.png`}
                          alt={icon}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '0.25rem'
                          }}
                          onError={(e) => {
                            // Fallback to icon name if image fails
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.parentElement) {
                              const fallback = document.createElement('div');
                              fallback.textContent = icon.charAt(0).toUpperCase();
                              fallback.style.cssText = `
                                width: 100%;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: #6b7280;
                                color: white;
                                font-size: 0.75rem;
                                font-weight: 600;
                                border-radius: 0.25rem;
                              `;
                              target.parentElement.appendChild(fallback);
                            }
                          }}
                        />
                      </button>
                    ))}
                    <button
                      onClick={() => handleIconChange('')}
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: !customer?.icon ? '#fbbf24' : 'transparent',
                        border: !customer?.icon ? '2px solid #d97706' : '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        cursor: 'pointer',
                        gridColumn: 'span 6'
                      }}
                      onMouseEnter={(e) => {
                        if (customer?.icon) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (customer?.icon) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <User style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                      Default
                    </button>
                  </div>
                )}
              </div>
              <div>
                <h1 style={styles.customerName}>
                  Welcome back, {customer?.name}!
                </h1>
                <p style={styles.customerId}>
                  Customer ID: {customer?.customer_id}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: 'transparent',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <LogOut style={{ width: '1rem', height: '1rem' }} />
              Logout
            </button>
          </div>
        </div>

        <div style={styles.pointsCard}>
          <div style={styles.pointsContent}>
            <div style={styles.pointsInfo}>
              <div>
                <p style={styles.pointsText}>Your Loyalty Points</p>
                <p style={styles.pointsValue}>{customer?.loyalty_points?.toLocaleString()}</p>
                <p style={styles.pointsSubtext}>Keep shopping to earn more rewards!</p>
                <button
                  onClick={() => setView('rewards')}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '0.375rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🎁 View Rewards
                </button>
              </div>
              <div style={{
                width: windowSize.width < 768 ? '3rem' : '5rem',
                height: windowSize.width < 768 ? '3rem' : '5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard style={{ width: windowSize.width < 768 ? '1.5rem' : '2.5rem', height: windowSize.width < 768 ? '1.5rem' : '2.5rem' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.salesCard}>
          <div style={styles.salesHeader}>
            <div>
              <h3 style={styles.salesTitle}>
                <Calendar style={{ width: '1.25rem', height: '1.25rem' }} />
                Recent Purchases
              </h3>
              <p style={styles.salesDescription}>Your last 5 transactions</p>
            </div>
            <div style={styles.filterContainer}>
              <label htmlFor="month-filter" style={styles.filterLabel}>Filter:</label>
              <select
                id="month-filter"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                style={styles.filterSelect}
              >
                  <option value="">All months</option>
                  <option value="2025-01">January 2025</option>
                  <option value="2025-02">February 2025</option>
                  <option value="2025-03">March 2025</option>
                  <option value="2025-04">April 2025</option>
                  <option value="2025-05">May 2025</option>
                  <option value="2025-06">June 2025</option>
                  <option value="2025-07">July 2025</option>
                  <option value="2025-08">August 2025</option>
                  <option value="2025-09">September 2025</option>
                  <option value="2025-10">October 2025</option>
                  <option value="2025-11">November 2025</option>
                  <option value="2025-12">December 2025</option>
                </select>
            </div>
          </div>
          <div style={styles.salesList}>
            {filteredSales.length > 0 ? (
              filteredSales.map(sale => (
                <div 
                  key={sale.sale_id}
                  onClick={() => setSelectedSale(sale)}
                  style={styles.saleItem}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                >
                  <div style={styles.saleItemInfo}>
                    <p style={styles.saleItemTotal}>
                      ${(sale.total_amount || 0).toFixed(2)}
                    </p>
                    <p style={styles.saleItemDate}>{formatDate(sale.datetime)}</p>
                    <p style={styles.saleItemDetails}>{sale.sale_items.length} items • {sale.payment_method}</p>
                  </div>
                  <div style={styles.saleItemActions}>
                    <button 
                      style={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadReceipt(sale);
                      }}
                    >
                      <Download style={{ width: '1rem', height: '1rem' }} />
                      Receipt
                    </button>
                    <button 
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle email
                      }}
                      title="Send via Email"
                    >
                      <Mail style={{ width: '1rem', height: '1rem' }} />
                    </button>
                    <button 
                      style={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle WhatsApp
                      }}
                      title="Send via WhatsApp"
                    >
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
                No purchases found for the selected period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
