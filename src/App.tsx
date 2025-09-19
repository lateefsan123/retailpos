import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NavProvider, useNav } from './contexts/NavContext'
import { RoleProvider } from './contexts/RoleContext'
import { PinProvider } from './contexts/PinContext'
import { useNavCollapse } from './hooks/useNavCollapse'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Navigation from './components/Navigation'
import Login from './pages/Login'  // Add this import
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import SideBusinesses from './pages/SideBusinesses'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Admin from './pages/Admin'
import Reminders from './pages/Reminders'

const AppContent = () => {
  const { isCollapsed } = useNav()
  useNavCollapse()

  return (
    <div style={{ 
      height: '100vh', 
      background: '#f8f9fa', 
      color: '#1a1a1a', 
      display: 'flex', 
      overflow: 'hidden',
      backgroundImage: 'url(/images/backgrounds/appbg3.png)',
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
      <Navigation />
      <main style={{
        flex: 1,
        marginLeft: isCollapsed ? '60px' : '160px',
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
            <Route path="/" element={<Dashboard />} />
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

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <NavProvider>
          <PinProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
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
    </AuthProvider>
  )
}

export default App