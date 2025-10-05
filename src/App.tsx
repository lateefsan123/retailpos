import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import { BranchProvider, useBranch } from './contexts/BranchContext'
import { NavProvider } from './contexts/NavContext'
import { RoleProvider } from './contexts/RoleContext'
import { PinProvider } from './contexts/PinContext'
import { useNavCollapse } from './hooks/useNavCollapse'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Navigation from './components/Navigation'
import UserMenu from './components/UserMenu'
import LoadingScreen from './components/LoadingScreen'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import SideBusinesses from './pages/SideBusinesses'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Admin from './pages/Admin'
import Reminders from './pages/Reminders'
import SelectUser from './pages/SelectUser'
import Suppliers from './pages/Suppliers'
import SupplierCalendar from './components/SupplierCalendar'
import Promotions from './pages/Promotions'
import VerificationAdmin from './pages/VerificationAdmin'
import CustomerLoyalty from './pages/CustomerLoyalty'

const AppContent = () => {
  const { isSwitchingBranch, switchingToBranch } = useBranch()
  useNavCollapse()

  return (
    <>
      <div style={{ 
        height: '100vh', 
        background: '#f8f9fa', 
        color: '#1a1a1a', 
        display: 'flex', 
        overflow: 'hidden',
        backgroundImage: 'url(/images/backgrounds/u2541828551_An_elegant_illustration_of_a_small_African_corner_5e875dd7-e5d8-4655-af92-bb5c9c2865fd_1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}>
        {/* Dark overlay to reduce brightness - covers entdire app */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          zIndex: 0
        }}></div>
        <Navigation />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1
        }}>
          <UserMenu />
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
              position: 'relative',
              zIndex: 1
            }}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={
                <RoleProtectedRoute>
                  <Products />
                </RoleProtectedRoute>
              } />
              <Route path="/sales" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <Sales />
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
              <Route path="/customer-loyalty" element={
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <CustomerLoyalty />
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
              <Route path="/supplier-calendar" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <SupplierCalendar />
                </RoleProtectedRoute>
              } />
              <Route path="/promotions" element={
                <RoleProtectedRoute requiredPermission="canManageProducts">
                  <Promotions />
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
      <AuthProvider>
        <BusinessProvider>
          <BranchProvider>
            <RoleProvider>
              <NavProvider>
                <PinProvider>
                <Router basename="/">
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/select-user" element={<SelectUser />} />
                    <Route path="/*" element={
                      <ProtectedRoute>
                        <AppContent />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Router>
                </PinProvider>
              </NavProvider>
            </RoleProvider>
          </BranchProvider>
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App