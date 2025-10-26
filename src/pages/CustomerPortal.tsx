import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Download, Store, Phone, CreditCard, Calendar, LogOut, Mail, MessageSquare, User, Camera, X, ShoppingCart, Plus, Trash2, Check, Search as SearchIcon, Home, Heart, ListChecks, Megaphone, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getAllAvailableIcons, getRandomCustomerIcon } from '../utils/customerIcons';
import { generateReceiptHTML } from '../utils/receiptUtils';
import { LoyaltyPrize, ShoppingListItem, Product, Promotion } from '../types/multitenant';
import { T } from '../lib/tables';
import cssStyles from './CustomerPortal.module.css';
import ShoppingListItemDialog from '../components/ShoppingListItemDialog';
import { 
  verifyPassword, 
  validateEmail, 
  validatePassword, 
  setupCustomerAccount 
} from '../utils/customerAuth';

// Responsive styles
const getResponsiveStyles = (windowWidth: number) => {
  const isMobile = windowWidth < 768;
  
  return {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f1f0e4, #e0ded1)',
      
      
      
      
      
      display: 'flex',
      flexDirection: 'column' as const,
      padding: isMobile ? '1rem 0 6rem' : '1rem',
      paddingBottom: isMobile ? '6rem' : '3rem'
    },
    contentWrapper: {
      
      maxWidth: isMobile ? '100%' : '56rem',
      width: '100%',
      boxSizing: 'border-box' as const,
      margin: isMobile ? '0 auto' : 'auto',
      padding: isMobile ? '0 1rem 2rem' : '2rem',
      display: 'block',
      
      
    },
    card: {
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      marginBottom: '1.5rem',
      width: '100%',
      boxSizing: 'border-box' as const} ,
    profileCard: {
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap' as const,
      gap: '1rem'
    },
    profileInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    avatar: {
      width: '4rem',
      height: '4rem',
      borderRadius: '50%',
      background: 'linear-gradient(to bottom right, #fbbf24, #d97706)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#ffffff',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      position: 'relative' as const
    },
    customerName: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1f2937',
      margin: '0'
    },
    customerId: {
      color: '#6b7280',
      fontSize: '0.875rem',
      margin: '0.25rem 0 0 0'
    },
    pointsCard: {
      background: 'linear-gradient(to bottom right, #fbbf24, #d97706)',
      color: '#ffffff',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem'
    },
    pointsContent: {
      padding: '1.5rem',
      paddingTop: '1.5rem'
    },
    pointsInfo: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    pointsText: {
      color: '#fef3c7',
      fontSize: '0.875rem',
      fontWeight: '500',
      margin: '0 0 0.25rem 0'
    },
    pointsValue: {
      fontSize: '2.25rem',
      fontWeight: '700',
      margin: '0'
    },
    pointsSubtext: {
      color: '#fef3c7',
      fontSize: '0.875rem',
      margin: '0.5rem 0 0 0'
    },
    filterContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      width: 'auto'
    },
    filterLabel: {
      fontSize: '0.875rem',
      color: '#374151'
    },
    filterSelect: {
      padding: '0.375rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      backgroundColor: '#ffffff',
      color: '#374151'
    },
    salesCard: {
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
    salesHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexDirection: (isMobile ? 'column' : 'row') as 'column' | 'row',
      flexWrap: 'wrap' as const,
      gap: '1rem',
      padding: isMobile ? '1rem' : '1.5rem'
    },
    salesTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#000000',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    salesDescription: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: '0'
    },
    salesList: {
      padding: '0 1.5rem 1.5rem 1.5rem'
    },
    saleItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0.75rem' : '0.875rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    },
    saleItemInfo: {
      flex: '1'
    },
    saleItemTotal: {
      fontWeight: '500',
      color: '#1f2937',
      fontSize: '1rem',
      margin: '0'
    },
    saleItemDate: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: '0'
    },
    saleItemDetails: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      margin: '0.125rem 0 0 0'
    },
    saleItemActions: {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: '0.5rem',
      minWidth: 'auto'
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
      gap: '0.25rem',
      whiteSpace: 'nowrap',
      flexShrink: 0
    },
    iconButton: {
      padding: isMobile ? '0.25rem' : '0.375rem',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      borderRadius: '0.375rem',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#6b7280',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  };
};

// Simple Card sub-components with inline styles to avoid global CSS conflicts
const CardHeader = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div 
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column' as const,
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
  address?: string | null;
}

