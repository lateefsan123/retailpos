import React, { useState, useEffect } from 'react';

const DemoToggle: React.FC = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if we're in demo mode by looking at the current URL or localStorage
    const demoMode = localStorage.getItem('demoMode') === 'true' || 
                     window.location.pathname.includes('/demo');
    setIsDemoMode(demoMode);
  }, []);

  const toggleDemoMode = () => {
    const newDemoMode = !isDemoMode;
    setIsDemoMode(newDemoMode);
    localStorage.setItem('demoMode', newDemoMode.toString());
    
    // Reload the page to switch between demo and regular mode
    window.location.reload();
  };

  if (window.location.pathname.includes('/demo')) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 1003,
        backgroundColor: '#10b981',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }} onClick={toggleDemoMode}>
Demo Mode - Click to Exit
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 1003,
      backgroundColor: '#6b7280',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }} onClick={toggleDemoMode}>
Enter Demo Mode
    </div>
  );
};

export default DemoToggle;
