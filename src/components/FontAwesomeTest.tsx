import React, { useEffect, useState } from 'react';

const FontAwesomeTest: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const testFontAwesome = () => {
      const results: string[] = [];
      
      // Test if FontAwesome is loaded
      const testElement = document.createElement('i');
      testElement.className = 'fas fa-check';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.visibility = 'hidden';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement);
      const fontFamily = computedStyle.getPropertyValue('font-family');
      
      document.body.removeChild(testElement);
      
      if (fontFamily.includes('Font Awesome')) {
        results.push('✅ FontAwesome is loaded');
        setIsLoaded(true);
      } else {
        results.push('❌ FontAwesome is not loaded');
        setIsLoaded(false);
      }
      
      // Test specific icons
      const testIcons = [
        'fas fa-check',
        'fas fa-times',
        'fas fa-plus',
        'fas fa-user',
        'fas fa-store',
        'fas fa-chart-line',
        'fas fa-credit-card',
        'fas fa-shopping-cart'
      ];
      
      testIcons.forEach(iconClass => {
        const testIcon = document.createElement('i');
        testIcon.className = iconClass;
        testIcon.style.position = 'absolute';
        testIcon.style.left = '-9999px';
        testIcon.style.visibility = 'hidden';
        document.body.appendChild(testIcon);
        
        const iconStyle = window.getComputedStyle(testIcon);
        const iconFontFamily = iconStyle.getPropertyValue('font-family');
        
        document.body.removeChild(testIcon);
        
        if (iconFontFamily.includes('Font Awesome')) {
          results.push(`✅ ${iconClass} is working`);
        } else {
          results.push(`❌ ${iconClass} is not working`);
        }
      });
      
      setTestResults(results);
    };

    // Test after a short delay to ensure FontAwesome has loaded
    setTimeout(testFontAwesome, 1000);
  }, []);

  if (!isLoaded) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        maxWidth: '400px'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#dc2626' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          FontAwesome Loading...
        </h3>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {result}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null; // Don't render anything if FontAwesome is working
};

export default FontAwesomeTest;
