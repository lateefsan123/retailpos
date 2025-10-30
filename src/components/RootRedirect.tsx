import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { getSubdomain } from '../utils/subdomain';

const RootRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDeviceDetection();

  useEffect(() => {
    // Check if we're already on customer portal path - don't redirect away
    if (window.location.pathname.startsWith('/customer-portal')) {
      console.log('🔍 Already on customer portal path, staying here');
      return;
    }

    // Check for subdomain first
    const subdomain = getSubdomain();
    console.log('🔍 RootRedirect subdomain check:', { 
      subdomain, 
      hostname: window.location.hostname,
      search: window.location.search,
      href: window.location.href 
    });
    
    if (subdomain) {
      // If subdomain exists, redirect to customer portal
      console.log('🔍 Redirecting to customer portal for subdomain:', subdomain);
      navigate('/customer-portal', { replace: true });
      return;
    }

    // No subdomain - proceed with normal device-based redirects
    if (isMobile || isTablet) {
      navigate('/login-mobile', { replace: true });
    } else {
      navigate('/landing', { replace: true });
    }
  }, [isMobile, isTablet, navigate]);

  return null;
};

export default RootRedirect;

