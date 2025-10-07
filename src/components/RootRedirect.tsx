import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

const RootRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDeviceDetection();

  useEffect(() => {
    if (isMobile || isTablet) {
      navigate('/login-mobile', { replace: true });
    } else {
      navigate('/landing', { replace: true });
    }
  }, [isMobile, isTablet, navigate]);

  return null;
};

export default RootRedirect;

