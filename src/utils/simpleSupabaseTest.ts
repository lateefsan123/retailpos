import { supabase } from '../lib/supabaseClient'

export const simpleSupabaseTest = async () => {
  try {
    // Test 1: Just try to get the current session (no database calls)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return { success: false, error: 'Supabase Auth error: ' + sessionError.message }
    }
    
    // Test 2: Try a very simple database query with timeout
    const queryPromise = supabase
      .from('users')
      .select('count')
      .limit(1)
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout after 10 seconds')), 10000)
    })
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any
    
    if (error) {
      return { success: false, error: 'Database error: ' + error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    return { success: false, error: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error') }
  }
}
