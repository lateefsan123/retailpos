import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import { BranchProvider, useBranch } from './contexts/BranchContext'
import { NavProvider, useNav } from './contexts/NavContext'
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

const AppContent = () => {
  const { isCollapsed } = useNav()
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
        <UserMenu />
        <main style={{
          flex: 1,
          marginLeft: isCollapsed ? '70px' : '200px',
          padding: '24px',
          height: '100vh',
          overflow: 'auto',
          transition: 'margin-left 0.3s ease',
          position: 'relative',
          zIndex: 1
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
                <RoleProtectedRoute requiredPermission="canProcessSales">
                  <SideBusinesses />
                </RoleProtectedRoute>
              } />
              <Route path="/transactions" element={
                <RoleProtectedRoute>
                  <Transactions />
                </RoleProtectedRoute>
              } />
              <Route path="/admin" element={
                <RoleProtectedRoute requiredPermission="canManageUsers">
                  <Admin />
                </RoleProtectedRoute>
              } />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/transaction/:transactionId" element={<TransactionDetail />} />
            </Routes>
          </div>
        </main>
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