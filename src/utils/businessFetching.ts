// Business fetching utilities for subdomain-based lookups
// Handles fetching business data by subdomain and checking availability

import { supabase } from '../lib/supabaseClient';
import { BusinessInfo } from '../types/multitenant';

export const fetchBusinessBySubdomain = async (subdomain: string): Promise<BusinessInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('business_info')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('customer_portal_enabled', true)
      .single();

    if (error) {
      console.error('Error fetching business by subdomain:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception fetching business:', err);
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
