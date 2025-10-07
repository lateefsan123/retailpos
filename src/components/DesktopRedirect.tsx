import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

const DesktopRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useDeviceDetection();

  useEffect(() => {
    // Only redirect if on desktop
    if (!isDesktop) return;

    // Don't redirect if not on a mobile page
    if (!location.pathname.includes('-mobile')) return;

    // Define desktop route mappings (reverse of mobile)
    const routeMappings: { [key: string]: string } = {
      '/dashboard-mobile': '/dashboard',
      '/products-mobile': '/products',
      '/sales-mobile': '/sales',
      '/transactions-mobile': '/transactions',
      '/select-user-mobile': '/select-user',
      '/login-mobile': '/login',
      '/signup-mobile': '/signup'
    };

    // Check if current path needs to be redirected
    const currentPath = location.pathname;
    
    // Exact match redirect
    if (routeMappings[currentPath]) {
      navigate(routeMappings[currentPath], { replace: true });
      return;
    }

    // Handle transaction detail pages
    if (currentPath.startsWith('/transactions-mobile/')) {
      const transactionId = currentPath.split('/transactions-mobile/')[1];
      navigate(`/transactions/${transactionId}`, { replace: true });
      return;
    }

  }, [isDesktop, location.pathname, navigate]);

  return <>{children}</>;
};

export default DesktopRedirect;

