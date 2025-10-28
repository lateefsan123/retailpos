// Subdomain utility functions for customer portal subdomain support
// Handles subdomain extraction, validation, and generation

export const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  
  // Development: localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check for subdomain in URL params for local testing
    const params = new URLSearchParams(window.location.search);
    const subdomain = params.get('subdomain');
    console.log('🔍 Local development subdomain detection:', { hostname, subdomain, search: window.location.search });
    return subdomain;
  }
  
  // Production: extract subdomain from hostname
  const parts = hostname.split('.');
  
  // tillpoint.net = 2 parts, shopname.tillpoint.net = 3 parts
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Exclude 'www' as a valid subdomain
    if (subdomain !== 'www') {
      return subdomain;
    }
  }
  
  return null;
};

export const validateSubdomain = (subdomain: string): boolean => {
  // 3-50 characters, alphanumeric and hyphens only, no leading/trailing hyphens
  const regex = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;
  return regex.test(subdomain);
};

export const generateSubdomainFromName = (businessName: string): string => {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Limit length
};
