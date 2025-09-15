// Test script to check current database schema
// Run this with: node test_schema.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wuluriiajnaruvaldlhb.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('Please set VITE_SUPABASE_ANON_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSchema() {
  try {
    console.log('Testing current users table schema...')
    
    // Test basic query
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error querying users table:', error)
      return
    }
    
    console.log('✅ Users table is accessible')
    console.log('Sample user data:', data[0])
    
    // Test if email column exists
    try {
      const { data: emailTest, error: emailError } = await supabase
        .from('users')
        .select('email')
        .limit(1)
      
      if (emailError) {
        console.log('❌ Email column does not exist yet')
      } else {
        console.log('✅ Email column exists')
      }
    } catch (e) {
      console.log('❌ Email column does not exist yet')
    }
    
    // Test if role column exists
    try {
      const { data: roleTest, error: roleError } = await supabase
        .from('users')
        .select('role')
        .limit(1)
      
      if (roleError) {
        console.log('❌ Role column does not exist yet (using user_role)')
      } else {
        console.log('✅ Role column exists')
      }
    } catch (e) {
      console.log('❌ Role column does not exist yet (using user_role)')
    }
    
  } catch (error) {
    console.error('Schema test failed:', error)
  }
}

testSchema()
