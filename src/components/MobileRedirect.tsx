import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

const MobileRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet } = useDeviceDetection();

  useEffect(() => {
    // Only redirect if on mobile or tablet
    if (!isMobile && !isTablet) return;

    // Define mobile route mappings
    const routeMappings: { [key: string]: string } = {
      '/dashboard': '/dashboard-mobile',
      '/products': '/products-mobile',
      '/sales': '/sales-mobile',
      '/transactions': '/transactions-mobile',
      '/select-user': '/select-user-mobile',
      '/login': '/login-mobile',
      '/signup': '/signup-mobile'
    };

    // Check if current path needs to be redirected
    const currentPath = location.pathname;
    
    // Exact match redirect
    if (routeMappings[currentPath]) {
      navigate(routeMappings[currentPath], { replace: true });
      return;
    }

    // Handle transaction detail pages
    if (currentPath.startsWith('/transactions/') && !currentPath.includes('-mobile')) {
      const transactionId = currentPath.split('/transactions/')[1];
      navigate(`/transactions-mobile/${transactionId}`, { replace: true });
      return;
    }

    // If already on a mobile page, don't redirect
    if (currentPath.includes('-mobile')) {
      return;
    }

  }, [isMobile, isTablet, location.pathname, navigate]);

  return <>{children}</>;
};

export default MobileRedirect;

