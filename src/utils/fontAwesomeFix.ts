// Utility to ensure FontAwesome icons are properly loaded and standardized
// This file helps maintain consistency across the application

export const ensureFontAwesome = () => {
  // Check if FontAwesome is loaded
  if (typeof window !== 'undefined') {
    const checkFontAwesome = () => {
      const testElement = document.createElement('i');
      testElement.className = 'fas fa-check';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement);
      const fontFamily = computedStyle.getPropertyValue('font-family');
      
      document.body.removeChild(testElement);
      
      return fontFamily.includes('Font Awesome');
    };

    // If FontAwesome is not loaded, try to reload it
    if (!checkFontAwesome()) {
      console.warn('FontAwesome not detected, attempting to reload...');
      
      // Remove existing FontAwesome script
      const existingScript = document.querySelector('script[src*="fontawesome"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Add new FontAwesome script
      const script = document.createElement('script');
      script.src = 'https://kit.fontawesome.com/95ad171bb5.js';
      script.crossOrigin = 'anonymous';
      script.async = true;
      document.head.appendChild(script);
      
      // Check again after a delay
      setTimeout(() => {
        if (checkFontAwesome()) {
          console.log('✅ FontAwesome loaded successfully');
        } else {
          console.error('❌ FontAwesome failed to load');
        }
      }, 2000);
    } else {
      console.log('✅ FontAwesome is already loaded');
    }
  }
};

// Standard icon mappings for consistency
export const iconMap = {
  // Common icons with standardized names
  'fa-solid fa-check': 'fas fa-check',
  'fa-solid fa-times': 'fas fa-times',
  'fa-solid fa-plus': 'fas fa-plus',
  'fa-solid fa-minus': 'fas fa-minus',
  'fa-solid fa-edit': 'fas fa-edit',
  'fa-solid fa-trash': 'fas fa-trash',
  'fa-solid fa-search': 'fas fa-search',
  'fa-solid fa-spinner': 'fas fa-spinner',
  'fa-solid fa-chevron-down': 'fas fa-chevron-down',
  'fa-solid fa-chevron-up': 'fas fa-chevron-up',
  'fa-solid fa-chevron-left': 'fas fa-chevron-left',
  'fa-solid fa-chevron-right': 'fas fa-chevron-right',
  'fa-solid fa-user': 'fas fa-user',
  'fa-solid fa-users': 'fas fa-users',
  'fa-solid fa-cog': 'fas fa-cog',
  'fa-solid fa-sign-out-alt': 'fas fa-sign-out-alt',
  'fa-solid fa-exchange-alt': 'fas fa-exchange-alt',
  'fa-solid fa-store': 'fas fa-store',
  'fa-solid fa-briefcase': 'fas fa-briefcase',
  'fa-solid fa-box': 'fas fa-box',
  'fa-solid fa-chart-line': 'fas fa-chart-line',
  'fa-solid fa-chart-bar': 'fas fa-chart-bar',
  'fa-solid fa-credit-card': 'fas fa-credit-card',
  'fa-solid fa-money-bill': 'fas fa-money-bill',
  'fa-solid fa-receipt': 'fas fa-receipt',
  'fa-solid fa-shopping-cart': 'fas fa-shopping-cart',
  'fa-solid fa-barcode': 'fas fa-barcode',
  'fa-solid fa-calculator': 'fas fa-calculator',
  'fa-solid fa-volume-high': 'fas fa-volume-high',
  'fa-solid fa-pause': 'fas fa-pause',
  'fa-solid fa-print': 'fas fa-print',
  'fa-solid fa-eye': 'fas fa-eye',
  'fa-solid fa-save': 'fas fa-save',
  'fa-solid fa-arrow-left': 'fas fa-arrow-left',
  'fa-solid fa-arrow-right': 'fas fa-arrow-right',
  'fa-solid fa-exclamation-triangle': 'fas fa-exclamation-triangle',
  'fa-solid fa-info-circle': 'fas fa-info-circle',
  'fa-solid fa-camera': 'fas fa-camera',
  'fa-solid fa-image': 'fas fa-image',
  'fa-solid fa-tag': 'fas fa-tag',
  'fa-solid fa-tags': 'fas fa-tags',
  'fa-solid fa-building': 'fas fa-building',
  'fa-solid fa-weight': 'fas fa-weight',
  'fa-solid fa-volume-up': 'fas fa-volume-up',
  'fa-solid fa-cash-register': 'fas fa-cash-register',
  'fa-solid fa-check-circle': 'fas fa-check-circle',
  'fa-solid fa-times-circle': 'fas fa-times-circle',
  'fa-solid fa-exclamation-circle': 'fas fa-exclamation-circle',
  'fa-solid fa-ban': 'fas fa-ban',
  'fa-solid fa-user-plus': 'fas fa-user-plus',
  'fa-solid fa-user-pen': 'fas fa-user-pen',
  'fa-solid fa-user-shield': 'fas fa-user-shield',
  'fa-solid fa-users-cog': 'fas fa-users-cog',
  'fa-solid fa-list': 'fas fa-list',
  'fa-solid fa-pen-to-square': 'fas fa-pen-to-square',
  'fa-solid fa-trash-can': 'fas fa-trash',
  'fa-solid fa-boxes-stacked': 'fas fa-boxes-stacked',
  'fa-solid fa-warehouse': 'fas fa-warehouse',
  'fa-solid fa-calendar-day': 'fas fa-calendar-day',
  'fa-solid fa-calendar-week': 'fas fa-calendar-week',
  'fa-solid fa-calendar-alt': 'fas fa-calendar-alt',
  'fa-solid fa-sticky-note': 'fas fa-sticky-note',
  'fa-solid fa-vault': 'fas fa-vault',
  'fa-solid fa-coins': 'fas fa-coins',
  'fa-solid fa-hand-holding-dollar': 'fas fa-hand-holding-dollar',
  'fa-solid fa-xmark': 'fas fa-times',
  'fa-solid fa-rotate-left': 'fas fa-rotate-left',
  'fa-solid fa-plus-circle': 'fas fa-plus-circle',
  'fa-solid fa-stop': 'fas fa-stop',
  'fa-solid fa-triangle-exclamation': 'fas fa-exclamation-triangle',
  'fa-solid fa-circle-check': 'fas fa-check-circle',
  'fa-solid fa-circle-xmark': 'fas fa-times-circle',
  'fa-solid fa-floppy-disk': 'fas fa-save',
  'fa-solid fa-euro-sign': 'fas fa-euro-sign',
  'fa-solid fa-briefcase': 'fas fa-briefcase'
};

// Function to get standardized icon class
export const getIconClass = (iconName: string): string => {
  return iconMap[iconName as keyof typeof iconMap] || iconName;
};

// Initialize FontAwesome when the module is imported
if (typeof window !== 'undefined') {
  ensureFontAwesome();
}
