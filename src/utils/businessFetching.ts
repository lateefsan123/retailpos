// Business fetching utilities for subdomain-based lookups
// Handles fetching business data by subdomain and checking availability

import { supabase } from '../lib/supabaseClient';
import { BusinessInfo } from '../types/multitenant';

export const fetchBusinessBySubdomain = async (subdomain: string): Promise<BusinessInfo | null> => {
  try {
    console.log('🔍 fetchBusinessBySubdomain called with:', subdomain);
    
    const { data, error } = await supabase
      .from('business_info')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('customer_portal_enabled', true)
      .single();

    console.log('🔍 Supabase query result:', { data, error });

    if (error) {
      console.error('❌ Error fetching business by subdomain:', error);
      return null;
    }

    console.log('✅ Business found:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception fetching business:', err);
    return null;
  }
};

export const checkSubdomainAvailability = async (subdomain: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('business_info')
    .select('subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle();

  return !data && !error;
};
