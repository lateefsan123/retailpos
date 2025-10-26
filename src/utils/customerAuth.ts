import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

export const findCustomerByIdentifier = async (identifier: string, branchId: number) => {
  // Try to find by email first
  if (validateEmail(identifier)) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', identifier)
      .eq('branch_id', branchId)
      .maybeSingle();
    
    if (data && !error) return data;
  }
  
  // Try to find by phone number
  const { data: phoneData, error: phoneError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', identifier)
    .eq('branch_id', branchId)
    .maybeSingle();
  
  if (phoneData && !phoneError) return phoneData;
  
  // Try to find by customer ID if numeric
  if (/^\d+$/.test(identifier)) {
    const { data: idData, error: idError } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', parseInt(identifier))
      .eq('branch_id', branchId)
      .maybeSingle();
    
    if (idData && !idError) return idData;
  }
  
  return null;
};

export const setupCustomerAccount = async (
  customerId: number,
  email: string,
  password: string
) => {
  const passwordHash = await hashPassword(password);
  
  const { data, error } = await supabase
    .from('customers')
    .update({
      email,
      password_hash: passwordHash,
      account_setup_complete: true
    })
    .eq('customer_id', customerId)
    .select()
    .single();
  
  return { data, error };
};
