import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import { BranchProvider, useBranch } from './contexts/BranchContext'
import { NavProvider } from './contexts/NavContext'
import { RoleProvider } from './contexts/RoleContext'
import { PinProvider } from './contexts/PinContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useNavCollapse } from './hooks/useNavCollapse'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Navigation from './components/Navigation'
import LoadingScreen from './components/LoadingScreen'
import MobileRedirect from './components/MobileRedirect'
import DesktopRedirect from './components/DesktopRedirect'
import RootRedirect from './components/RootRedirect'
import Landing from './pages/Landing'
import Login from './pages/Login'
import LoginMobile from './pages/LoginMobile'
import Signup from './pages/Signup'
import SignupMobile from './pages/SignupMobile'
import Dashboard from './pages/Dashboard'
import DashboardMobile from './pages/DashboardMobile'
import Products from './pages/Products'
import ProductsMobile from './pages/ProductsMobile'
import Sales from './pages/Sales'
import SalesMobile from './pages/SalesMobile'
import SideBusinesses from './pages/SideBusinesses'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Admin from './pages/Admin'
import Reminders from './pages/Reminders'
import SelectUser from './pages/SelectUser'
import SelectUserMobile from './pages/SelectUserMobile'
import SwitchUser from './pages/SwitchUser'
import Suppliers from './pages/Suppliers'
import Promotions from './pages/Promotions'
import Vouchers from './pages/Vouchers'
import VerificationAdmin from './pages/VerificationAdmin'
import CustomerLoyalty from './pages/CustomerLoyalty'
import CustomerCustomization from './pages/CustomerCustomization'
import TransactionsMobile from './pages/TransactionsMobile'
import ProductDatabase from './pages/ProductDatabase'
import CustomerPortal from './pages/CustomerPortal'

const AppContent = () => {
  const location = useLocation()
  const { isSwitchingBranch, switchingToBranch } = useBranch()
  const { theme } = useTheme()
  const isMobileDashboard = location.pathname.startsWith('/dashboard-mobile') || location.pathname.startsWith('/products-mobile') || location.pathname.startsWith('/transactions-mobile') || location.pathname.startsWith('/sales-mobile')
  useNavCollapse()

  // Render mobile pages separately without the main app layout
  if (isMobileDashboard) {
    return (
      <>
        {location.pathname.startsWith('/dashboard-mobile') && <DashboardMobile />}
        {location.pathname.startsWith('/products-mobile') && <ProductsMobile />}
        {location.pathname.startsWith('/transactions-mobile') && <TransactionsMobile />}
        {location.pathname.startsWith('/sales-mobile') && <SalesMobile />}
        <LoadingScreen 
          isVisible={isSwitchingBranch} 
          message={switchingToBranch ? `Switching to ${switchingToBranch}...` : "Switching Branch..."} 
        />
      </>
    )
  }

  // Theme-aware background configuration - only background image changes
  const getBackgroundImage = () => {
    if (theme === 'light') {
      return 'url(images/backgrounds/stribebg_white.png)'
    }
    return 'url(images/backgrounds/stribebg.png)'
  }

  return (
    <>
      <div style={{ 
        height: '100vh', 
        background: '#f8f9fa', 
        color: '#1a1a1a', 
        display: 'flex', 
        overflow: 'hidden',
        backgroundImage: getBackgroundImage(),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        position: 'relative'
      }}>
        {!isMobileDashboard && <Navigation />}


        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative'
        }}>
          <main style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto',
              position: 'relative'
            }}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={
                <RoleProtectedRoute>
                  <Products />
                </RoleProtectedRoute>
              } />
              <Route path="/products-mobile" element={
                <RoleProtectedRoute>
                  <ProductsMobile />
                </RoleProtectedRoute>
              } />
              <Route path="/sales" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <Sales />
                </RoleProtectedRoute>
              } />
              <Route path="/sales-mobile" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <SalesMobile />
                </RoleProtectedRoute>
              } />
              <Route path="/side-businesses" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <SideBusinesses />
                </RoleProtectedRoute>
              } />
              <Route path="/transactions" element={
                <RoleProtectedRoute>
                  <Transactions />
                </RoleProtectedRoute>
              } />
              <Route path="/transactions-mobile" element={
                <RoleProtectedRoute>
                  <TransactionsMobile />
                </RoleProtectedRoute>
              } />
              <Route path="/customer-loyalty" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <CustomerLoyalty />
                </RoleProtectedRoute>
              } />
              <Route path="/customer-customization" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <CustomerCustomization />
                </RoleProtectedRoute>
              } />
              <Route path="/admin" element={
                <RoleProtectedRoute requiredPermission="canManageUsers">
                  <Admin />
                </RoleProtectedRoute>
              } />
              <Route path="/verification-admin" element={<VerificationAdmin />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/suppliers" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <Suppliers />
                </RoleProtectedRoute>
              } />
              <Route path="/promotions" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <Promotions />
                </RoleProtectedRoute>
              } />
              <Route path="/vouchers" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <Vouchers />
                </RoleProtectedRoute>
              } />
              <Route path="/product-database" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <ProductDatabase />
                </RoleProtectedRoute>
              } />
              <Route path="/transaction/:transactionId" element={<TransactionDetail />} />
            </Routes>
          </div>
        </main>
      </div>
      </div>
      
      {/* Loading Screen */}
      <LoadingScreen 
        isVisible={isSwitchingBranch} 
        message={switchingToBranch ? `Switching to ${switchingToBranch}...` : "Switching Branch..."} 
      />
    </>
  )
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in newer versions)
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BusinessProvider>
            <BranchProvider>
              <RoleProvider>
                <NavProvider>
                  <PinProvider>
                  <Router basename="/">
                    <MobileRedirect>
                      <DesktopRedirect>
                        <Routes>
                          <Route path="/" element={<RootRedirect />} />
                          <Route path="/landing" element={<Landing />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/login-mobile" element={<LoginMobile />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/signup-mobile" element={<SignupMobile />} />
                          <Route path="/select-user" element={<SelectUser />} />
                          <Route path="/select-user-mobile" element={<SelectUserMobile />} />
                          <Route path="/switch-user" element={<SwitchUser />} />
                          <Route path="/customer-portal" element={<CustomerPortal />} />
                          <Route path="/customer-portal/*" element={<CustomerPortal />} />
                          <Route path="/*" element={
                            <ProtectedRoute>
                              <AppContent />
                            </ProtectedRoute>
                          } />
                        </Routes>
                      </DesktopRedirect>
                    </MobileRedirect>
                  </Router>
                  </PinProvider>
                </NavProvider>
              </RoleProvider>
            </BranchProvider>
          </BusinessProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
