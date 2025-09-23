import { supabase } from '../lib/supabaseClient';
import { T } from '../lib/tables';

export async function diagnostics() {
  console.log('🔌 Supabase client ready:', !!supabase);

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) console.warn('⚠️ auth.getUser error:', userErr);
  console.log('👤 Auth user:', userData?.user ?? null);

  // Count-only head requests (detects RLS vs missing table)
  for (const table of [T.businessInfo, T.shopStaff, T.users, T.products]) {
    const { count, error, status } = await supabase
      .from(table)
      .select('*', { head: true, count: 'exact' });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('relation') && msg.includes('does not exist')) {
        console.error(`❌ Table "${table}" missing.`);
      } else if (status === 401 || status === 403 || msg.includes('permission denied')) {
        console.warn(`🚫 RLS/policy blocks "${table}" (exists but no access).`);
      } else {
        console.error(`❌ Error on "${table}":`, { status, error });
      }
    } else {
      console.log(`✅ "${table}" reachable. count:`, count);
    }
  }
}

export async function testInsertBusiness() {
  console.log('🔍 Testing insert after RLS fix...');
  const { data, error, status } = await supabase
    .from(T.businessInfo)
    .insert({
      business_name: 'test business',
      address: 'test address',
      phone_number: '1234567890',
    })
    .select('business_id, business_name')
    .single();

  if (error) {
    console.error('❌ Insert test error:', { status, error });
  } else {
    console.log('✅ Insert test result:', data);
  }
}
