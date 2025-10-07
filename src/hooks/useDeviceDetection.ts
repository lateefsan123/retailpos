import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;

      // Check for mobile devices
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      
      // Check for tablets
      const isTabletUA = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
      
      // Also check screen width
      const isMobileWidth = width < 768;
      const isTabletWidth = width >= 768 && width < 1024;

      const isMobile = isMobileUA || isMobileWidth;
      const isTablet = isTabletUA || isTabletWidth;
      const isDesktop = !isMobile && !isTablet;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceInfo;
};

export default useDeviceDetection;

