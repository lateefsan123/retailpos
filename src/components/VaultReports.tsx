import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { useBusiness } from '../contexts/BusinessContext';

interface VaultReportsProps {
  isOpen: boolean;
  onClose: () => void;
  vaultEntries: any[];
  businessId?: number;
}

interface ReportData {
  kpis: {
    totalSales: number;
    transactions: number;
    avgTransaction: number;
    discounts: number;
  };
  categories: Array<{
    name: string;
    revenue: number;
    percentage: number;
    units: number;
  }>;
  topProducts: Array<{
    rank: number;
    name: string;
    units: number;
    revenue: number;
  }>;
  leastSoldProducts: Array<{
    rank: number;
    name: string;
    units: number;
    revenue: number;
  }>;
  lowStock: Array<{
    product: string;
    current: number;
    reorder: number;
    urgent: boolean;
  }>;
  outOfStock: Array<{
    product: string;
    lastStock: string;
    expectedDelivery: string;
  }>;
  staff: Array<{
    name: string;
    revenue: number;
    transactions: number;
    avgTransaction: number;
    hours: number;
    accuracy: number;
  }>;
  sideBusinesses: Array<{
    name: string;
    revenue: number;
    transactions: number;
    avgTransaction: number;
    topItems: Array<{
      name: string;
      units: number;
      revenue: number;
    }>;
  }>;
}

