# 🎯 TillPoint Demo Mode

## Quick Access to Demo

You can now access the TillPoint POS system with pre-loaded dummy data in several ways:

### Method 1: From Landing Page
1. Go to the landing page (`/`)
2. Click the **"🎯 Try Demo"** button
3. You'll be automatically logged in with demo data

### Method 2: Direct Demo Access
1. Click the **"🚀 Enter Demo Mode"** toggle in the top-left corner
2. The page will reload in demo mode
3. Navigate to any page (dashboard, sales, products, etc.)

### Method 3: URL Access
- Visit `/retailpos/dashboard` and click the demo toggle
- Or visit any protected route and use the demo toggle

## Demo Data Included

### User Account
- **Email**: demo@example.com
- **Role**: Admin
- **Business ID**: 1

### Business Information
- **Name**: Demo Retail Store
- **Type**: Retail Store
- **Address**: 123 Main Street, City, State 12345
- **Phone**: +1 (555) 123-4567
- **Hours**: 9:00 AM - 6:00 PM

### Staff Members
1. **Demo Admin** (demo@example.com) - Full access
2. **John Cashier** (cashier1@example.com) - Sales & Products
3. **Jane Manager** (manager1@example.com) - Sales, Products, Inventory, Reports

## Features Available in Demo

✅ **Dashboard** - Overview with sample data  
✅ **Products** - Sample product catalog  
✅ **Sales** - Point of sale interface  
✅ **Transactions** - Transaction history  
✅ **Admin** - User and business management  
✅ **Side Businesses** - Additional business tracking  
✅ **Reminders** - Task management  

## Demo Mode Features

- 🎯 **Green banner** indicates demo mode
- 🔄 **Toggle button** to switch between demo and regular mode
- 📊 **Pre-loaded data** for all features
- 🚫 **No database required** - all data is simulated
- ⚡ **Instant access** - no signup or login required

## Exiting Demo Mode

1. Click the **"🎯 Demo Mode - Click to Exit"** button in the top-left
2. Or clear localStorage: `localStorage.removeItem('demoMode')`
3. Refresh the page

## Technical Details

- Demo mode uses `DemoAuthContext`, `DemoBusinessContext`, and `DemoStaffContext`
- All database calls are simulated with dummy data
- No actual Supabase connection required
- Perfect for demonstrations and testing

---

**Enjoy exploring TillPoint! 🚀**
