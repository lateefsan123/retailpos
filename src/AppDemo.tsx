import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './utils/fontAwesomeFix' // Ensure FontAwesome is loaded
import { AuthProvider } from './contexts/DemoAuthContext'
import { BusinessProvider } from './contexts/DemoBusinessContext'
import { StaffProvider } from './contexts/DemoStaffContext'
import { NavProvider, useNav } from './contexts/NavContext'
import { RoleProvider } from './contexts/DemoRoleContext'
import { PinProvider } from './contexts/DemoPinContext'
import { useNavCollapse } from './hooks/useNavCollapse'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Navigation from './components/Navigation'
import UserProfileDropdown from './components/UserProfileDropdown'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import EmailVerification from './pages/EmailVerification'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import SideBusinesses from './pages/SideBusinesses'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Admin from './pages/Admin'
import UserRoleLogin from './pages/UserRoleLogin'
import UserSelection from './pages/UserSelection'
import Reminders from './pages/Reminders'

const AppContent = () => {
  const { isCollapsed } = useNav()
  useNavCollapse()
  useGlobalShortcuts()

  return (
    <div style={{ 
      height: '100vh', 
      background: '#f8f9fa', 
      color: '#1a1a1a', 
      display: 'flex', 
      overflow: 'hidden',
      backgroundImage: 'url(/retailpos/images/backgrounds/u2541828551_An_elegant_illustration_of_a_small_African_corner_5e875dd7-e5d8-4655-af92-bb5c9c2865fd_1.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative'
    }}>
      {/* Dark overlay to reduce brightness - covers entire app */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        zIndex: 0
      }}></div>
      
      {/* Demo Mode Banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#10b981',
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: 1002
      }}>
DEMO MODE - All data is simulated for demonstration purposes
      </div>
      
      {/* User Profile Dropdown - Top Right */}
      <div style={{
        position: 'fixed',
        top: '48px', // Adjusted for demo banner
        right: '20px',
        zIndex: 1001
      }}>
        <UserProfileDropdown />
      </div>
      
      <Navigation />
      <main style={{
        flex: 1,
        marginLeft: isCollapsed ? '70px' : '200px',
        padding: '24px',
        height: '100vh',
        overflow: 'auto',
        transition: 'margin-left 0.3s ease',
        position: 'relative',
        zIndex: 1,
        marginTop: '40px' // Account for demo banner
      }}>
        <div style={{
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
              <RoleProtectedRoute>
                <SideBusinesses />
              </RoleProtectedRoute>
            } />
            <Route path="/transactions" element={
              <RoleProtectedRoute>
                <Transactions />
              </RoleProtectedRoute>
            } />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/transaction/:transactionId" element={<TransactionDetail />} />
          </Routes>
        </div>
      </main>
    </div>
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

function AppDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <StaffProvider>
            <RoleProvider>
              <NavProvider>
                <PinProvider>
                    <Router basename="/retailpos">
                      <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/landing" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/verify-email" element={<EmailVerification />} />
                        <Route path="/staff-login" element={<UserRoleLogin />} />
                        <Route path="/user-selection" element={<UserSelection />} />
                        <Route path="/*" element={<AppContent />} />
                      </Routes>
                    </Router>
                </PinProvider>
              </NavProvider>
            </RoleProvider>
          </StaffProvider>
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default AppDemo
