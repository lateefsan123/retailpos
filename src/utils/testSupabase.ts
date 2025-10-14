import { supabase } from '../lib/supabaseClient'

export const testSupabaseConnection = async () => {
  try {
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      return { success: false, error: 'Connection failed: ' + connectionError.message }
    }
    
    // Test 2: Check if required tables exist
    const tables = ['users', 'business_info', 'branches']
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          return { success: false, error: `Table ${table} not accessible: ` + error.message }
        }
      } catch (err) {
        return { success: false, error: `Error checking table ${table}: ` + (err instanceof Error ? err.message : 'Unknown error') }
      }
    }
    
    // Test 3: Check if auth_user_id column exists
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('auth_user_id')
        .limit(1)
      
      if (userError && userError.message.includes('column "auth_user_id" does not exist')) {
        return { success: false, error: 'Database migration not run. Please run supabase_auth_migration.sql in your Supabase SQL Editor.' }
      }
    } catch (err) {
      return { success: false, error: 'Error checking auth_user_id column: ' + (err instanceof Error ? err.message : 'Unknown error') }
    }
    
    // Test 4: Test Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (authError) {
        return { success: false, error: 'Supabase Auth error: ' + authError.message }
      }
    } catch (err) {
      return { success: false, error: 'Error testing Supabase Auth: ' + (err instanceof Error ? err.message : 'Unknown error') }
    }
    
    return { success: true }
    
  } catch (error) {
    return { success: false, error: 'Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error') }
  }
}
