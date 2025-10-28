import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBusiness } from '../contexts/BusinessContext';
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
import { Download, Store, Phone, CreditCard, Calendar, LogOut, Mail, MessageSquare, User, Camera, X, ShoppingCart, Plus, Trash2, Check, Search as SearchIcon, Home, ReceiptText, Megaphone, RotateCcw, Package, Scan, ChevronRight, ArrowLeft, SlidersHorizontal, ArrowUpDown, List, Ticket } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getAllAvailableIcons, getRandomCustomerIcon } from '../utils/customerIcons';
import { generateReceiptHTML } from '../utils/receiptUtils';
import { LoyaltyPrize, ShoppingListItem, Product, Promotion, Voucher, CustomerVoucher } from '../types/multitenant';
import { T } from '../lib/tables';
import cssStyles from './CustomerPortal.module.css';
import ShoppingListItemDialog from '../components/ShoppingListItemDialog';
import PaymentModal from '../components/payment/PaymentModal';
import { usePaymentModal } from '../hooks/usePaymentGateways';
import { 
  verifyPassword, 
  validateEmail, 
  validatePassword, 
  setupCustomerAccount 
} from '../utils/customerAuth';
import { formatCurrency } from '../utils/currency';
import { generateVoucherCode, formatDiscount } from '../utils/voucherUtils';
import { QRCodeSVG } from 'qrcode.react';

// Session caching removed - no longer storing customer data in localStorage

