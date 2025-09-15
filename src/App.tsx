import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NavProvider, useNav } from './contexts/NavContext'
import { RoleProvider } from './contexts/RoleContext'
import { useNavCollapse } from './hooks/useNavCollapse'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Navigation from './components/Navigation'
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
  
  // Use the custom hook to handle global click events
  useNavCollapse()
  
  return (
    <div style={{ height: '100vh', background: '#f8f9fa', color: '#3e3f29', display: 'flex', overflow: 'hidden' }}>
      <Navigation />
      <main style={{
        flex: 1,
        marginLeft: isCollapsed ? '60px' : '160px',
        padding: '24px',
        height: '100vh',
        overflow: 'auto',
        transition: 'margin-left 0.3s ease',
        backgroundImage: 'url(/images/backgrounds/appbg3.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}>
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          <img 
            src="/images/backgrounds/logo1.png" 
            alt="Company Logo" 
            style={{
              height: '120px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>
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
          <Router>
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          </Router>
        </NavProvider>
      </RoleProvider>
    </AuthProvider>
  )
}

export default App