const formatBranchLabel = (branch: Branch) => {
  const name = branch.branch_name?.trim();
  const addressLine = branch.address
    ?.split(',')
    .map((part) => part.trim())
    .find(Boolean);

  if (name && addressLine) {
    if (name.toLowerCase().includes(addressLine.toLowerCase())) {
      return name;
    }
    return `${name} · ${addressLine}`;
  }

  if (name) {
    return name;
  }

  return addressLine || 'Branch';
};

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
  password_hash?: string;
  account_setup_complete?: boolean;
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
    image_url?: string;
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
  const [view, setView] = useState<'login' | 'setup' | 'password' | 'dashboard' | 'transaction-detail' | 'rewards'>('login');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [isBranchListOpen, setIsBranchListOpen] = useState(false);
  const [phoneOrLoyalty, setPhoneOrLoyalty] = useState('');
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loyaltyPrizes, setLoyaltyPrizes] = useState<LoyaltyPrize[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'shopping-list' | 'search'>('home');
  
  // New authentication state variables
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  
  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  
  // Dialog state
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const branchSearchRef = useRef<HTMLDivElement | null>(null);
  const productSearchRef = useRef<HTMLDivElement | null>(null);

  const availableIcons = getAllAvailableIcons();

  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) {
      return branches;
    }

    const query = branchSearch.toLowerCase();

    return branches.filter((branch) => {
      const label = formatBranchLabel(branch).toLowerCase();
      const address = branch.address?.toLowerCase() ?? '';
      return label.includes(query) || address.includes(query);
    });
  }, [branchSearch, branches]);

  useEffect(() => {
    if (branches.length === 1 && !selectedBranch) {
      const branch = branches[0];
      setSelectedBranch(branch.branch_id.toString());
      setBranchSearch(formatBranchLabel(branch));
    }
  }, [branches, selectedBranch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isBranchListOpen &&
        branchSearchRef.current &&
        !branchSearchRef.current.contains(event.target as Node)
      ) {
        setIsBranchListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchListOpen]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBranchSearchChange = (value: string) => {
    setBranchSearch(value);
    setIsBranchListOpen(true);

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setSelectedBranch('');
      return;
    }

    if (selectedBranch) {
      const currentBranch = branches.find(
        (branch) => branch.branch_id.toString() === selectedBranch
      );

      if (currentBranch) {
        const currentLabel = formatBranchLabel(currentBranch);
        if (trimmedValue.toLowerCase() !== currentLabel.toLowerCase()) {
          setSelectedBranch('');
        }
      }
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch.branch_id.toString());
    setBranchSearch(formatBranchLabel(branch));
    setIsBranchListOpen(false);
    fetchActivePromotions(branch.business_id, branch.branch_id);
  };

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

  // Close product search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showProductSearch &&
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target as Node)
      ) {
        setShowProductSearch(false);
        setProductSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductSearch]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('branch_id, branch_name, business_id, address')
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

  const fetchActivePromotions = useCallback(async (businessId: number, branchId?: number | null) => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const filtered = (data || []).filter((promotion) => {
        const endDateValid = promotion.end_date ? new Date(promotion.end_date) >= now : true;
        const branchMatches =
          branchId == null || promotion.branch_id == null || promotion.branch_id === branchId;
        return endDateValid && branchMatches;
      });

      setPromotions(filtered);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setPromotions([]);
    }
  }, []);

  useEffect(() => {
    if (!customer) {
      setPromotions([]);
      return;
    }

    const branchId = selectedBranch
      ? Number(selectedBranch)
      : customer.branch_id ?? null;

    fetchActivePromotions(customer.business_id, branchId);
  }, [customer, selectedBranch, fetchActivePromotions]);

  useEffect(() => {
    if (activeTab !== 'transactions') {
      setShowTransactionModal(false);
      setSelectedSale(null);
    }
  }, [activeTab]);

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

  const handleInitialLogin = async () => {
    setError('');
    setLoading(true);

    if (!selectedBranch || !phoneOrLoyalty) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const cleanInput = phoneOrLoyalty.trim();
      
      // Find customer by phone number or customer ID
      let customerData = null;
      
      // Try by phone number
      const { data: phoneData, error: phoneError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', cleanInput)
        .eq('branch_id', parseInt(selectedBranch))
        .single();

      if (phoneData && !phoneError) {
        customerData = phoneData;
      } else if (/^\d+$/.test(cleanInput)) {
        // Try by customer ID
        const { data: idData, error: idError } = await supabase
          .from('customers')
          .select('*')
          .eq('customer_id', parseInt(cleanInput))
          .eq('branch_id', parseInt(selectedBranch))
          .single();

        if (idData && !idError) {
          customerData = idData;
        }
      }

      if (!customerData) {
        setError('Customer not found. Please check your details and try again.');
        setLoading(false);
        return;
      }

      // Check if account setup is complete
      if (!customerData.account_setup_complete || !customerData.email || !customerData.password_hash) {
        // First-time customer - redirect to setup
        setPendingCustomer(customerData);
        setView('setup');
        setLoading(false);
        return;
      }

      // Returning customer - redirect to password view
      setPendingCustomer(customerData);
      setView('password');
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleAccountSetup = async () => {
    setError('');
    setLoading(true);

    if (!pendingCustomer) {
      setError('Session expired. Please start over.');
      setLoading(false);
      return;
    }

    // Validate email
    if (!validateEmail(setupEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(setupPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || 'Invalid password');
      setLoading(false);
      return;
    }

    // Check password confirmation
    if (setupPassword !== setupConfirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Check if email is already in use
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email', setupEmail)
        .maybeSingle();

      if (existingCustomer) {
        setError('This email is already registered');
        setLoading(false);
        return;
      }

      // Setup account
      const { data, error } = await setupCustomerAccount(
        pendingCustomer.customer_id,
        setupEmail,
        setupPassword
      );

      if (error) throw error;

      // Auto-login after setup
      setCustomer(data);
      setView('dashboard');
      setActiveTab('home');
      
      // Fetch additional data
      await Promise.all([
        fetchBusinessInfo(data.business_id),
        fetchLoyaltyPrizes(data.business_id),
        fetchCustomerSales(data.customer_id),
        fetchShoppingList(data.customer_id),
        fetchAvailableProducts(data.business_id, data.branch_id)
      ]);

      // Assign random icon if needed
      if (!data.icon) {
        const randomIcon = getRandomCustomerIcon(data.gender || 'male');
        await supabase
          .from('customers')
          .update({ icon: randomIcon })
          .eq('customer_id', data.customer_id);
        setCustomer({ ...data, icon: randomIcon });
      }
    } catch (err) {
      console.error('Account setup error:', err);
      setError('Failed to set up account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setError('');
    setLoading(true);

    if (!loginPassword) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    if (!pendingCustomer) {
      setError('Session expired. Please start over.');
      setLoading(false);
      return;
    }

    try {
      // Verify password using the pending customer
      if (!pendingCustomer.password_hash) {
        setError('Account not set up. Please complete setup first.');
        setLoading(false);
        return;
      }

      const isPasswordValid = await verifyPassword(loginPassword, pendingCustomer.password_hash);

      if (!isPasswordValid) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Successful login
      setCustomer(pendingCustomer);
      setView('dashboard');
      setActiveTab('home');
      
      // Fetch additional data
      await Promise.all([
        fetchBusinessInfo(pendingCustomer.business_id),
        fetchLoyaltyPrizes(pendingCustomer.business_id),
        fetchCustomerSales(pendingCustomer.customer_id),
        fetchShoppingList(pendingCustomer.customer_id),
        fetchAvailableProducts(pendingCustomer.business_id, pendingCustomer.branch_id)
      ]);

      // Assign random icon if needed
      if (!pendingCustomer.icon) {
        const randomIcon = getRandomCustomerIcon(pendingCustomer.gender || 'male');
        await supabase
          .from('customers')
          .update({ icon: randomIcon })
          .eq('customer_id', pendingCustomer.customer_id);
        setCustomer({ ...pendingCustomer, icon: randomIcon });
      }
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
            products (name, image_url)
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

  const fetchShoppingList = async (customerId: number) => {
    try {
      const { data, error } = await supabase
        .from(T.customerShoppingLists)
        .select(`
          *,
          products (
            product_id,
            name,
            price,
            stock_quantity,
            image_url,
            category
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShoppingList(data || []);
    } catch (err) {
      console.error('Error fetching shopping list:', err);
    }
  };

  const fetchAvailableProducts = async (businessId: number, branchId?: number | null) => {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);

      // Only filter by branch if branchId is provided and not 0
      if (branchId && branchId > 0) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      console.log('Fetched products for shopping list:', data?.length || 0);
      setAvailableProducts(data as Product[] || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };


  const toggleItem = async (itemId: number) => {
    try {
      const item = shoppingList.find(i => i.list_item_id === itemId);
      if (!item) return;

      const { error } = await supabase
        .from(T.customerShoppingLists)
        .update({ completed: !item.completed })
        .eq('list_item_id', itemId);

      if (error) throw error;
      setShoppingList(shoppingList.map(i => 
        i.list_item_id === itemId ? { ...i, completed: !i.completed } : i
      ));
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      const { error } = await supabase
        .from(T.customerShoppingLists)
        .delete()
        .eq('list_item_id', itemId);

      if (error) throw error;
      setShoppingList(shoppingList.filter(i => i.list_item_id !== itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const clearShoppingList = async () => {
    if (!customer) return;

    const confirmed = window.confirm('Clear your entire shopping list?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from(T.customerShoppingLists)
        .delete()
        .eq('customer_id', customer.customer_id);

      if (error) throw error;

      setShoppingList([]);
      setShowProductSearch(false);
      setProductSearchQuery('');
    } catch (err) {
      console.error('Error clearing shopping list:', err);
      alert('Unable to clear your shopping list right now. Please try again later.');
    }
  };

  const addProductToShoppingList = async (product: Product | null, quantity: number = 1, weight?: number, calculatedPrice?: number, customText?: string) => {
    if (!customer) return;

    try {
      const { data, error } = await supabase
        .from(T.customerShoppingLists)
        .insert([{
          customer_id: customer.customer_id,
          text: product ? product.name : customText,
          product_id: product ? product.product_id : null,
          completed: false,
          business_id: customer.business_id,
          quantity: quantity,
          weight: weight,
          calculated_price: calculatedPrice
        }])
        .select(`
          *,
          products (
            product_id,
            name,
            price,
            stock_quantity,
            image_url,
            category,
            is_weighted
          )
        `)
        .single();

      if (error) throw error;
      setShoppingList([data, ...shoppingList]);
      setShowProductSearch(false);
      setProductSearchQuery('');
    } catch (err) {
      console.error('Error adding product to list:', err);
    }
  };


  const downloadReceipt = (sale: Sale) => {
    if (!businessInfo || !customer) return;

    // Convert sale data to the format expected by generateReceiptHTML
    const order = {
      items: sale.sale_items.map(item => ({
        product: {
          product_id: item.product_id,
          name: item.products?.name || 'Unknown Product',
          category: 'General',
          price: item.price_each || 0,
          stock_quantity: 0,
          business_id: customer.business_id
        },
        quantity: item.quantity,
        customPrice: item.price_each || 0
      })),
      subtotal: sale.sale_items.reduce((sum, item) => sum + (item.calculated_price || (item.quantity * item.price_each) || 0), 0),
      tax: (sale.total_amount || 0) - sale.sale_items.reduce((sum, item) => sum + (item.calculated_price || (item.quantity * item.price_each) || 0), 0) + (sale.discount_applied || 0),
      discount: sale.discount_applied || 0,
      total: sale.total_amount || 0
    };

    const paymentInfo = {
      method: (sale.payment_method === 'cash' || sale.payment_method === 'card' || sale.payment_method === 'credit' || sale.payment_method === 'tap') 
        ? sale.payment_method as 'cash' | 'card' | 'credit' | 'tap'
        : 'cash' as const,
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
    setBranchSearch('');
    setIsBranchListOpen(false);
    setPhoneOrLoyalty('');
    setError('');
    setPendingCustomer(null);
    setLoginPassword('');
    setSetupEmail('');
    setSetupPassword('');
    setSetupConfirmPassword('');
    setView('login');
    setShoppingList([]);
    setAvailableProducts([]);
    setShowProductSearch(false);
    setProductSearchQuery('');
    setShowItemDialog(false);
    setSelectedProduct(null);
    setSelectedSale(null);
    setShowTransactionModal(false);
    setBusinessInfo(null);
    setLoyaltyPrizes([]);
    setPromotions([]);
    setActiveTab('home');
    setFilterMonth('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const filteredSales = filterMonth 
    ? sales.filter(sale => sale.datetime.startsWith(filterMonth))
    : sales;

  // Get responsive styles
  const styles = getResponsiveStyles(windowSize.width);
  const isMobileView = windowSize.width < 768;

  const navItems: Array<{
    key: 'home' | 'transactions' | 'shopping-list' | 'search';
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    disabled?: boolean;
  }> = [
    {
      key: 'home',
      label: 'Home',
      icon: Home
    },
    {
      key: 'transactions',
      label: 'Transactions',
      icon: Heart
    },
    {
      key: 'shopping-list',
      label: 'Shopping',
      icon: ListChecks
    },
    {
      key: 'search',
      label: 'Search',
      icon: SearchIcon,
      disabled: true
    }
  ];


  // Rewards View
  if (view === 'rewards') {
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
                  Loyalty Rewards
                </p>
              </div>
            </div>
          )}

          <Button 
            variant="outline" 
            onClick={() => {
              setView('dashboard');
              setActiveTab('home');
            }}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Dashboard
          </Button>

          {/* Points Summary */}
          <div style={{
            ...styles.pointsCard,
            marginBottom: '1.5rem'
          }}>
            <div style={styles.pointsContent}>
              <div style={styles.pointsInfo}>
                <div>
                  <p style={styles.pointsText}>Your Available Points</p>
                  <p style={styles.pointsValue}>{customer?.loyalty_points?.toLocaleString()}</p>
                  <p style={styles.pointsSubtext}>Redeem your points for amazing rewards!</p>
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

          {/* Rewards List */}
          <div className={cssStyles.salesCard}>
            <div className={cssStyles.salesHeader}>
              <div>
                <h3 className={cssStyles.salesTitle}>
                  🎁 Available Rewards
                </h3>
                <p className={cssStyles.salesDescription}>Redeem your loyalty points for these amazing rewards</p>
              </div>
            </div>
            <div className={cssStyles.salesList}>
              {loyaltyPrizes.length > 0 ? (
                loyaltyPrizes.map(prize => {
                  const canAfford = (customer?.loyalty_points || 0) >= prize.points_required;
                  const inStock = (prize.product?.stock_quantity || 0) > 0;
                  
    return (
      <div 
                      key={prize.prize_id}
                      className={cssStyles.rewardItem}
                      style={{
                        opacity: canAfford && inStock ? 1 : 0.6,
                        cursor: canAfford && inStock ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {/* Product Image - Small */}
                      <div className={cssStyles.rewardImage}>
                        {prize.product?.image_url ? (
                          <img
                            src={prize.product.image_url}
                            alt={prize.product.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                const fallback = document.createElement('div');
                                fallback.innerHTML = '📦';
                                fallback.className = cssStyles.rewardImageFallback;
                                target.parentElement.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className={cssStyles.rewardImageFallback}>
                            📦
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className={cssStyles.rewardInfo}>
                        <p className={cssStyles.rewardName}>
                          {prize.product?.name || 'Reward Item'}
                        </p>
                        <p className={cssStyles.rewardPoints}>
                          {prize.points_required.toLocaleString()} points required
                        </p>
                        <p className={cssStyles.rewardStock}>
                          {inStock ? `✓ In Stock (${prize.product?.stock_quantity || 0} available)` : 'Out of Stock'}
                          {prize.product?.price && ` • €${prize.product.price.toFixed(2)} value`}
                        </p>
                      </div>

                      {/* Status and Action */}
                      <div className={cssStyles.rewardActions}>
                        <div className={`${cssStyles.statusBadge} ${canAfford && inStock ? cssStyles.statusBadgeAvailable : cssStyles.statusBadgeDisabled}`}>
                          {!inStock ? 'Out of Stock' : canAfford ? 'Available' : 'Need More Points'}
                        </div>
                        <button
                          onClick={async () => {
                            if (!canAfford || !inStock || !customer) return;
                            
                            if (!confirm(`Redeem ${prize.product?.name} for ${prize.points_required} points?`)) return;
                            
                            try {
                              // Deduct points from customer
                              const newPoints = (customer.loyalty_points || 0) - prize.points_required;
                              const { error: pointsError } = await supabase
                                .from('customers')
                                .update({ loyalty_points: newPoints })
                                .eq('customer_id', customer.customer_id);

                              if (pointsError) throw pointsError;

                              // Create redemption record
                              const { error: redemptionError } = await supabase
                                .from('loyalty_redemptions')
                                .insert([{
                                  customer_id: customer.customer_id,
                                  prize_id: prize.prize_id,
                                  points_used: prize.points_required,
                                  quantity: 1,
                                  business_id: businessInfo?.business_id || customer.business_id,
                                  branch_id: customer.branch_id || null,
                                  notes: `Redeemed ${prize.product?.name} for ${prize.points_required} points`
                                }]);

                              if (redemptionError) throw redemptionError;

                              // Update product stock
                              if (prize.product) {
                                const { error: stockError } = await supabase
                                  .from('products')
                                  .update({ 
                                    stock_quantity: (prize.product.stock_quantity || 0) - 1,
                                    last_updated: new Date().toISOString()
                                  })
                                  .eq('product_id', prize.product_id);

                                if (stockError) throw stockError;
                              }

                              // Update local state
                              setCustomer({ ...customer, loyalty_points: newPoints });

                              // Refresh prizes
                              fetchLoyaltyPrizes(customer.business_id);

                              alert(`Successfully redeemed ${prize.product?.name} for ${prize.points_required} points!`);
                            } catch (err) {
                              console.error('Error redeeming prize:', err);
                              alert('Failed to redeem prize. Please try again.');
                            }
                          }}
                          disabled={!canAfford || !inStock}
                          className={`${cssStyles.redeemButton} ${canAfford && inStock ? cssStyles.redeemButtonEnabled : cssStyles.redeemButtonDisabled}`}
                        >
                          🎁 Redeem
                        </button>
              </div>
            </div>
                  );
                })
              ) : (
                <div className={cssStyles.emptyState}>
                  <div className={cssStyles.emptyStateIcon}>🎁</div>
                  <p className={cssStyles.emptyStateText}>No rewards available at the moment. Check back soon!</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Earn Points */}
          <div style={{
            ...styles.card,
            marginTop: '1.5rem',
            padding: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 1rem 0'
            }}>
              💡 How to Earn Points
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  backgroundColor: '#fbbf24',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#ffffff'
                }}>
                  1
                </div>
                <p style={{ margin: '0', fontSize: '0.875rem', color: '#374151' }}>
                  Earn 1 point for every €1 spent
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  backgroundColor: '#fbbf24',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#ffffff'
                }}>
                  2
                </div>
                <p style={{ margin: '0', fontSize: '0.875rem', color: '#374151' }}>
                  Points are automatically added to your account
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  backgroundColor: '#fbbf24',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#ffffff'
                }}>
                  3
                </div>
                <p style={{ margin: '0', fontSize: '0.875rem', color: '#374151' }}>
                  Redeem points for rewards at the store
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div style={styles.container}>
        {/* Header for mobile */}
        {windowSize.width < 768 && (
          <div style={{
            padding: '1.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.25rem',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <i className="fa-solid fa-cash-register" style={{ fontSize: '1rem', color: '#6b7280' }}></i>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a' }}>
                TillPoint Customer Portal
              </span>
            </div>
          </div>
        )}
        
        <div style={styles.contentWrapper}>
          <Card style={styles.card}>
          <CardHeader style={{ 
            display: 'flex', 
            flexDirection: 'column' as const, 
            gap: '0.25rem', 
            padding: windowSize.width < 768 ? '2rem 1.5rem' : '1.5rem',
            paddingBottom: windowSize.width < 768 ? '2rem' : '1.5rem',
            textAlign: 'center'
          }}>
            {windowSize.width >= 768 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb'
                }}>
                  <i className="fa-solid fa-cash-register" style={{ fontSize: '2rem', color: '#6b7280' }}></i>
                </div>
              </div>
            )}
            <CardTitle style={{ 
              fontSize: windowSize.width < 768 ? '1.75rem' : '1.5rem', 
              fontWeight: '600', 
              color: '#111827',
              margin: '0 0 0.5rem 0'
            }}>
              {windowSize.width < 768 ? 'Welcome Back' : 'TillPoint Customer Portal'}
            </CardTitle>
            <CardDescription style={{ 
              fontSize: windowSize.width < 768 ? '0.9375rem' : '0.875rem',
              color: '#6b7280',
              margin: '0'
            }}>
              {windowSize.width < 768 ? 'Sign in to your account' : 'Access your loyalty account and rewards'}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ padding: windowSize.width < 768 ? '2rem 1.5rem' : '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: windowSize.width < 768 ? '1.25rem' : '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Label htmlFor="branch-search" style={{ 
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
                <div
                  ref={branchSearchRef}
                  style={{ position: 'relative' }}
                >
                  <input
                    id="branch-search"
                    type="text"
                    value={branchSearch}
                    onChange={(e) => handleBranchSearchChange(e.target.value)}
                    onFocus={() => setIsBranchListOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredBranches.length > 0) {
                          handleBranchSelect(filteredBranches[0]);
                        }
                      } else if (e.key === 'Escape') {
                        setIsBranchListOpen(false);
                      }
                    }}
                    placeholder="Search by store or address"
                    style={{
                      width: '100%',
                      padding: windowSize.width < 768 ? '0.875rem' : '0.75rem',
                      background: '#ffffff',
                      border: windowSize.width < 768 ? '2px solid #e5e7eb' : '1px solid #d1d5db',
                      borderRadius: windowSize.width < 768 ? '8px' : '0.375rem',
                      color: '#111827',
                      fontSize: windowSize.width < 768 ? '1rem' : '0.875rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  {isBranchListOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.25rem)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                        maxHeight: '14rem',
                        overflowY: 'auto',
                        zIndex: 20
                      }}
                    >
                      {filteredBranches.length > 0 ? (
                        filteredBranches.map((branch) => {
                          const storeLabel = branch.branch_name?.trim() || 'Unnamed Location';
                          const addressLabel = branch.address?.trim();
                          const isSelected = selectedBranch === branch.branch_id.toString();
                          const baseColor = isSelected ? '#eff6ff' : '#ffffff';

                          return (
                            <button
                              key={branch.branch_id}
                              type="button"
                              onClick={() => handleBranchSelect(branch)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.75rem',
                                backgroundColor: baseColor,
                                border: 'none',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = baseColor;
                              }}
                            >
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                                {storeLabel}
                              </div>
                              {addressLabel && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  {addressLabel}
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          No stores match your search
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleInitialLogin()}
                  style={{
                    width: '100%',
                    padding: windowSize.width < 768 ? '0.875rem' : '0.75rem',
                    background: '#ffffff',
                    border: windowSize.width < 768 ? '2px solid #e5e7eb' : '1px solid #d1d5db',
                    borderRadius: windowSize.width < 768 ? '8px' : '0.375rem',
                    color: '#111827',
                    fontSize: windowSize.width < 768 ? '1rem' : '0.875rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
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
                onClick={handleInitialLogin}
                disabled={loading}
                style={{
                  background: windowSize.width < 768 
                    ? 'linear-gradient(135deg, #1a1a1a, #2c2c2c)' 
                    : '#f59e0b',
                  color: '#ffffff',
                  width: '100%',
                  padding: windowSize.width < 768 ? '0.875rem 1rem' : '0.75rem 1rem',
                  borderRadius: windowSize.width < 768 ? '8px' : '0.375rem',
                  border: 'none',
                  fontSize: windowSize.width < 768 ? '1rem' : '0.875rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(26, 26, 26, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Accessing...' : 'Access Portal'}
              </Button>


            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Account Setup View
  if (view === 'setup') {
    return (
      <div style={styles.container}>
        {/* Header for mobile */}
        {windowSize.width < 768 && (
          <div style={{
            padding: '1.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.25rem',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <i className="fa-solid fa-cash-register" style={{ fontSize: '1rem', color: '#6b7280' }}></i>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a' }}>
                TillPoint Account Setup
              </span>
            </div>
          </div>
        )}
        
        <div style={styles.contentWrapper}>
          <Card style={styles.card}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column' as const, 
              gap: '0.25rem', 
              padding: windowSize.width < 768 ? '2rem 1.5rem' : '1.5rem',
              paddingBottom: windowSize.width < 768 ? '2rem' : '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                fontSize: windowSize.width < 768 ? '1.75rem' : '1.5rem', 
                fontWeight: '600', 
                color: '#111827',
                margin: '0 0 0.5rem 0'
              }}>
                Welcome, {pendingCustomer?.name}!
              </h2>
              <p style={{ 
                fontSize: windowSize.width < 768 ? '0.9375rem' : '0.875rem',
                color: '#6b7280',
                margin: '0'
              }}>
                Set up your email and password to access your loyalty account
              </p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <Label htmlFor="setup-email" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <Mail style={{ width: '1rem', height: '1rem' }} />
                    Email Address
                  </Label>
                  <Input
                    id="setup-email"
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="your.email@example.com"
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

                <div>
                  <Label htmlFor="setup-password" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <CreditCard style={{ width: '1rem', height: '1rem' }} />
                    Password
                  </Label>
                  <Input
                    id="setup-password"
                    type="password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

                <div>
                  <Label htmlFor="setup-confirm-password" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <CreditCard style={{ width: '1rem', height: '1rem' }} />
                    Confirm Password
                  </Label>
                  <Input
                    id="setup-confirm-password"
                    type="password"
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
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
                  onClick={handleAccountSetup}
                  disabled={loading}
                  style={{
                    backgroundColor: '#10b981',
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
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setView('login');
                    setPendingCustomer(null);
                    setSetupEmail('');
                    setSetupPassword('');
                    setSetupConfirmPassword('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    color: '#374151'
                  }}
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Password Login View
  if (view === 'password') {
    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <Card style={styles.card}>
            <div style={{
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '0.25rem',
              padding: windowSize.width < 768 ? '2rem 1.5rem' : '1.5rem',
              paddingBottom: windowSize.width < 768 ? '2rem' : '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: windowSize.width < 768 ? '1.75rem' : '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 0.5rem 0'
              }}>
                Welcome Back!
              </h2>
              <p style={{
                fontSize: windowSize.width < 768 ? '0.9375rem' : '0.875rem',
                color: '#6b7280',
                margin: '0'
              }}>
                {pendingCustomer?.name && `Hi ${pendingCustomer.name}!`} Please enter your password to continue
              </p>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <Label htmlFor="login-password" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <CreditCard style={{ width: '1rem', height: '1rem' }} />
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                    autoFocus
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
                  onClick={handlePasswordLogin}
                  disabled={loading}
                  style={{
                    background: windowSize.width < 768
                      ? 'linear-gradient(135deg, #1a1a1a, #2c2c2c)'
                      : '#10b981',
                    color: '#ffffff',
                    width: '100%',
                    padding: windowSize.width < 768 ? '0.875rem 1rem' : '0.75rem 1rem',
                    borderRadius: windowSize.width < 768 ? '8px' : '0.375rem',
                    border: 'none',
                    fontSize: windowSize.width < 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    boxShadow: windowSize.width < 768 ? '0 4px 12px rgba(26, 26, 26, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setView('login');
                    setPendingCustomer(null);
                    setLoginPassword('');
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    color: '#374151'
                  }}
                >
                  Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
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

        {activeTab === 'home' && (
          <>
            {/* Profile and Points Cards Container */}
            <div style={{
          display: windowSize.width < 768 ? 'block' : 'flex',
          flexDirection: windowSize.width < 768 ? 'column' : 'row',
          gap: windowSize.width < 768 ? '1rem' : '1.5rem',
          marginBottom: windowSize.width < 768 ? '1rem' : '1.5rem'
        }}>
          {/* Profile Card */}
          <div style={{
            ...styles.profileCard,
            flex: windowSize.width < 768 ? 'none' : '1',
            marginBottom: windowSize.width < 768 ? '1rem' : 0
          }}>
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

          {/* Points Card */}
          <div style={{
            ...styles.pointsCard,
            flex: windowSize.width < 768 ? 'none' : '1',
            marginBottom: 0
          }}>
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
        </div>

            {/* Promotions Card */}
            <div style={{
              ...styles.card,
              marginBottom: '1.5rem'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Megaphone style={{ width: '1.25rem', height: '1.25rem' }} />
                    Current Promotions
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: '0.5rem 0 0 0'
                  }}>
                    Stay up to date with offers just for you
                  </p>
                </div>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {promotions.length > 0 ? (
                  promotions.map((promotion) => {
                    const discountLabel = promotion.discount_type === 'percentage' && promotion.discount_value != null
                      ? `${promotion.discount_value}% off`
                      : promotion.discount_type === 'fixed_amount' && promotion.discount_value != null
                        ? `Save $${promotion.discount_value.toFixed(2)}`
                        : null;
                    const endDateLabel = promotion.end_date ? `Ends ${formatDate(promotion.end_date)}` : 'Active now';
                    const appliesLabel = promotion.applies_to === 'all' ? 'Storewide' : 'Selected items';
                    return (
                      <div
                        key={promotion.promotion_id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.75rem',
                          padding: '1rem 1.25rem',
                          backgroundColor: '#f9fafb',
                          display: 'flex',
                          flexDirection: windowSize.width < 768 ? 'column' : 'row',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#1f2937'
                          }}>
                            {promotion.name}
                          </p>
                          {promotion.description && (
                            <p style={{
                              margin: '0.35rem 0 0 0',
                              fontSize: '0.875rem',
                              color: '#4b5563'
                            }}>
                              {promotion.description}
                            </p>
                          )}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: windowSize.width < 768 ? 'flex-start' : 'flex-end',
                          gap: '0.35rem',
                          minWidth: windowSize.width < 768 ? 'auto' : '10rem'
                        }}>
                          {discountLabel && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '999px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {discountLabel}
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {endDateLabel}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {appliesLabel}
                          </span>
                          {promotion.min_purchase_amount && promotion.min_purchase_amount > 0 ? (
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              Min spend ${promotion.min_purchase_amount.toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '1.25rem',
                    border: '1px dashed #d1d5db',
                    borderRadius: '0.75rem',
                    textAlign: 'center',
                    backgroundColor: '#ffffff'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>
                      There are no active promotions right now. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'shopping-list' && (
          <>

        {/* Shopping List Card */}
          <div style={{
            ...styles.card,
            marginBottom: '1.5rem'
          }}>
            <div style={{
              padding: isMobileView ? '1.5rem 1.5rem' : '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShoppingCart style={{ width: '1.25rem', height: '1.25rem' }} />
              Shopping List
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0.5rem 0 0 0'
            }}>
              Keep track of items you want to buy
            </p>
          </div>
            <div style={{ padding: isMobileView ? '1.5rem 1.5rem' : '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowItemDialog(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem' }} />
                  Add Custom Item
                </button>
                <button
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <SearchIcon style={{ width: '1rem', height: '1rem' }} />
                  Add from Products
                </button>
              <button
                  onClick={clearShoppingList}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#ffffff',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.375rem',
                    cursor: shoppingList.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: shoppingList.length === 0 ? 0.5 : 1,
                    pointerEvents: shoppingList.length === 0 ? 'none' : 'auto',
                    flexBasis: '100%'
                  }}
                  disabled={shoppingList.length === 0}
                >
                  <RotateCcw style={{ width: '1rem', height: '1rem' }} />
                  Reset List
                </button>
              </div>
            </div>

            {/* Product Search Dropdown */}
            {showProductSearch && (
              <div
                ref={productSearchRef}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}
              >
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    marginBottom: '0.75rem'
                  }}
                  autoFocus
                />
                <div style={{ maxHeight: '16rem', overflowY: 'auto' }}>
                  {availableProducts
                    .filter(p => {
                      const query = productSearchQuery.toLowerCase().trim();
                      if (!query) return true;
                      return (
                        p.name.toLowerCase().includes(query) ||
                        p.sku?.toLowerCase().includes(query) ||
                        p.barcode?.toLowerCase().includes(query)
                      );
                    })
                    .slice(0, 10)
                    .map(product => (
                      <div
                        key={product.product_id}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowItemDialog(true);
                        }}
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              objectFit: 'cover',
                              borderRadius: '0.25rem'
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                            {product.name}
                          </p>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                            ${product.price?.toFixed(2)} • Stock: {product.stock_quantity}
                          </p>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          color: '#3b82f6',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {product.is_weighted ? 'Click to add with weight' : 'Click to add'}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {shoppingList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {shoppingList.map(item => {
                  const product = item.products as any;
                  const stockStatus = product?.stock_quantity > 0 
                    ? (product?.stock_quantity < 10 ? 'Low Stock' : 'In Stock')
                    : 'Out of Stock';
                  const stockColor = product?.stock_quantity > 10 
                    ? '#10b981' 
                    : product?.stock_quantity > 0 
                      ? '#f59e0b' 
                      : '#ef4444';

                  return (
                    <div
                      key={item.list_item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem',
                        position: 'relative'
                      }}
                    >
                      <button
                        onClick={() => toggleItem(item.list_item_id)}
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          borderRadius: '0.25rem',
                          border: item.completed ? 'none' : '2px solid #d1d5db',
                          backgroundColor: item.completed ? '#10b981' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {item.completed && <Check style={{ width: '0.75rem', height: '0.75rem', color: '#ffffff' }} />}
                      </button>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {product ? (
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                style={{
                                  width: '2.5rem',
                                  height: '2.5rem',
                                  objectFit: 'cover',
                                  borderRadius: '0.375rem',
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                margin: 0,
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: item.completed ? '#9ca3af' : '#111827',
                                textDecoration: item.completed ? 'line-through' : 'none'
                              }}>
                                {product.name}
                              </p>
                              {item.text !== product.name && (
                                <p style={{
                                  margin: '0.25rem 0 0 0',
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  textDecoration: item.completed ? 'line-through' : 'none'
                                }}>
                                  {item.text}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '500' }}>
                                  {item.calculated_price ? 
                                    `$${item.calculated_price.toFixed(2)}` : 
                                    `$${product.price?.toFixed(2)}`
                                  }
                                </span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: stockColor,
                                  fontWeight: '500'
                                }}>
                                  {stockStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            color: item.completed ? '#9ca3af' : '#111827',
                            textDecoration: item.completed ? 'line-through' : 'none'
                          }}>
                            {item.text}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        {product && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {product.is_weighted && item.weight ? (
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.weight}{product.weight_unit}</span>
                            ) : (
                              item.quantity && item.quantity > 1 && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>×{item.quantity}</span>
                              )
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => deleteItem(item.list_item_id)}
                          title="Delete"
                          style={{
                            padding: '0.375rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444'
                          }}
                        >
                          <Trash2 style={{ width: '1rem', height: '1rem' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div style={{
                  padding: '0.75rem 0',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  borderTop: '1px solid #e5e7eb',
                  textAlign: 'center'
                }}>
                  {shoppingList.filter(i => !i.completed).length} of {shoppingList.length} items remaining
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem 0',
                color: '#6b7280'
              }}>
                <ShoppingCart style={{ width: '3rem', height: '3rem', margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Your shopping list is empty</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Add items you want to remember to buy</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {activeTab === 'search' && (
          <div style={{
            ...styles.card,
            marginBottom: '1.5rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '999px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SearchIcon style={{ width: '1.75rem', height: '1.75rem', color: '#6b7280' }} />
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  Search is on the way
                </h3>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  maxWidth: '26rem'
                }}>
                  We’re building a smarter search experience so you can quickly find past purchases, favourite products, and more. Stay tuned!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
        <div style={{
          ...styles.salesCard,
          marginBottom: '1.5rem'
        }}>
          <div style={{
            ...styles.salesHeader,
            padding: isMobileView ? '1.5rem' : styles.salesHeader.padding
          }}>
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
                style={{
                  ...styles.filterSelect,
                  width: isMobileView ? '100%' : styles.filterSelect.width,
                  marginTop: isMobileView ? '0.5rem' : 0
                }}
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
                  onClick={() => {
                    setSelectedSale(sale);
                    setShowTransactionModal(true);
                  }}
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
        )}

        {/* Transaction Detail Modal */}
        {activeTab === 'transactions' && showTransactionModal && selectedSale && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeIn 0.25s ease'
            }}
            onClick={() => setShowTransactionModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div 
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(0, 0, 0, 0.85)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: '0 20px 55px -20px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                color: '#f9fafb',
                transform: 'translateY(0)',
                opacity: 1,
                transition: 'transform 0.25s ease, opacity 0.25s ease',
                backgroundImage: 'linear-gradient(145deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.78))'
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '24px 24px 0'
              }}>
                <div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(226, 232, 240, 0.65)'
                  }}>
                    Transaction Details
                  </p>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    color: '#ffffff'
                  }}>
                    #{selectedSale.sale_id.toString().padStart(6, '0')}
                  </h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  aria-label="Close"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    borderRadius: '999px',
                    color: 'rgba(226, 232, 240, 0.7)',
                    padding: '6px',
                    display: 'inline-flex',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease, color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{
                padding: '16px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                {/* Transaction Info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: 'rgba(226, 232, 240, 0.9)'
                  }}>
                    Transaction Information
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'rgba(226, 232, 240, 0.6)'
                    }}>
                      Date & Time
                    </span>
                    <span style={{
                      fontSize: '0.9rem',
                      color: 'rgba(248, 250, 252, 0.92)'
                    }}>
                      {formatDateTime(selectedSale.datetime)}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'rgba(226, 232, 240, 0.6)'
                    }}>
                      Payment Method
                    </span>
                    <span style={{
                      fontSize: '0.9rem',
                      color: 'rgba(248, 250, 252, 0.92)'
                    }}>
                      {selectedSale.payment_method}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'rgba(226, 232, 240, 0.6)'
                    }}>
                      Total Amount
                    </span>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      textAlign: 'right'
                    }}>
                      ${(selectedSale.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: 'rgba(226, 232, 240, 0.9)'
                  }}>
                    Items Purchased
                  </h3>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {selectedSale.sale_items.map((item, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: (item.products as any)?.image_url 
                            ? `url(${(item.products as any).image_url})` 
                            : 'rgba(59, 130, 246, 0.2)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#eef2ff',
                          fontWeight: '600',
                          overflow: 'hidden'
                        }}>
                          {!(item.products as any)?.image_url && (
                            <span style={{ fontSize: '16px' }}>
                              {item.products?.name?.charAt(0)?.toUpperCase() || '📦'}
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: '4px'
                        }}>
                          <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: 'rgba(248, 250, 252, 0.95)'
                          }}>
                            {item.products?.name || 'Unknown Product'}
                          </p>
                          <p style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            color: 'rgba(226, 232, 240, 0.6)'
                          }}>
                            Qty: {item.quantity} × ${(item.price_each || 0).toFixed(2)}
                          </p>
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: 'rgba(248, 250, 252, 0.95)'
                        }}>
                          ${(item.calculated_price || (item.quantity * item.price_each) || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: 'rgba(226, 232, 240, 0.9)'
                  }}>
                    Summary
                  </h3>
                  {(() => {
                    const subtotal = selectedSale.sale_items.reduce((sum, item) => sum + (item.calculated_price || (item.quantity * item.price_each) || 0), 0);
                    const tax = (selectedSale.total_amount || 0) - subtotal + (selectedSale.discount_applied || 0);
                    const pointsEarned = Math.floor(selectedSale.total_amount || 0);
                    
                    return (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'rgba(226, 232, 240, 0.6)'
                          }}>
                            Subtotal
                          </span>
                          <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(248, 250, 252, 0.92)'
                          }}>
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                        {(selectedSale.discount_applied || 0) > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}>
                            <span style={{
                              fontSize: '0.8rem',
                              color: 'rgba(226, 232, 240, 0.6)'
                            }}>
                              Discount
                            </span>
                            <span style={{
                              fontSize: '0.9rem',
                              color: '#6ee7b7'
                            }}>
                              -${(selectedSale.discount_applied || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'rgba(226, 232, 240, 0.6)'
                          }}>
                            Tax
                          </span>
                          <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(248, 250, 252, 0.92)'
                          }}>
                            ${tax.toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#ffffff'
                          }}>
                            Total
                          </span>
                          <span style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#ffffff'
                          }}>
                            ${(selectedSale.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}>
                          <span style={{
                            fontSize: '0.8rem',
                            color: 'rgba(226, 232, 240, 0.6)'
                          }}>
                            Points Earned
                          </span>
                          <span style={{
                            fontSize: '0.9rem',
                            color: '#fbbf24',
                            fontWeight: '600'
                          }}>
                            +{pointsEarned} pts
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <button
                    type="button"
                    onClick={() => downloadReceipt(selectedSale)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#d97706';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f59e0b';
                    }}
                  >
                    <Download size={16} />
                    Download Receipt
                  </button>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        // Handle email functionality
                        console.log('Email receipt');
                      }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'rgba(248, 250, 252, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <Mail size={14} />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Handle WhatsApp functionality
                        console.log('WhatsApp receipt');
                      }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'rgba(248, 250, 252, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <MessageSquare size={14} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className={cssStyles.portalBottomNav} aria-label="Customer portal navigation">
        {navItems.map(({ key, label, icon: Icon, disabled }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              className={`${cssStyles.portalNavButton} ${isActive ? cssStyles.portalNavButtonActive : ''}`}
              onClick={() => {
                if (!disabled) {
                  setActiveTab(key);
                }
              }}
              disabled={disabled}
              aria-pressed={isActive}
            >
              <Icon size={22} />
              <span className={cssStyles.portalNavLabel}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Shopping List Item Dialog */}
      <ShoppingListItemDialog
        isOpen={showItemDialog}
        onClose={() => {
          setShowItemDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddItem={addProductToShoppingList}
      />
    </div>
  );
};

export default CustomerPortal;