// Responsive styles
const getResponsiveStyles = (windowWidth: number) => {
  const isMobile = windowWidth < 768;
  
  return {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f3f4f6, #e2e8f0)',
      
      
      
      
      
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
  business_info: {
    business_id: number;
    name: string;
    logo_url?: string;
    customer_portal_enabled: boolean;
  };
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
  const { currentBusiness } = useBusiness();
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
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customerVouchers, setCustomerVouchers] = useState<CustomerVoucher[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<CustomerVoucher | null>(null);
  
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState<'recommended' | 'price_asc' | 'price_desc'>('recommended');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [cartSubmissionStatus, setCartSubmissionStatus] = useState<'idle' | 'loading'>('idle');
  const [cartFeedback, setCartFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Payment modal hook
  const { isOpen: isPaymentModalOpen, openModal: openPaymentModal, closeModal: closePaymentModal } = usePaymentModal();
  
  // Dialog state
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const branchSearchRef = useRef<HTMLDivElement | null>(null);
  const productSearchRef = useRef<HTMLDivElement | null>(null);
  const promotionsCarouselRef = useRef<HTMLDivElement | null>(null);
  const promotionAutoIndexRef = useRef(0);
  const sessionRestoredRef = useRef(false);

  // Check if customer portal is enabled for this business
  if (currentBusiness && !currentBusiness.customer_portal_enabled) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e2e8f0)',
        padding: '2rem'
      }}>
        <Card style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Store size={48} style={{ color: '#6b7280', margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.5rem' }}>
              Customer Portal Unavailable
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              The customer portal is not enabled for this business. Please contact the store administrator to enable this feature.
            </p>
          </div>
          <Button 
            onClick={() => window.history.back()}
            style={{ width: '100%' }}
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const getBranchLabel = useCallback((branchIdValue?: string | null, existingLabel?: string) => {
    if (existingLabel) return existingLabel;
    if (!branchIdValue) return '';
    const matchingBranch = branches.find(branch => branch.branch_id.toString() === branchIdValue);
    return matchingBranch ? formatBranchLabel(matchingBranch) : '';
  }, [branches]);

  // Session caching removed - no longer saving to localStorage
  const saveSession = useCallback(() => {
    // Session caching disabled - customer must log in each time
  }, []);
  const location = useLocation();
  const navigate = useNavigate();

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

  const productCategories = useMemo(() => {
    const categoryMap = new Map<string, Product[]>();

    availableProducts.forEach((product) => {
      const categoryName = product.category?.trim() || 'Uncategorized';
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.push(product);
      } else {
        categoryMap.set(categoryName, [product]);
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, products]) => ({ name, products }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableProducts]);

  const applyFiltersAndSort = useCallback((products: Product[]) => {
    let result = [...products];

    if (inStockOnly) {
      result = result.filter((product) => (product.stock_quantity ?? 0) > 0);
    }

    switch (sortOption) {
      case 'price_asc':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'recommended':
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [inStockOnly, sortOption]);

  const selectedCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];

    const category = productCategories.find((item) => item.name === selectedCategory);
    if (!category) return [];

    return applyFiltersAndSort(category.products);
  }, [selectedCategory, productCategories, applyFiltersAndSort]);

  const searchResults = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();
    if (!query) return [];

    const matches = availableProducts.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const categoryMatch = product.category?.toLowerCase().includes(query);
      return nameMatch || categoryMatch;
    });

    return applyFiltersAndSort(matches);
  }, [availableProducts, productSearchQuery, applyFiltersAndSort]);

  const sortOptionLabel = useMemo(() => {
    if (sortOption === 'price_asc') return 'Price: Low to High';
    if (sortOption === 'price_desc') return 'Price: High to Low';
    return 'Recommended';
  }, [sortOption]);

  const visibleSearchResults = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    return searchResults.slice(0, 50);
  }, [productSearchQuery, searchResults]);

  const cartItems = useMemo(
    () => shoppingList.filter((item) => item.is_click_and_collect && !item.completed),
    [shoppingList]
  );

  const cartItemCount = cartItems.length;

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (typeof item.calculated_price === 'number') {
        return sum + item.calculated_price;
      }
      const price = item.products?.price ?? 0;
      const quantity = item.quantity ?? 1;
      return sum + price * quantity;
    }, 0);
  }, [cartItems]);

  useEffect(() => {
    if (branches.length === 1 && !selectedBranch) {
      const branch = branches[0];
      setSelectedBranch(branch.branch_id.toString());
      setBranchSearch(formatBranchLabel(branch));
    }
  }, [branches, selectedBranch]);

  useEffect(() => {
    if (productSearchQuery.trim().length > 0 && selectedCategory !== null) {
      setSelectedCategory(null);
    }
  }, [productSearchQuery, selectedCategory]);

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
      if (customer) {
        // Session caching disabled
      }
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
          if (customer) {
            // Session caching disabled
          }
        }
      }
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch.branch_id.toString());
    setBranchSearch(formatBranchLabel(branch));
    setIsBranchListOpen(false);
    fetchActivePromotions(branch.business_id, branch.branch_id);
    if (customer) {
      // Session caching disabled
    }
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
        .select(`
          branch_id, 
          branch_name, 
          business_id, 
          address,
          business_info!inner(business_id, name, logo_url, customer_portal_enabled)
        `)
        .eq('active', true)
        .eq('business_info.customer_portal_enabled', true);

      if (error) throw error;
      
      // Transform the data to match our Branch interface
      const transformedData = (data || []).map(branch => ({
        branch_id: branch.branch_id,
        branch_name: branch.branch_name,
        business_id: branch.business_id,
        address: branch.address,
        business_info: Array.isArray(branch.business_info) ? branch.business_info[0] : branch.business_info
      })) as Branch[];
      
      setBranches(transformedData);
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
        .select(`
          *,
          promotion_products (
            product_id,
            products (*)
          )
        `)
        .eq('business_id', businessId)
        .eq('active', true)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const filtered = (data || []).filter((promotion: any) => {
        const startDateValid = promotion.start_date ? new Date(promotion.start_date) <= now : true;
        const endDateValid = promotion.end_date ? new Date(promotion.end_date) >= now : true;
        const branchMatches =
          branchId == null || promotion.branch_id == null || promotion.branch_id === branchId;
        return startDateValid && endDateValid && branchMatches;
      }).map((promotion: any) => {
        const { promotion_products, ...rest } = promotion;
        return {
          ...rest,
          products: promotion_products?.map((pp: any) => pp.products).filter(Boolean) || []
        };
      });
      setPromotions(filtered as Promotion[]);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setPromotions([]);
    }
  }, []);

  const fetchVouchers = useCallback(async (businessId: number, branchId?: number | null) => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((voucher: Voucher) => {
        const branchMatches = branchId == null || voucher.branch_id == null || voucher.branch_id === branchId;
        return branchMatches;
      });

      setVouchers(filtered);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
      setVouchers([]);
    }
  }, []);

  const fetchCustomerVouchers = useCallback(async (customerId: number) => {
    try {
      const { data, error } = await supabase
        .from('customer_vouchers')
        .select(`
          *,
          vouchers (*)
        `)
        .eq('customer_id', customerId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      setCustomerVouchers(data || []);
    } catch (err) {
      console.error('Error fetching customer vouchers:', err);
      setCustomerVouchers([]);
    }
  }, []);

  const handleRedeemVoucher = async (voucher: Voucher) => {
    if (!customer || customer.loyalty_points < voucher.points_cost) {
      alert('Insufficient points to redeem this voucher');
      return;
    }

    try {
      const voucherCode = generateVoucherCode();

      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_customer_id: customer.customer_id,
        p_voucher_id: voucher.voucher_id,
        p_voucher_code: voucherCode,
        p_points_cost: voucher.points_cost
      });

      if (error) throw error;

      // Update customer points locally
      const updatedCustomer = { ...customer, loyalty_points: customer.loyalty_points - voucher.points_cost };
      setCustomer(updatedCustomer);
      // Session caching disabled

      // Refresh vouchers
      await fetchCustomerVouchers(customer.customer_id);

      // Show success and display voucher
      setSelectedVoucher({ ...data, vouchers: voucher });
      setShowVoucherModal(true);
    } catch (err) {
      console.error('Error redeeming voucher:', err);
      alert(err instanceof Error ? err.message : 'Failed to redeem voucher');
    }
  };

  useEffect(() => {
    if (!customer) {
      setPromotions([]);
      setVouchers([]);
      return;
    }

    const branchId = selectedBranch
      ? Number(selectedBranch)
      : customer.branch_id ?? null;

    fetchActivePromotions(customer.business_id, branchId);
    fetchVouchers(customer.business_id, branchId);
    fetchCustomerVouchers(customer.customer_id);
  }, [customer, selectedBranch, fetchActivePromotions, fetchVouchers, fetchCustomerVouchers]);

  // Derive active tab from current pathname
  const deriveActiveTab = useCallback((pathname: string) => {
    if (pathname.startsWith('/customer-portal/transactions')) {
      return 'transactions';
    }
    if (pathname.startsWith('/customer-portal/shopping-list')) {
      return 'shopping-list';
    }
    if (pathname.startsWith('/customer-portal/search')) {
      return 'search';
    }
    if (pathname.startsWith('/customer-portal/vouchers')) {
      return 'vouchers';
    }
    return 'home';
  }, []);

  const activeTab = useMemo(() => deriveActiveTab(location.pathname), [deriveActiveTab, location.pathname]);

  useEffect(() => {
    if (activeTab !== 'transactions') {
      setShowTransactionModal(false);
      setSelectedSale(null);
    }
  }, [activeTab]);

  const handleIconChange = async (icon: string) => {
    if (customer) {
      const updatedCustomer = { ...customer, icon };
      setCustomer(updatedCustomer);
      setShowIconPicker(false);
      
      // Update in database
      try {
        const { error } = await supabase
          .from('customers')
          .update({ icon: icon })
          .eq('customer_id', customer.customer_id);
        
        if (error) throw error;
        // Session caching disabled
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
      navigate('/customer-portal/home', { replace: true });
      const resolvedBranchId = data.branch_id ? data.branch_id.toString() : (selectedBranch || '');
      const resolvedBranchLabel = getBranchLabel(resolvedBranchId, branchSearch);
      setSelectedBranch(resolvedBranchId);
      setBranchSearch(resolvedBranchLabel);
      // Session caching disabled
      
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
        const updatedCustomer = { ...data, icon: randomIcon };
        setCustomer(updatedCustomer);
        // Session caching disabled
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
      navigate('/customer-portal/home', { replace: true });
      const resolvedBranchId = pendingCustomer.branch_id ? pendingCustomer.branch_id.toString() : (selectedBranch || '');
      const resolvedBranchLabel = getBranchLabel(resolvedBranchId, branchSearch);
      setSelectedBranch(resolvedBranchId);
      setBranchSearch(resolvedBranchLabel);
      // Session caching disabled
      
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
        const updatedCustomer = { ...pendingCustomer, icon: randomIcon };
        setCustomer(updatedCustomer);
        // Session caching disabled
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

  const removeItemFromCart = async (itemId: number) => {
    try {
      const { error } = await supabase
        .from(T.customerShoppingLists)
        .update({ is_click_and_collect: false })
        .eq('list_item_id', itemId);

      if (error) throw error;

      setShoppingList(prev =>
        prev.map(item =>
          item.list_item_id === itemId
            ? { ...item, is_click_and_collect: false }
            : item
        )
      );

      setCartFeedback({
        type: 'success',
        message: 'Removed from your click & collect cart.'
      });
    } catch (err) {
      console.error('Error removing item from cart:', err);
      setCartFeedback({
        type: 'error',
        message: 'Could not remove that item from the cart. Please try again.'
      });
    } finally {
      setCartSubmissionStatus('idle');
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

  const addProductToShoppingList = async (product: Product | null, quantity: number = 1, weight?: number, calculatedPrice?: number, customText?: string, isClickAndCollect: boolean = false) => {
    if (!customer) return;

    try {
      // For click & collect items with a product_id, check if the same item already exists
      if (isClickAndCollect && product && !weight) {
        // Check for existing non-weighted click & collect items for this product
        const { data: existingItems, error: fetchError } = await supabase
          .from(T.customerShoppingLists)
          .select('*')
          .eq('customer_id', customer.customer_id)
          .eq('product_id', product.product_id)
          .eq('is_click_and_collect', true)
          .eq('completed', false)
          .is('weight', null);

        if (fetchError) throw fetchError;

        if (existingItems && existingItems.length > 0) {
          // Update existing item's quantity
          const existingItem = existingItems[0];
          const newQuantity = existingItem.quantity + quantity;

          // Check stock availability before updating
          if (product.stock_quantity < newQuantity) {
            alert(`Only ${product.stock_quantity} ${product.name} available in stock. You already have ${existingItem.quantity} in your cart.`);
            return;
          }

          const { data: updatedItem, error: updateError } = await supabase
            .from(T.customerShoppingLists)
            .update({ quantity: newQuantity })
            .eq('list_item_id', existingItem.list_item_id)
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

          if (updateError) throw updateError;

          // Update local state
          setShoppingList(prev =>
            prev.map(item =>
              item.list_item_id === existingItem.list_item_id
                ? updatedItem
                : item
            )
          );

          setShowProductSearch(false);
          setProductSearchQuery('');
          return;
        }
      }

      // Check stock availability for new products (non-weighted)
      if (product && !weight && product.stock_quantity < quantity) {
        alert(`Only ${product.stock_quantity} ${product.name} available in stock.`);
        return;
      }

      // Insert new item (for weighted products, custom text items, or new products)
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
          calculated_price: calculatedPrice,
          is_click_and_collect: isClickAndCollect
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

  const handleProductSelectForSearch = (product: Product) => {
    setSelectedProduct(product);
    setShowItemDialog(true);
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setProductSearchQuery('');
    setInStockOnly(false);
    setSortOption('recommended');
  };

  const handleReturnToCategories = () => {
    setSelectedCategory(null);
    setProductSearchQuery('');
    setInStockOnly(false);
    setSortOption('recommended');
  };

  const handleToggleStockFilter = () => {
    setInStockOnly((prev) => !prev);
  };

  const handleCycleSortOption = () => {
    setSortOption((prev) => {
      if (prev === 'recommended') return 'price_asc';
      if (prev === 'price_asc') return 'price_desc';
      return 'recommended';
    });
  };

  useEffect(() => {
    if (!cartFeedback) return;
    const timeout = window.setTimeout(() => setCartFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [cartFeedback]);

  const handleSubmitClickCollect = async () => {
    if (!customer || cartItemCount === 0 || cartSubmissionStatus === 'loading') return;

    try {
      setCartSubmissionStatus('loading');
      const itemIds = cartItems.map((item) => item.list_item_id);

      if (itemIds.length > 0) {
        const { error } = await supabase
          .from(T.customerShoppingLists)
          .update({ is_click_and_collect: true })
          .in('list_item_id', itemIds);

        if (error) {
          throw error;
        }
      }

      setShoppingList(prev =>
        prev.map(item =>
          itemIds.includes(item.list_item_id)
            ? { ...item, is_click_and_collect: true }
            : item
        )
      );

      setCartSubmissionStatus('idle');
      setCartFeedback({
        type: 'success',
        message: 'Thanks! Your click & collect request was sent. We will let you know as soon as it is ready for pickup.'
      });
      setShowCartDrawer(false);
    } catch (err) {
      console.error('Error submitting click & collect request:', err);
      setCartSubmissionStatus('idle');
      setCartFeedback({
        type: 'error',
        message: 'We could not submit your click & collect request. Please try again.'
      });
    }
  };

  const renderFilterSortControls = () => (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
      marginBottom: '1rem'
    }}>
      <button
        onClick={handleToggleStockFilter}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 1rem',
          borderRadius: '999px',
          border: '1px solid',
          borderColor: inStockOnly ? '#2563eb' : '#d1d5db',
          backgroundColor: inStockOnly ? 'rgba(37, 99, 235, 0.08)' : '#ffffff',
          color: inStockOnly ? '#1d4ed8' : '#374151',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease, color 0.2s ease'
        }}
      >
        <SlidersHorizontal style={{ width: '1rem', height: '1rem' }} />
        {inStockOnly ? 'In Stock Only' : 'Filter'}
      </button>
      <button
        onClick={handleCycleSortOption}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 1rem',
          borderRadius: '999px',
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          color: '#374151',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease'
        }}
      >
        <ArrowUpDown style={{ width: '1rem', height: '1rem' }} />
        {sortOptionLabel}
      </button>
    </div>
  );

  const renderProductRow = (product: Product, index: number, total: number) => {
    const outOfStock = (product.stock_quantity ?? 0) <= 0;
    const unitLabel = product.is_weighted && product.price_per_unit
      ? `${formatCurrency(product.price_per_unit)} / ${product.weight_unit || 'kg'}`
      : null;

    return (
      <div
        key={product.product_id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          borderBottom: index === total - 1 ? 'none' : '1px solid #f3f4f6',
          backgroundColor: '#ffffff'
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              width: '3.5rem',
              height: '3.5rem',
              objectFit: 'cover',
              borderRadius: '0.75rem',
              flexShrink: 0
            }}
          />
        ) : (
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Package style={{ width: '1.75rem', height: '1.75rem', color: '#9ca3af' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#111827',
            lineHeight: 1.35
          }}>
            {product.name}
          </h4>
          {product.category && (
            <p style={{
              margin: '0.25rem 0',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              {product.category}
            </p>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <span style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#0f172a'
            }}>
              {formatCurrency(product.price)}
            </span>
            {unitLabel && (
              <span style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '0.125rem 0.5rem',
                borderRadius: '999px'
              }}>
                {unitLabel}
              </span>
            )}
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: outOfStock ? '#ef4444' : '#10b981'
            }}>
              {outOfStock ? 'Out of stock' : `In stock: ${product.stock_quantity}`}
            </span>
          </div>
        </div>
        <button
          onClick={() => !outOfStock && handleProductSelectForSearch(product)}
          disabled={outOfStock}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '999px',
            border: 'none',
            background: outOfStock ? '#d1d5db' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: outOfStock ? '#6b7280' : '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: outOfStock ? 'not-allowed' : 'pointer'
          }}
        >
          {outOfStock ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
    );
  };

  // Session caching removed - no longer restoring from localStorage
  useEffect(() => {
    // Session restoration disabled - customers must log in each time
  }, []);

  useEffect(() => {
    if (!customer) return;
    if (!selectedBranch) return;
    if (branchSearch) return;

    const resolvedLabel = getBranchLabel(selectedBranch, branchSearch);
    if (resolvedLabel) {
      setBranchSearch(resolvedLabel);
      // Session caching disabled
    }
  }, [customer, selectedBranch, branchSearch, getBranchLabel]);

  const handlePromotionAdd = (promotion: Promotion) => {
    if (!promotion.products || promotion.products.length === 0) return;
    const primaryProduct = promotion.products[0];
    void addProductToShoppingList(primaryProduct, 1, undefined, undefined, undefined, true);
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
    setFilterMonth('');
    setCartFeedback(null);
    setCartSubmissionStatus('idle');
    setShowCartDrawer(false);
    // Session caching removed - no longer clearing localStorage
    sessionRestoredRef.current = false;
    navigate('/customer-portal', { replace: true });
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

  const getPromotionPricing = (promotion: Promotion) => {
    const primaryProduct = promotion.products && promotion.products.length > 0 ? promotion.products[0] : null;

    if (!primaryProduct || typeof primaryProduct.price !== 'number') {
      return null;
    }

    const originalPrice = primaryProduct.price;
    let discountedPrice: number | null = null;

    if (promotion.discount_type === 'percentage' && promotion.discount_value != null) {
      discountedPrice = Math.max(originalPrice * (1 - promotion.discount_value / 100), 0);
    } else if (promotion.discount_type === 'fixed_amount' && promotion.discount_value != null) {
      discountedPrice = Math.max(originalPrice - promotion.discount_value, 0);
    }

    return {
      product: primaryProduct,
      originalPrice,
      discountedPrice
    };
  };

  const filteredSales = filterMonth 
    ? sales.filter(sale => sale.datetime.startsWith(filterMonth))
    : sales;

  // Get responsive styles
  const styles = getResponsiveStyles(windowSize.width);
  const isMobileView = windowSize.width < 768;

  useEffect(() => {
    promotionAutoIndexRef.current = 0;
    if (promotionsCarouselRef.current) {
      promotionsCarouselRef.current.scrollTo({ left: 0 });
    }
  }, [promotions]);

  useEffect(() => {
    if (promotions.length < 2) return;
    const container = promotionsCarouselRef.current;
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth + 1) return;

    const motionQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (motionQuery && motionQuery.matches) return;

    let paused = false;
    let scrollFrame = 0;

    const handlePointerEnter = () => {
      paused = true;
    };

    const handlePointerLeave = () => {
      paused = false;
    };

    const handlePointerDown = () => {
      paused = true;
    };

    const handlePointerUp = () => {
      paused = false;
    };

    const handleScroll = () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const items = Array.from(container.children) as HTMLElement[];
        if (!items.length) return;
        let closestIndex = 0;
        let minDistance = Number.POSITIVE_INFINITY;
        items.forEach((item, index) => {
          const distance = Math.abs(item.offsetLeft - container.scrollLeft);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        promotionAutoIndexRef.current = closestIndex;
      });
    };

    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();

    const interval = window.setInterval(() => {
      if (document.hidden || paused) return;
      const items = Array.from(container.children) as HTMLElement[];
      if (!items.length) return;
      const nextIndex = (promotionAutoIndexRef.current + 1) % items.length;
      const target = items[nextIndex];
      container.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
      promotionAutoIndexRef.current = nextIndex;
    }, 5000);

    return () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      window.clearInterval(interval);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [promotions, isMobileView]);


  const navItems: Array<{
    key: 'home' | 'transactions' | 'shopping-list' | 'search';
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    path: string;
    disabled?: boolean;
  }> = [
    {
      key: 'home',
      label: 'Home',
      icon: Home,
      path: '/customer-portal/home'
    },
    {
      key: 'transactions',
      label: 'Transactions',
      icon: ReceiptText,
      path: '/customer-portal/transactions'
    },
    {
      key: 'shopping-list',
      label: 'Shopping',
      icon: List,
      path: '/customer-portal/shopping-list'
    },
    {
      key: 'search',
      label: 'Search',
      icon: SearchIcon,
      path: '/customer-portal/search'
    }
  ];

  useEffect(() => {
    if (!location.pathname.startsWith('/customer-portal')) return;

    const suffix = location.pathname.replace('/customer-portal', '') || '/';
    if (suffix.startsWith('/rewards')) {
      if (customer) {
        if (view !== 'rewards') {
          setView('rewards');
        }
      } else if (view !== 'login') {
        setView('login');
      }
      return;
    }

    const dashboardPaths = ['/home', '/transactions', '/shopping-list', '/search', '/vouchers'];
    if (dashboardPaths.includes(suffix)) {
      if (customer) {
        if (view !== 'dashboard') {
          setView('dashboard');
        }
      } else if (view !== 'login') {
        setView('login');
      }
    }
  }, [customer, location.pathname, view]);

  useEffect(() => {
    if (!customer || view !== 'dashboard') return;
    if (!location.pathname.startsWith('/customer-portal')) return;

    const suffix = location.pathname.replace('/customer-portal', '') || '/';
    if (suffix === '/' || suffix === '') {
      navigate('/customer-portal/home', { replace: true });
    }
  }, [customer, view, location.pathname, navigate]);


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
              navigate('/customer-portal/home');
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
                              const updatedCustomer = { ...customer, loyalty_points: newPoints };
                              setCustomer(updatedCustomer);
                              // Session caching disabled

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
                   <div style={{ position: 'relative' }}>
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
                         paddingLeft: selectedBranch ? '3rem' : (windowSize.width < 768 ? '0.875rem' : '0.75rem'),
                         background: '#ffffff',
                         border: windowSize.width < 768 ? '2px solid #e5e7eb' : '1px solid #d1d5db',
                         borderRadius: windowSize.width < 768 ? '8px' : '0.375rem',
                         color: '#111827',
                         fontSize: windowSize.width < 768 ? '1rem' : '0.875rem',
                         boxSizing: 'border-box',
                         transition: 'all 0.2s ease'
                       }}
                     />
                     {selectedBranch && (() => {
                       const selectedBranchData = branches.find(b => b.branch_id.toString() === selectedBranch);
                       const businessLogo = selectedBranchData?.business_info?.logo_url;
                       const businessName = selectedBranchData?.business_info?.name;
                       
                       return (
                         <div style={{
                           position: 'absolute',
                           left: '0.75rem',
                           top: '50%',
                           transform: 'translateY(-50%)',
                           width: '20px',
                           height: '20px',
                           borderRadius: '4px',
                           overflow: 'hidden',
                           backgroundColor: '#f3f4f6',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center'
                         }}>
                           {businessLogo ? (
                             <img 
                               src={businessLogo} 
                               alt={businessName}
                               style={{ 
                                 width: '100%', 
                                 height: '100%', 
                                 objectFit: 'cover' 
                               }}
                             />
                           ) : (
                             <Store size={12} style={{ color: '#6b7280' }} />
                           )}
                         </div>
                       );
                     })()}
                   </div>
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
                           const businessName = branch.business_info?.name || 'Unknown Business';
                           const businessLogo = branch.business_info?.logo_url;
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
                                 cursor: 'pointer',
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '0.75rem'
                               }}
                               onMouseEnter={(e) => {
                                 e.currentTarget.style.backgroundColor = '#f3f4f6';
                               }}
                               onMouseLeave={(e) => {
                                 e.currentTarget.style.backgroundColor = baseColor;
                               }}
                             >
                               <div style={{ 
                                 width: '32px', 
                                 height: '32px', 
                                 borderRadius: '6px', 
                                 overflow: 'hidden',
                                 flexShrink: 0,
                                 backgroundColor: '#f3f4f6',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center'
                               }}>
                                 {businessLogo ? (
                                   <img 
                                     src={businessLogo} 
                                     alt={businessName}
                                     style={{ 
                                       width: '100%', 
                                       height: '100%', 
                                       objectFit: 'cover' 
                                     }}
                                   />
                                 ) : (
                                   <Store size={16} style={{ color: '#6b7280' }} />
                                 )}
                               </div>
                               <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                                   {storeLabel}
                                 </div>
                                 <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                   {businessName}
                                 </div>
                                 {addressLabel && (
                                   <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                     {addressLabel}
                                   </div>
                                 )}
                               </div>
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
            <button
              onClick={() => navigate('/customer-portal/vouchers')}
              style={{
                padding: '0.75rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <i className="fa-solid fa-ticket" style={{ fontSize: '1.25rem', color: '#7c3aed' }}></i>
            </button>
        </div>
      )}



      {view === 'dashboard' && cartFeedback && (
        <div
          style={{
            marginBottom: '1.25rem',
            borderRadius: '0.75rem',
            border: `1px solid ${cartFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            backgroundColor: cartFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: cartFeedback.type === 'success' ? '#166534' : '#b91c1c',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem'
          }}
        >
          <i
            className={`fa-solid ${cartFeedback.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}
            style={{ marginTop: '0.2rem' }}
          ></i>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{cartFeedback.message}</span>
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
                    onClick={() => {
                      setView('rewards');
                      navigate('/customer-portal/rewards');
                    }}
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
                  <div
                    ref={promotionsCarouselRef}
                    style={{
                      display: 'flex',
                      gap: '1.25rem',
                      overflowX: 'auto',
                      paddingBottom: '0.5rem',
                      marginLeft: '-0.25rem',
                      paddingLeft: '0.25rem',
                      scrollSnapType: isMobileView ? 'x mandatory' : 'none',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'thin'
                    }}
                  >
                  {promotions.map((promotion) => {
                    const discountLabel = promotion.discount_type === 'percentage' && promotion.discount_value != null
                      ? `${promotion.discount_value}% off`
                      : promotion.discount_type === 'fixed_amount' && promotion.discount_value != null
                        ? `Save ${formatCurrency(promotion.discount_value)}`
                        : null;
                    const endDateLabel = promotion.end_date ? `Valid until ${formatDate(promotion.end_date)}` : 'Available now';
                    const appliesLabel = promotion.applies_to === 'all' ? 'Storewide offer' : 'Selected items';
                    const pricingInfo = getPromotionPricing(promotion);
                    const hasDiscount = pricingInfo?.discountedPrice != null && Math.abs((pricingInfo.discountedPrice ?? 0) - pricingInfo.originalPrice) > 0.009;
                    const finalPriceValue = pricingInfo ? (hasDiscount && pricingInfo.discountedPrice != null ? pricingInfo.discountedPrice : pricingInfo.originalPrice) : null;
                    const finalPriceLabel = finalPriceValue != null ? formatCurrency(finalPriceValue) : null;
                    const originalPriceLabel = hasDiscount && pricingInfo ? formatCurrency(pricingInfo.originalPrice) : null;
                    const unitPriceLabel = pricingInfo && pricingInfo.product?.price_per_unit
                      ? `${formatCurrency(pricingInfo.product.price_per_unit)} / ${pricingInfo.product.weight_unit || (pricingInfo.product.is_weighted ? 'kg' : 'unit')}`
                      : null;
                    const promotionTypeLabel = promotion.promotion_type === 'buy_x_get_y_free' && promotion.quantity_required && promotion.quantity_reward
                      ? `Buy ${promotion.quantity_required}, Get ${promotion.quantity_reward} Free`
                      : promotion.promotion_type === 'buy_x_discount' && promotion.quantity_required
                        ? `Buy ${promotion.quantity_required} & Save`
                        : null;
                    const multipleProductsLabel = promotion.products && promotion.products.length > 1
                      ? `${promotion.products.length} products included`
                      : null;
                    const minSpendLabel = promotion.min_purchase_amount && promotion.min_purchase_amount > 0
                      ? `Min spend ${formatCurrency(promotion.min_purchase_amount)}`
                      : null;
                    const badgeItems = [
                      discountLabel,
                      promotionTypeLabel,
                      multipleProductsLabel,
                      appliesLabel,
                      minSpendLabel
                    ].filter(Boolean) as string[];
                    const productImage = pricingInfo?.product?.image_url;
                    const cardTitle = pricingInfo?.product?.name || promotion.name;
                    const supplementaryTitle = pricingInfo?.product && pricingInfo.product.name !== promotion.name ? promotion.name : null;
                    const showAddButton = Boolean(pricingInfo?.product);
                    const cardWidth = isMobileView ? '78%' : '320px';

                    return (
                      <div
                        key={promotion.promotion_id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '1rem',
                          padding: '1.5rem',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem',
                          boxShadow: '0 8px 18px -6px rgba(15, 23, 42, 0.15)',
                          flex: `0 0 ${cardWidth}`,
                          minWidth: cardWidth,
                          maxWidth: cardWidth,
                          scrollSnapAlign: isMobileView ? 'start' : 'center'
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            borderRadius: '0.85rem',
                            background: 'linear-gradient(135deg, #f9fafb 0%, #eef2ff 100%)',
                            padding: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={cardTitle}
                              style={{
                                maxHeight: '160px',
                                width: 'auto',
                                maxWidth: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                height: '140px',
                                width: '100%',
                                borderRadius: '0.75rem',
                                border: '1px dashed #d1d5db',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280',
                                fontSize: '0.85rem',
                                backgroundColor: '#f9fafb'
                              }}
                            >
                              Image coming soon
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {supplementaryTitle && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.05em' }}>
                              {supplementaryTitle}
                            </span>
                          )}
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.3 }}>
                            {cardTitle}
                          </h4>
                          {promotion.description && (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.4 }}>
                              {promotion.description}
                            </p>
                          )}
                          {pricingInfo?.product && promotion.products && promotion.products.length > 1 && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                              Applies to more items in this range.
                            </p>
                          )}
                        </div>

                        {finalPriceLabel && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                                {finalPriceLabel}
                              </span>
                              {hasDiscount && originalPriceLabel && (
                                <span style={{ fontSize: '1rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                                  {originalPriceLabel}
                                </span>
                              )}
                            </div>
                            {unitPriceLabel && (
                              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                {unitPriceLabel}
                              </span>
                            )}
                          </div>
                        )}

                        {showAddButton && (
                          <button
                            onClick={() => handlePromotionAdd(promotion)}
                            style={{
                              padding: '0.65rem 1rem',
                              borderRadius: '999px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                              color: '#ffffff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              boxShadow: '0 10px 20px -10px rgba(37, 99, 235, 0.6)'
                            }}
                          >
                            Add
                          </button>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {badgeItems.map((badge, index) => (
                            <span
                              key={`${promotion.promotion_id}-badge-${index}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: index === 0 ? '#fde68a' : '#e0e7ff',
                                color: index === 0 ? '#92400e' : '#1e3a8a'
                              }}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>

                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                          {endDateLabel}
                        </p>
                      </div>
                    );
                  })}
                  </div>
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
          <>
            {/* Top Search Bar */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              backgroundColor: '#ffffff',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <button
                onClick={() => setShowCartDrawer(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#111827'
                }}
              >
                <ArrowLeft style={{ width: '1.5rem', height: '1.5rem' }} />
              </button>
              <div style={{ position: 'relative', flex: 1 }}>
                <SearchIcon style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1.25rem',
                  height: '1.25rem',
                  color: '#6b7280',
                  pointerEvents: 'none'
                }} />
                <input
                  type="text"
                  placeholder="Search for a product"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem 1rem 1rem 3rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s',
                    boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.outline = '2px solid #2563eb';
                    e.target.style.outlineOffset = '-2px';
                    e.target.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.outline = 'none';
                    e.target.style.boxShadow = 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)';
                  }}
                />
              </div>
            </div>

            <div style={{
              ...styles.card,
              marginBottom: '1.5rem',
              padding: '1.5rem'
            }}>
              {selectedCategory && !productSearchQuery.trim() && (
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={handleReturnToCategories}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '999px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      color: '#1d4ed8',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft style={{ width: '0.9rem', height: '0.9rem' }} />
                    Back to categories
                  </button>
                </div>
              )}
              <div>

              {productSearchQuery.trim() ? (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobileView ? 'column' : 'row',
                    alignItems: isMobileView ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}>
                        {`Results for "${productSearchQuery.trim()}"`}
                      </h3>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.85rem',
                        color: '#6b7280'
                      }}>
                        {searchResults.length} {searchResults.length === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>

                  {renderFilterSortControls()}

                  {visibleSearchResults.length > 0 ? (
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.85rem',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff'
                    }}>
                      {visibleSearchResults.map((product, index) =>
                        renderProductRow(product, index, visibleSearchResults.length)
                      )}
                      {searchResults.length > visibleSearchResults.length && (
                        <div style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          backgroundColor: '#f9fafb'
                        }}>
                          Showing first {visibleSearchResults.length} results
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      border: '1px dashed #d1d5db',
                      borderRadius: '0.75rem'
                    }}>
                      <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>No matches found</p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Try a different search term</p>
                    </div>
                  )}
                </div>
              ) : selectedCategory ? (
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobileView ? 'column' : 'row',
                    alignItems: isMobileView ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}>
                        {selectedCategory}
                      </h3>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.85rem',
                        color: '#6b7280'
                      }}>
                        {selectedCategoryProducts.length} {selectedCategoryProducts.length === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>

                  {renderFilterSortControls()}

                  {selectedCategoryProducts.length > 0 ? (
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.85rem',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff'
                    }}>
                      {selectedCategoryProducts.map((product, index) =>
                        renderProductRow(product, index, selectedCategoryProducts.length)
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      border: '1px dashed #d1d5db',
                      borderRadius: '0.75rem'
                    }}>
                      <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>No products found in this category</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#111827'
                    }}>
                      Browse all categories
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobileView ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
                      gap: '1rem'
                    }}>
                      {productCategories.map((category) => {
                        const previewImages = category.products
                          .filter((product) => !!product.image_url)
                          .slice(0, 3);

                        const previewImage = previewImages[0];

                        return (
                          <button
                            key={category.name}
                            onClick={() => handleCategorySelect(category.name)}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '1rem',
                              padding: '1rem',
                              backgroundColor: '#ffffff',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                              cursor: 'pointer',
                              boxShadow: '0 8px 18px -10px rgba(15, 23, 42, 0.12)'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              height: '3.5rem',
                              borderRadius: '0.75rem',
                              backgroundColor: '#f9fafb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden'
                            }}>
                              {previewImage ? (
                                <img
                                  src={previewImage.image_url!}
                                  alt={previewImage.name}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    padding: '0.25rem'
                                  }}
                                />
                              ) : (
                                <Package style={{ width: '1.75rem', height: '1.75rem', color: '#9ca3af' }} />
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem'
                            }}>
                              <div>
                                <p style={{
                                  margin: 0,
                                  fontWeight: 600,
                                  fontSize: '0.95rem',
                                  color: '#0f172a'
                                }}>
                                  {category.name}
                                </p>
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  {category.products.length} items
                                </span>
                              </div>
                              <ChevronRight style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {productCategories.length === 0 && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        border: '1px dashed #d1d5db',
                        borderRadius: '0.75rem'
                      }}>
                        <Package style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>No categories available yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </>
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

        {activeTab === 'vouchers' && (
          <>
            {/* Points Balance */}
            <div style={{
              ...styles.card,
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
              color: '#ffffff'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#ffffff',
                margin: '0 0 0.5rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="fa-solid fa-star" style={{ color: '#fbbf24' }}></i>
                Your Points
              </h3>
              <div style={{
                fontSize: '3rem',
                fontWeight: '700',
                margin: '0.5rem 0'
              }}>
                {customer?.loyalty_points || 0}
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0
              }}>
                Available to redeem for vouchers
              </p>
            </div>

            {/* Available Vouchers */}
            <div style={{
              ...styles.card,
              marginBottom: '1.5rem',
              padding: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 1.5rem 0'
              }}>
                <i className="fa-solid fa-ticket" style={{ marginRight: '0.5rem', color: '#1a1a1a' }}></i>
                Available Vouchers
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobileView ? '1fr' : 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                {vouchers.map(voucher => {
                  const canAfford = customer && customer.loyalty_points >= voucher.points_cost;
                  return (
                    <div
                      key={voucher.voucher_id}
                      style={{
                        padding: '1.25rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {voucher.name}
                      </h4>
                      {voucher.description && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          margin: '0 0 1rem 0'
                        }}>
                          {voucher.description}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Cost:</span>
                          <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                            {voucher.points_cost} points
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#1a1a1a'
                        }}>
                          {formatDiscount(voucher.discount_type, voucher.discount_value)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRedeemVoucher(voucher)}
                        disabled={!canAfford}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: canAfford ? '#1a1a1a' : '#d1d5db',
                          color: canAfford ? '#ffffff' : '#9ca3af',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (canAfford) {
                            e.currentTarget.style.backgroundColor = '#2c2c2c';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (canAfford) {
                            e.currentTarget.style.backgroundColor = '#1a1a1a';
                          }
                        }}
                      >
                        {canAfford ? 'Redeem Voucher' : 'Insufficient Points'}
                      </button>
                    </div>
                  );
                })}
              </div>
              {vouchers.length === 0 && (
                <p style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  padding: '2rem 0'
                }}>
                  No vouchers available at this time
                </p>
              )}
            </div>

            {/* My Vouchers Section */}
            {customerVouchers.length > 0 && (
              <div style={{
                ...styles.card,
                padding: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 1.5rem 0'
                }}>
                  <i className="fa-solid fa-wallet" style={{ marginRight: '0.5rem', color: '#1a1a1a' }}></i>
                  My Vouchers
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileView ? '1fr' : 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  {customerVouchers.map((cv: CustomerVoucher) => {
                    const isUsed = cv.is_used;
                    return (
                      <div
                        key={cv.customer_voucher_id}
                        style={{
                          padding: '1.25rem',
                          border: `2px solid ${isUsed ? '#d1d5db' : '#1a1a1a'}`,
                          borderRadius: '0.75rem',
                          backgroundColor: isUsed ? '#f9fafb' : '#ffffff',
                          opacity: isUsed ? 0.6 : 1
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem'
                        }}>
                          <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: isUsed ? '#9ca3af' : '#111827',
                            margin: 0
                          }}>
                            {cv.vouchers?.name}
                          </h4>
                          {isUsed && (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#6b7280',
                              backgroundColor: '#e5e7eb',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem'
                            }}>
                              Used
                            </span>
                          )}
                        </div>
                        {cv.vouchers?.description && (
                          <p style={{
                            fontSize: '0.875rem',
                            color: isUsed ? '#9ca3af' : '#6b7280',
                            margin: '0 0 0.75rem 0'
                          }}>
                            {cv.vouchers.description}
                          </p>
                        )}
                        <div style={{
                          padding: '0.75rem',
                          backgroundColor: isUsed ? '#f9fafb' : '#f9fafb',
                          borderRadius: '0.5rem',
                          marginBottom: '0.75rem',
                          border: '1px dashed #d1d5db'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            Voucher Code
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: isUsed ? '#9ca3af' : '#111827',
                            fontFamily: 'monospace',
                            letterSpacing: '0.05em'
                          }}>
                            {cv.voucher_code}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: isUsed ? '#9ca3af' : '#10b981',
                          textAlign: 'center',
                          padding: '0.5rem',
                          backgroundColor: isUsed ? '#f9fafb' : '#ecfdf5',
                          borderRadius: '0.5rem'
                        }}>
                          {formatDiscount(cv.vouchers?.discount_type || 'percentage', cv.vouchers?.discount_value || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {customerVouchers.length === 0 && (
                  <p style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    padding: '2rem 0'
                  }}>
                    You haven't redeemed any vouchers yet
                  </p>
                )}
              </div>
            )}
            {customerVouchers.length === 0 && vouchers.length > 0 && (
              <div style={{
                ...styles.card,
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{
                  color: '#6b7280',
                  margin: 0
                }}>
                  <i className="fa-solid fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                  Redeem vouchers above and they'll appear here
                </p>
              </div>
            )}

            {/* Voucher Redemption Modal */}
            {showVoucherModal && selectedVoucher && (
              <div 
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(12px)',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px'
                }}
                onClick={() => setShowVoucherModal(false)}
              >
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <h2 style={{
                      margin: 0,
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      <i className="fa-solid fa-check-circle" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
                      Voucher Redeemed!
                    </h2>
                    <button
                      onClick={() => setShowVoucherModal(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>

                  {/* Voucher Code */}
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '2px dashed #d1d5db'
                  }}>
                    <p style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      Your Voucher Code
                    </p>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: '#111827',
                      letterSpacing: '0.1em',
                      fontFamily: 'monospace'
                    }}>
                      {selectedVoucher.voucher_code}
                    </div>
                  </div>

                  {/* Discount Info */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #10b981'
                  }}>
                    <p style={{
                      margin: '0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#065f46'
                    }}>
                      <i className="fa-solid fa-tag" style={{ marginRight: '0.5rem' }}></i>
                      {selectedVoucher.vouchers?.name}
                    </p>
                    <p style={{
                      margin: '0.25rem 0 0 0',
                      fontSize: '0.875rem',
                      color: '#047857'
                    }}>
                      {formatDiscount(selectedVoucher.vouchers?.discount_type || 'percentage', selectedVoucher.vouchers?.discount_value || 0)}
                    </p>
                  </div>

                  {/* Instructions */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fbbf24'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}>
                      <i className="fa-solid fa-info-circle" style={{ marginTop: '2px' }}></i>
                      <span>Show this code to the cashier when checking out to apply your discount.</span>
                    </p>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowVoucherModal(false)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#1a1a1a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2c2c2c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a1a1a';
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </>
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

      {view === 'dashboard' && (
        <nav className={cssStyles.portalBottomNav} aria-label="Customer portal navigation">
          {/* First 2 nav items */}
          {navItems.slice(0, 2).map(({ key, label, icon: Icon, disabled, path }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                className={`${cssStyles.portalNavButton} ${isActive ? cssStyles.portalNavButtonActive : ''}`}
                onClick={() => {
                  if (disabled) return;
                  if (view !== 'dashboard') {
                    setView('dashboard');
                  }
                  navigate(path);
                }}
                disabled={disabled}
                aria-pressed={isActive}
              >
                <Icon size={22} />
                <span className={cssStyles.portalNavLabel}>{label}</span>
              </button>
            );
          })}
          
          {/* Search nav item */}
          {(() => {
            const searchItem = navItems.find(item => item.key === 'search');
            if (searchItem) {
              const isActive = activeTab === searchItem.key;
              return (
                <button
                  type="button"
                  className={`${cssStyles.portalNavButton} ${isActive ? cssStyles.portalNavButtonActive : ''}`}
                  onClick={() => {
                    if (view !== 'dashboard') {
                      setView('dashboard');
                    }
                    navigate(searchItem.path);
                  }}
                  aria-pressed={isActive}
                >
                  <searchItem.icon size={22} />
                  <span className={cssStyles.portalNavLabel}>{searchItem.label}</span>
                </button>
              );
            }
            return null;
          })()}

          {/* Shopping List nav item */}
          {(() => {
            const shoppingItem = navItems.find(item => item.key === 'shopping-list');
            if (shoppingItem) {
              const isActive = activeTab === shoppingItem.key;
              return (
                <button
                  type="button"
                  className={`${cssStyles.portalNavButton} ${isActive ? cssStyles.portalNavButtonActive : ''}`}
                  onClick={() => {
                    if (view !== 'dashboard') {
                      setView('dashboard');
                    }
                    navigate(shoppingItem.path);
                  }}
                  aria-pressed={isActive}
                >
                  <shoppingItem.icon size={22} />
                  <span className={cssStyles.portalNavLabel}>{shoppingItem.label}</span>
                </button>
              );
            }
            return null;
          })()}

          {/* Cart nav item with badge */}
          <button
            type="button"
            className={cssStyles.cartNavButton}
            onClick={() => {
              setShowCartDrawer(true);
            }}
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={22} />
            <span className={cssStyles.portalNavLabel}>
              {cartItemCount > 0 ? cartItemCount : 'Cart'}
            </span>
            {cartItemCount > 0 && (
              <span className={cssStyles.cartNavBadge}>{cartItemCount}</span>
            )}
          </button>
        </nav>
      )}

      {showCartDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => {
            setShowCartDrawer(false);
            setCartSubmissionStatus('idle');
          }}
        >
          <div
            style={{
              width: windowSize.width < 640 ? '100%' : '420px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 45px -20px rgba(15, 23, 42, 0.4)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                  Click & Collect Cart
                </h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} ready for pickup
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCartDrawer(false);
                  setCartSubmissionStatus('idle');
                }}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Close cart"
              >
                <X style={{ width: '1rem', height: '1rem', color: '#374151' }} />
              </button>
            </div>

            <div style={{ padding: '0 1.5rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
              <button
                onClick={() => {
                  if (customer && cartItems.length > 0) {
                    openPaymentModal(cartItems, customer.customer_id);
                  }
                }}
                disabled={!customer || cartItems.length === 0}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: cartItems.length > 0 ? '#059669' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <i className="fa-solid fa-credit-card"></i>
                {cartItems.length > 0 ? 'Pay Now' : 'Add items to cart'}
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem 1.5rem'
              }}
            >
              {cartItemCount === 0 ? (
                <div
                  style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}
                >
                  <ShoppingCart style={{ width: '2.5rem', height: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>Your cart is empty</p>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem' }}>
                    Browse products in the Search tab to add click & collect items.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cartItems.map((item) => {
                    const product = item.products;
                    const name = product?.name || item.text || 'Unnamed item';
                    const quantity = item.quantity ?? 1;
                    const itemTotal =
                      typeof item.calculated_price === 'number'
                        ? item.calculated_price
                        : (product?.price ?? 0) * quantity;
                    const weightLabel =
                      item.weight && product?.is_weighted
                        ? `${item.weight}${product.weight_unit ? ` ${product.weight_unit}` : ''}`
                        : undefined;

                    return (
                      <div
                        key={`cart-item-${item.list_item_id}`}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.85rem',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.85rem',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '0.75rem',
                            backgroundColor: '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {product?.image_url ? (
                            <img
                              src={product.image_url}
                              alt={name}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <Package style={{ width: '1.5rem', height: '1.5rem', color: '#9ca3af' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                            {name}
                          </h4>
                          <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Qty: {quantity}</span>
                            {weightLabel && (
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Weight: {weightLabel}</span>
                            )}
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {product?.price ? `Unit: ${formatCurrency(product.price)}` : 'Unit price unavailable'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(itemTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItemFromCart(item.list_item_id)}
                            style={{
                              fontSize: '0.75rem',
                              color: '#ef4444',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '0.75rem'
                }}
              >
                <span>Estimated Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitClickCollect}
                disabled={cartItemCount === 0 || cartSubmissionStatus === 'loading'}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  cursor: cartItemCount === 0 || cartSubmissionStatus === 'loading' ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  opacity: cartItemCount === 0 ? 0.45 : 1,
                  boxShadow: cartItemCount === 0 ? 'none' : '0 14px 28px -16px rgba(37, 99, 235, 0.65)',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                {cartSubmissionStatus === 'loading'
                  ? 'Sending request...'
                  : 'Submit Click & Collect Request'}
              </button>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                Online card payments will be available soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Item Dialog */}
      <ShoppingListItemDialog
        isOpen={showItemDialog}
        onClose={() => {
          setShowItemDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        isClickAndCollect={activeTab === 'search'}
        onAddItem={(product, quantity, weight, calculatedPrice, customText, isClickCollect) =>
          addProductToShoppingList(
            product,
            quantity,
            weight,
            calculatedPrice,
            customText,
            isClickCollect ?? (activeTab === 'search')
          )
        }
      />
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        orderItems={cartItems}
        customerId={customer?.customer_id || 0}
        businessId={currentBusiness?.business_id || 0}
        branchId={selectedBranch ? parseInt(selectedBranch) : undefined}
      />
    </div>
  );
};

export default CustomerPortal;