export default function VaultReports({ isOpen, onClose, vaultEntries, businessId }: VaultReportsProps) {
  const { currentBusiness } = useBusiness();
  const [reportType, setReportType] = useState('weekly');
  const [selectedWeek, setSelectedWeek] = useState('2025-W37');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  // Business information variables
  const businessName = currentBusiness?.business_name || currentBusiness?.name || 'Business';
  const businessAddress = currentBusiness?.address || 'Not specified';
  const businessPhone = currentBusiness?.phone_number || 'Not specified';
  const businessVat = currentBusiness?.vat_number || 'Not specified';

  // Get currency symbol from business settings
  const getCurrencySymbol = (currency?: string) => {
    if (!currency) return '€'
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
    }
    return symbols[currency] || '€'
  }
  
  const currencySymbol = getCurrencySymbol(currentBusiness?.currency)
  const formatCurrency = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`;

  // Fetch report data from database
  const fetchReportData = async (customStart?: string, customEnd?: string) => {
    try {
      setLoading(true);
      
      // Calculate date range based on report type
      let startDate: Date, endDate: Date;
      
      if (showCustomDateRange && customStart && customEnd) {
        // Use custom date range
        startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      } else if (reportType === 'weekly') {
        // Get start of current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Monthly
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Fetch KPIs
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, discount_applied, cashier_id')
        .gte('datetime', startDate.toISOString())
        .lte('datetime', endDate.toISOString());

      if (salesError) throw salesError;

      const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const totalDiscounts = salesData?.reduce((sum, sale) => sum + (sale.discount_applied || 0), 0) || 0;
      const transactions = salesData?.length || 0;
      const avgTransaction = transactions > 0 ? totalSales / transactions : 0;

      // Fetch sales by category
      const { data: categoryData, error: categoryError } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          price_each,
          products!inner(category),
          sales!inner(datetime)
        `)
        .gte('sales.datetime', startDate.toISOString())
        .lte('sales.datetime', endDate.toISOString());

      if (categoryError) throw categoryError;

      const categoryMap = new Map<string, { revenue: number; units: number }>();
      categoryData?.forEach(item => {
        const category = item.products?.category || 'Other';
        const revenue = item.quantity * item.price_each;
        const existing = categoryMap.get(category) || { revenue: 0, units: 0 };
        categoryMap.set(category, {
          revenue: existing.revenue + revenue,
          units: existing.units + item.quantity
        });
      });

      const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        revenue: data.revenue,
        percentage: totalSales > 0 ? Number(((data.revenue / totalSales) * 100).toFixed(1)) : 0,
        units: data.units
      })).sort((a, b) => b.revenue - a.revenue);

      // Fetch top products
      const { data: productData, error: productError } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          price_each,
          products!inner(name),
          sales!inner(datetime)
        `)
        .gte('sales.datetime', startDate.toISOString())
        .lte('sales.datetime', endDate.toISOString());

      if (productError) throw productError;

      const productMap = new Map<string, { units: number; revenue: number }>();
      productData?.forEach(item => {
        const productName = item.products?.name || 'Unknown Product';
        const revenue = item.quantity * item.price_each;
        const existing = productMap.get(productName) || { units: 0, revenue: 0 };
        productMap.set(productName, {
          units: existing.units + item.quantity,
          revenue: existing.revenue + revenue
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((product, index) => ({
          rank: index + 1,
          ...product
        }));

      // Get all products from inventory to include unsold items
      const { data: allProductsData, error: allProductsError } = await supabase
        .from('products')
        .select('name');

      if (allProductsError) throw allProductsError;

      // Create a complete list including products with zero sales
      const allProductsWithSales = allProductsData?.map(product => {
        const salesData = productMap.get(product.name);
        return {
          name: product.name,
          units: salesData?.units || 0,
          revenue: salesData?.revenue || 0
        };
      }) || [];

      const leastSoldProducts = allProductsWithSales
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 10)
        .map((product, index) => ({
          rank: index + 1,
          ...product
        }));

      // Fetch low stock and out of stock products
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('products')
        .select('name, stock_quantity, reorder_level');

      if (inventoryError) throw inventoryError;

      const lowStock = inventoryData
        ?.filter(product => product.stock_quantity <= product.reorder_level)
        .map(product => ({
          product: product.name,
          current: product.stock_quantity,
          reorder: product.reorder_level,
          urgent: product.stock_quantity <= (product.reorder_level * 0.5)
        })) || [];

      const outOfStock = inventoryData
        ?.filter(product => product.stock_quantity === 0)
        .map(product => ({
          product: product.name,
          lastStock: 'N/A', // Would need inventory_movements table for this
          expectedDelivery: 'TBD'
        })) || [];

      // Fetch staff performance
      const { data: staffData, error: staffError } = await supabase
        .from('sales')
        .select(`
          total_amount,
          cashier_id
        `)
        .gte('datetime', startDate.toISOString())
        .lte('datetime', endDate.toISOString());

      if (staffError) throw staffError;

      const staffMap = new Map<number, { name: string; revenue: number; transactions: number }>();
      staffData?.forEach(sale => {
        const cashierId = sale.cashier_id;
        const cashierName = 'System User';
        const existing = staffMap.get(cashierId) || { name: cashierName, revenue: 0, transactions: 0 };
        staffMap.set(cashierId, {
          name: cashierName,
          revenue: existing.revenue + (sale.total_amount || 0),
          transactions: existing.transactions + 1
        });
      });

      const staff = Array.from(staffMap.values()).map(employee => ({
        name: employee.name,
        revenue: employee.revenue,
        transactions: employee.transactions,
        avgTransaction: employee.transactions > 0 ? employee.revenue / employee.transactions : 0,
        hours: 40, // Default - would need time tracking system
        accuracy: 99.0 // Default - would need accuracy tracking system
      }));

      // Fetch side business data
      const { data: sideBusinessSales, error: sideBusinessError } = await supabase
        .from('side_business_sales')
        .select(`
          total_amount,
          quantity,
          side_business_items!inner(
            name,
            side_businesses!inner(name)
          )
        `)
        .eq('parent_shop_id', businessId || 1)
        .gte('date_time', startDate.toISOString())
        .lte('date_time', endDate.toISOString());

      if (sideBusinessError) {
        console.error('Error fetching side business data:', sideBusinessError);
      }

      // Process side business data
      const sideBusinessMap = new Map();
      if (sideBusinessSales) {
        sideBusinessSales.forEach(sale => {
          const businessName = sale.side_business_items.side_businesses.name;
          const itemName = sale.side_business_items.name;
          
          if (!sideBusinessMap.has(businessName)) {
            sideBusinessMap.set(businessName, {
              name: businessName,
              revenue: 0,
              transactions: 0,
              items: new Map()
            });
          }
          
          const business = sideBusinessMap.get(businessName);
          business.revenue += sale.total_amount;
          business.transactions += 1;
          
          if (!business.items.has(itemName)) {
            business.items.set(itemName, { name: itemName, units: 0, revenue: 0 });
          }
          const item = business.items.get(itemName);
          item.units += sale.quantity;
          item.revenue += sale.total_amount;
        });
      }

      const sideBusinesses = Array.from(sideBusinessMap.values()).map(business => ({
        name: business.name,
        revenue: business.revenue,
        transactions: business.transactions,
        avgTransaction: business.transactions > 0 ? business.revenue / business.transactions : 0,
        topItems: Array.from(business.items.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3)
      }));

      setReportData({
        kpis: {
          totalSales,
          transactions,
          avgTransaction,
          discounts: totalDiscounts
        },
        categories,
        topProducts,
        leastSoldProducts,
        lowStock,
        outOfStock,
        staff,
        sideBusinesses
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component opens or report type changes
  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen, reportType, selectedWeek]);
  
  const generateReport = () => {
    const reportWindow = window.open('', '_blank');
    const reportContent = document.getElementById('sales-report-content').innerHTML;
    
    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${businessName} Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f5f5f5; }
            .urgent { color: red; font-weight: bold; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
            .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            h1, h2, h3 { color: #333; }
            .print-only { display: block; }
          </style>
        </head>
        <body>
          ${reportContent}
          <script>window.print();</script>
        </body>
      </html>
    `);
  };

  // Export to Excel function - Accountant Focused
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      // Fetch fresh data for the selected date range
      const startDate = showCustomDateRange ? customStartDate : null;
      const endDate = showCustomDateRange ? customEndDate : null;
      
      // Calculate date range for filename
      let dateRangeStr = '';
      if (showCustomDateRange && startDate && endDate) {
        const start = new Date(startDate).toLocaleDateString('en-IE');
        const end = new Date(endDate).toLocaleDateString('en-IE');
        dateRangeStr = `${start}_to_${end}`;
      } else if (reportType === 'weekly') {
        dateRangeStr = `Week_${selectedWeek}`;
      } else {
        const now = new Date();
        dateRangeStr = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // 1. Financial Summary Sheet (Primary - for Accountant)
      const financialSummaryData = [
        [`${businessName} - FINANCIAL REPORT FOR ACCOUNTANT`],
        [''],
        ['BUSINESS INFORMATION'],
        ['Company Name:', businessName],
        ['Address:', businessAddress],
        ['Phone:', businessPhone],
        ['VAT Number:', businessVat],
        ['Business Type:', 'Retail Store'],
        [''],
        ['REPORTING PERIOD'],
        ['Period:', showCustomDateRange ? `${customStartDate} to ${customEndDate}` : 
          reportType === 'weekly' ? `Week ${selectedWeek}` : 
          new Date().toLocaleDateString('en-IE', { year: 'numeric', month: 'long' })],
        ['Report Generated:', new Date().toLocaleDateString('en-IE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })],
        [''],
        ['REVENUE SUMMARY (EXCLUDING VAT)'],
        ['Gross Sales Revenue', reportData?.kpis.totalSales ? reportData.kpis.totalSales : 0],
        ['Less: Customer Discounts', reportData?.kpis.discounts ? reportData.kpis.discounts : 0],
        ['Net Sales Revenue (Before VAT)', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          (reportData.kpis.totalSales - reportData.kpis.discounts) : 
          reportData?.kpis.totalSales ? reportData.kpis.totalSales : 0],
        [''],
        ['TRANSACTION ANALYSIS'],
        ['Total Number of Transactions', reportData?.kpis.transactions || 0],
        ['Average Transaction Value', reportData?.kpis.avgTransaction ? reportData.kpis.avgTransaction : 0],
        ['Total Items Sold', reportData?.categories.reduce((sum, cat) => sum + cat.units, 0) || 0],
        [''],
        ['CATEGORY PERFORMANCE'],
        ['Category', 'Revenue', 'Percentage of Sales', 'Units Sold', 'Average Price per Unit'],
        ...(reportData?.categories.map(cat => [
          cat.name,
          cat.revenue,
          `${cat.percentage}%`,
          cat.units,
          cat.units > 0 ? (cat.revenue / cat.units) : 0
        ]) || []),
        [''],
        ['TOP PERFORMING PRODUCTS'],
        ['Product Name', 'Units Sold', 'Revenue Generated', 'Average Price per Unit'],
        ...(reportData?.topProducts.slice(0, 15).map(product => [
          product.name,
          product.units,
          product.revenue,
          product.units > 0 ? (product.revenue / product.units) : 0
        ]) || []),
        [''],
        ['ACCOUNTING NOTES'],
        [`1. All amounts are in ${currentBusiness?.currency || 'EUR'} (${currencySymbol})`],
        ['2. Revenue figures are exclusive of VAT unless otherwise stated'],
        ['3. Customer discounts are deducted from gross revenue'],
        ['4. This report is generated automatically from POS system data'],
        ['5. For VAT calculations, standard rate should be applied to net sales'],
        ['6. Inventory movements and cost of goods sold are not included in this report'],
        ['7. Report covers retail sales only - side business operations excluded'],
        [''],
        ['VERIFICATION REQUIRED'],
        ['- Cross-reference with bank deposits'],
        ['- Verify VAT calculations and rates'],
        ['- Confirm discount policies and approvals'],
        ['- Reconcile with physical inventory counts']
      ];
      
      const financialSheet = XLSX.utils.aoa_to_sheet(financialSummaryData);
      XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Summary');
      
      // 2. Detailed Sales Data Sheet
      const salesDetailsData = [
        ['DETAILED SALES BREAKDOWN'],
        [''],
        ['Product Name', 'Category', 'Units Sold', 'Revenue Generated', 'Average Price per Unit'],
        ...(reportData?.topProducts.map(product => [
          product.name,
          reportData.categories.find(cat => 
            reportData.topProducts.filter(p => 
              reportData.categories.some(c => c.name === 'Category' && p.name === product.name)
            ).length > 0
          )?.name || 'Other',
          product.units,
          product.revenue,
          product.units > 0 ? (product.revenue / product.units) : 0
        ]) || []),
        [''],
        ['CATEGORY TOTALS'],
        ['Category', 'Total Revenue', 'Total Units', 'Average Price per Unit', 'Percentage of Total Sales'],
        ...(reportData?.categories.map(cat => [
          cat.name,
          cat.revenue,
          cat.units,
          cat.units > 0 ? (cat.revenue / cat.units) : 0,
          `${cat.percentage}%`
        ]) || [])
      ];
      
      const salesSheet = XLSX.utils.aoa_to_sheet(salesDetailsData);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales Details');
      
      // 3. Transaction Analysis Sheet
      const transactionAnalysisData = [
        ['TRANSACTION ANALYSIS'],
        [''],
        ['Metric', 'Value', 'Notes'],
        ['Total Transactions', reportData?.kpis.transactions || 0, 'Number of completed sales'],
        ['Average Transaction Value', reportData?.kpis.avgTransaction ? reportData.kpis.avgTransaction : 0, 'Revenue per transaction'],
        ['Total Items Sold', reportData?.categories.reduce((sum, cat) => sum + cat.units, 0) || 0, 'Sum of all units sold'],
        ['Average Items per Transaction', reportData?.kpis.transactions > 0 ? 
          (reportData.categories.reduce((sum, cat) => sum + cat.units, 0) / reportData.kpis.transactions) : 0, 
          'Items sold divided by transactions'],
        ['Discount Rate', reportData?.kpis.totalSales > 0 ? 
          ((reportData.kpis.discounts / reportData.kpis.totalSales) * 100).toFixed(2) + '%' : '0%', 
          'Percentage of revenue given as discounts'],
        [''],
        ['DAILY BREAKDOWN (ESTIMATED)'],
        ['Note: Daily breakdown requires individual transaction data'],
        ['Average Daily Revenue', reportData?.kpis.totalSales && reportData?.kpis.transactions > 0 ? 
          (reportData.kpis.totalSales / Math.max(1, reportData.kpis.transactions / 10)) : 0, 'Estimated based on transaction volume'],
        ['Average Daily Transactions', reportData?.kpis.transactions > 0 ? 
          (reportData.kpis.transactions / Math.max(1, reportData.kpis.transactions / 10)) : 0, 'Estimated daily transaction count']
      ];
      
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionAnalysisData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transaction Analysis');
      
      // 4. VAT Calculation Sheet
      const vatCalculationData = [
        ['VAT CALCULATION WORKSHEET'],
        [''],
        ['IMPORTANT: This is a template - verify VAT rates and calculations'],
        [''],
        ['Net Sales Revenue (Before VAT)', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          (reportData.kpis.totalSales - reportData.kpis.discounts) : 
          reportData?.kpis.totalSales ? reportData.kpis.totalSales : 0],
        [''],
        ['VAT CALCULATIONS (Standard Rate 23%)'],
        ['VAT on Net Sales', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          ((reportData.kpis.totalSales - reportData.kpis.discounts) * 0.23) : 
          reportData?.kpis.totalSales ? (reportData.kpis.totalSales * 0.23) : 0],
        ['Total Revenue Including VAT', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          ((reportData.kpis.totalSales - reportData.kpis.discounts) * 1.23) : 
          reportData?.kpis.totalSales ? (reportData.kpis.totalSales * 1.23) : 0],
        [''],
        ['VAT CALCULATIONS (Reduced Rate 13.5% - if applicable)'],
        ['Note: Verify which products qualify for reduced rate'],
        ['VAT on Reduced Rate Items', 0, 'To be calculated based on product categorization'],
        [''],
        ['VAT SUMMARY'],
        ['Standard Rate VAT (23%)', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          ((reportData.kpis.totalSales - reportData.kpis.discounts) * 0.23) : 
          reportData?.kpis.totalSales ? (reportData.kpis.totalSales * 0.23) : 0],
        ['Reduced Rate VAT (13.5%)', 0, 'Calculate based on qualifying products'],
        ['Total VAT Collected', reportData?.kpis.totalSales && reportData?.kpis.discounts ? 
          ((reportData.kpis.totalSales - reportData.kpis.discounts) * 0.23) : 
          reportData?.kpis.totalSales ? (reportData.kpis.totalSales * 0.23) : 0],
        [''],
        ['VERIFICATION CHECKLIST'],
        ['☐ Verify current VAT rates'],
        ['☐ Confirm product VAT categorization'],
        ['☐ Cross-check with VAT returns'],
        ['☐ Validate calculation methods'],
        ['☐ Check for any exempt or zero-rated items']
      ];
      
      const vatSheet = XLSX.utils.aoa_to_sheet(vatCalculationData);
      XLSX.utils.book_append_sheet(workbook, vatSheet, 'VAT Calculation');
      
      // Generate filename
      const filename = `LandM_Store_Accountant_Report_${dateRangeStr}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Write and download file
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '30px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 20px 40px rgba(62, 63, 41, 0.15)',
        maxWidth: '900px',
        width: '95%',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: '#3e3f29'
      }}>
        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#3e3f29'
          }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '20px' }}></i>
            <p>Loading report data...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && !reportData && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#3e3f29'
          }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '20px', color: '#dc3545' }}></i>
            <p>Unable to load report data. Please try again.</p>
            <button
              onClick={onClose}
              style={{
                background: '#7d8d86',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                marginTop: '20px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && reportData && (
          <>
            {/* Header */}
            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid rgba(125, 141, 134, 0.3)'
        }}>
          <h2 style={{
            color: '#3e3f29',
            fontSize: '24px',
            fontWeight: '700',
            margin: 0
          }}>
            <i className="fa-solid fa-chart-line" style={{ marginRight: '10px', color: '#7d8d86' }}></i>
            Sales Reports
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '2px solid #7d8d86',
              color: '#3e3f29',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7d8d86'
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.transform = 'rotate(90deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = '#3e3f29'
              e.currentTarget.style.transform = 'rotate(0deg)'
            }}
          >
            ×
          </button>
        </div>

        {/* Report Controls */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '30px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <select 
            style={{
              padding: '10px 15px',
              border: '2px solid rgba(125, 141, 134, 0.3)',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#3e3f29',
              fontSize: '14px',
              outline: 'none'
            }}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="custom">Custom Date Range</option>
          </select>
          
          {reportType === 'weekly' && (
            <input 
              type="week" 
              style={{
                padding: '10px 15px',
                border: '2px solid rgba(125, 141, 134, 0.3)',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#3e3f29',
                fontSize: '14px',
                outline: 'none'
              }}
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />
          )}
          
          {reportType === 'custom' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="date" 
                style={{
                  padding: '10px 15px',
                  border: '2px solid rgba(125, 141, 134, 0.3)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#3e3f29',
                  fontSize: '14px',
                  outline: 'none'
                }}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Start Date"
              />
              <span style={{ color: '#7d8d86', fontSize: '14px' }}>to</span>
              <input 
                type="date" 
                style={{
                  padding: '10px 15px',
                  border: '2px solid rgba(125, 141, 134, 0.3)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#3e3f29',
                  fontSize: '14px',
                  outline: 'none'
                }}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
          )}
          
          <button 
            onClick={() => fetchReportData(customStartDate, customEndDate)}
            disabled={loading || (reportType === 'custom' && (!customStartDate || !customEndDate))}
            style={{
              background: loading ? '#cccccc' : '#7d8d86',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#3e3f29'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#7d8d86'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-refresh'}`}></i>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          
          <button 
            onClick={generateReport}
            style={{
              background: '#7d8d86',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3e3f29'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#7d8d86'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <i className="fa-solid fa-print"></i>
            Print Report
          </button>
          
          <button 
            onClick={exportToExcel}
            disabled={exportLoading || !reportData || (reportType === 'custom' && (!customStartDate || !customEndDate))}
            style={{
              background: exportLoading ? '#cccccc' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: exportLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!exportLoading) {
                e.currentTarget.style.background = '#059669'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!exportLoading) {
                e.currentTarget.style.background = '#10b981'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            <i className={`fa-solid ${exportLoading ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i>
            {exportLoading ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>
        
        {/* Report Content */}
        <div id="sales-report-content" style={{ color: '#3e3f29' }}>
          
          {/* Report Header */}
          <div style={{
            borderBottom: '2px solid rgba(125, 141, 134, 0.3)',
            paddingBottom: '20px',
            marginBottom: '30px'
          }}>
            <h1 style={{
              color: '#3e3f29',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '10px'
            }}>
              <i className="fa-solid fa-file-invoice" style={{ marginRight: '10px' }}></i>{currentBusiness?.business_name || currentBusiness?.name || 'Business'} Sales Report
            </h1>
            <p style={{
              color: '#7d8d86',
              fontSize: '16px'
            }}>
              Reporting Period: Week 37: 9-15 September 2025
            </p>
          </div>
          
          {/* 1. Overview KPIs */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-chart-bar" style={{ marginRight: '10px' }}></i>1. Overview (KPIs)
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'rgba(125, 141, 134, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <p style={{
                  color: '#7d8d86',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '5px'
                }}>
                  Total Sales
                </p>
                <p style={{
                  color: '#3e3f29',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0
                }}>
                  {formatCurrency(reportData.kpis.totalSales)}
                </p>
              </div>
              
              <div style={{
                background: 'rgba(125, 141, 134, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <p style={{
                  color: '#7d8d86',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '5px'
                }}>
                  Transactions
                </p>
                <p style={{
                  color: '#3e3f29',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0
                }}>
                  {reportData.kpis.transactions.toLocaleString()}
                </p>
              </div>
              
              <div style={{
                background: 'rgba(125, 141, 134, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <p style={{
                  color: '#7d8d86',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '5px'
                }}>
                  Avg Transaction
                </p>
                <p style={{
                  color: '#3e3f29',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0
                }}>
                  {formatCurrency(reportData.kpis.avgTransaction)}
                </p>
              </div>
              
              <div style={{
                background: 'rgba(125, 141, 134, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <p style={{
                  color: '#7d8d86',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '5px'
                }}>
                  Total Discounts
                </p>
                <p style={{
                  color: '#3e3f29',
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0
                }}>
                  {formatCurrency(reportData.kpis.discounts)}
                </p>
              </div>
            </div>
          </section>
          
          {/* 2. Sales Breakdown */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-shopping-cart" style={{ marginRight: '10px' }}></i>2. Sales Breakdown
            </h2>
            
            {/* Sales by Category */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px'
              }}>
                Sales by Category
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(125, 141, 134, 0.3)'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Category
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Revenue
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        % of Total
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Units Sold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.categories.map((cat, index) => (
                      <tr key={index} style={{ 
                        background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                      }}>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29'
                        }}>
                          {cat.name}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(cat.revenue)}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {cat.percentage}%
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {cat.units}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Top 10 Products */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px'
              }}>
                Top 10 Products Sold
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(125, 141, 134, 0.3)'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Rank
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Product
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Units Sold
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topProducts.map((product) => (
                      <tr key={product.rank} style={{ 
                        background: product.rank % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                      }}>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          #{product.rank}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29'
                        }}>
                          {product.name}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {product.units}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Least Sold Products */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px'
              }}>
                Least Sold Products
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(125, 141, 134, 0.3)'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Product
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Units Sold
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.leastSoldProducts.map((product, index) => (
                      <tr key={product.rank} style={{ 
                        background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                      }}>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29'
                        }}>
                          {product.name}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {product.units}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          
          {/* 3. Inventory Alerts */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-warehouse" style={{ marginRight: '10px' }}></i>3. Inventory Alerts
            </h2>
            
            {/* Low Stock */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-exclamation-triangle" style={{ color: '#dc3545' }}></i>
                Low Stock Products
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(125, 141, 134, 0.3)'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Product
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Current Stock
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Reorder Level
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'center',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.lowStock.map((item, index) => (
                      <tr key={index} style={{ 
                        background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                      }}>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29'
                        }}>
                          {item.product}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {item.current}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {item.reorder}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'center',
                          color: '#3e3f29'
                        }}>
                          {item.urgent && <span style={{ color: '#dc3545', fontWeight: 'bold' }}>URGENT</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Out of Stock */}
            {reportData.outOfStock.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{
                  color: '#3e3f29',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-box" style={{ color: '#dc3545' }}></i>
                  Out of Stock Products
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid rgba(125, 141, 134, 0.3)'
                  }}>
                    <thead>
                      <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                        <th style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'left',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          Product
                        </th>
                        <th style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'center',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          Last Stock Date
                        </th>
                        <th style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'center',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          Expected Delivery
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.outOfStock.map((item, index) => (
                        <tr key={index} style={{ 
                          background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                        }}>
                          <td style={{
                            border: '1px solid rgba(125, 141, 134, 0.3)',
                            padding: '12px',
                            color: '#3e3f29'
                          }}>
                            {item.product}
                          </td>
                          <td style={{
                            border: '1px solid rgba(125, 141, 134, 0.3)',
                            padding: '12px',
                            textAlign: 'center',
                            color: '#7d8d86'
                          }}>
                            {item.lastStock}
                          </td>
                          <td style={{
                            border: '1px solid rgba(125, 141, 134, 0.3)',
                            padding: '12px',
                            textAlign: 'center',
                            color: '#7d8d86'
                          }}>
                            {item.expectedDelivery}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
          
          {/* 4. Staff Performance */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-users" style={{ marginRight: '10px' }}></i>4. Staff Performance
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid rgba(125, 141, 134, 0.3)'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'left',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Cashier
                    </th>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'right',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Revenue Handled
                    </th>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'right',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Transactions
                    </th>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'right',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Avg Transaction
                    </th>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'right',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Hours
                    </th>
                    <th style={{
                      border: '1px solid rgba(125, 141, 134, 0.3)',
                      padding: '12px',
                      textAlign: 'right',
                      color: '#3e3f29',
                      fontWeight: '600'
                    }}>
                      Accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.staff.map((employee, index) => (
                    <tr key={index} style={{ 
                      background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                    }}>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        {employee.name}
                      </td>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29'
                      }}>
                        {formatCurrency(employee.revenue)}
                      </td>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29'
                      }}>
                        {employee.transactions}
                      </td>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29'
                      }}>
                        {formatCurrency(employee.avgTransaction)}
                      </td>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29'
                      }}>
                        {employee.hours}h
                      </td>
                      <td style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29'
                      }}>
                        {employee.accuracy}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          
          {/* 5. Side Business Performance */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-store" style={{ marginRight: '10px' }}></i>5. Side Business Performance
            </h2>
            
            {reportData.sideBusinesses.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(125, 141, 134, 0.3)'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(125, 141, 134, 0.1)' }}>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Business Name
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Revenue
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Transactions
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'right',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Avg Transaction
                      </th>
                      <th style={{
                        border: '1px solid rgba(125, 141, 134, 0.3)',
                        padding: '12px',
                        textAlign: 'left',
                        color: '#3e3f29',
                        fontWeight: '600'
                      }}>
                        Top Items
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sideBusinesses.map((business, index) => (
                      <tr key={index} style={{ 
                        background: index % 2 === 0 ? 'rgba(125, 141, 134, 0.05)' : 'transparent' 
                      }}>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29',
                          fontWeight: '600'
                        }}>
                          {business.name}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {formatCurrency(business.revenue)}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {business.transactions}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          textAlign: 'right',
                          color: '#3e3f29'
                        }}>
                          {formatCurrency(business.avgTransaction)}
                        </td>
                        <td style={{
                          border: '1px solid rgba(125, 141, 134, 0.3)',
                          padding: '12px',
                          color: '#3e3f29'
                        }}>
                          {business.topItems.map((item, itemIndex) => (
                            <div key={itemIndex} style={{ 
                              fontSize: '12px',
                              marginBottom: '2px',
                              color: '#7d8d86'
                            }}>
                              {item.name}: {item.units} units ({formatCurrency(item.revenue)})
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#7d8d86',
                background: 'rgba(125, 141, 134, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <i className="fa-solid fa-store" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                No side business sales data found for this period.
              </div>
            )}
          </section>
          
          {/* 6. Report Footer */}
          <section style={{
            borderTop: '2px solid rgba(125, 141, 134, 0.3)',
            paddingTop: '20px',
            marginTop: '40px'
          }}>
            <h2 style={{
              color: '#3e3f29',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '20px'
            }}>
              <i className="fa-solid fa-file-text" style={{ marginRight: '10px' }}></i>6. Report Footer
            </h2>
            
            <div style={{
              background: 'rgba(125, 141, 134, 0.1)',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid rgba(125, 141, 134, 0.2)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <h3 style={{
                    color: '#3e3f29',
                    fontWeight: '600',
                    marginBottom: '10px'
                  }}>
                    {currentBusiness?.business_name || currentBusiness?.name || 'Business'}
                  </h3>
                  <p style={{
                    color: '#7d8d86',
                    fontSize: '14px',
                    margin: '5px 0'
                  }}>
                    Unit 2 Glenmore Park, Dundalk, Co. Louth
                  </p>
                  <p style={{
                    color: '#7d8d86',
                    fontSize: '14px',
                    margin: '5px 0'
                  }}>
                    Phone: 087 797 0412
                  </p>
                  <p style={{
                    color: '#7d8d86',
                    fontSize: '14px',
                    margin: '5px 0'
                  }}>
                    VAT Number: IE1234567A
                  </p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    color: '#7d8d86',
                    fontSize: '14px',
                    margin: '5px 0'
                  }}>
                    <strong>Reporting Period:</strong> Week 37: 9-15 September 2025
                  </p>
                  <p style={{
                    color: '#7d8d86',
                    fontSize: '14px',
                    margin: '5px 0'
                  }}>
                    <strong>Generated on:</strong> {new Date().toLocaleDateString('en-IE', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(125, 141, 134, 0.2)'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#7d8d86',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  This report was automatically generated by the {currentBusiness?.business_name || currentBusiness?.name || 'Business'} POS System. 
                  For questions or clarifications, contact the store manager.
                </p>
              </div>
            </div>
          </section>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
