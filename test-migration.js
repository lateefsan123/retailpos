// =====================================================
// MIGRATION TEST SCRIPT
// =====================================================
// This script tests the multi-tenant migration
// Run this in your browser console after migration
// =====================================================

console.log('🧪 Testing Multi-Tenant Migration...')

// Test 1: Check if business_info table exists
async function testBusinessInfo() {
  try {
    const response = await fetch('/api/business_info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      console.log('✅ Business Info table accessible')
      return true
    } else {
      console.log('❌ Business Info table not accessible')
      return false
    }
  } catch (error) {
    console.log('❌ Error testing Business Info:', error)
    return false
  }
}

// Test 2: Check if products table has business_id column
async function testProductsBusinessId() {
  try {
    const response = await fetch('/api/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.length > 0 && data[0].business_id !== undefined) {
        console.log('✅ Products table has business_id column')
        return true
      } else {
        console.log('❌ Products table missing business_id column')
        return false
      }
    } else {
      console.log('❌ Products table not accessible')
      return false
    }
  } catch (error) {
    console.log('❌ Error testing Products business_id:', error)
    return false
  }
}

// Test 3: Check if product_id is now TEXT
async function testProductIdType() {
  try {
    const response = await fetch('/api/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.length > 0) {
        const productId = data[0].product_id
        if (typeof productId === 'string') {
          console.log('✅ Product ID is now TEXT type')
          return true
        } else {
          console.log('❌ Product ID is still INTEGER type')
          return false
        }
      } else {
        console.log('⚠️ No products found to test')
        return true
      }
    } else {
      console.log('❌ Products table not accessible')
      return false
    }
  } catch (error) {
    console.log('❌ Error testing Product ID type:', error)
    return false
  }
}

// Test 4: Check if new tables exist
async function testNewTables() {
  const newTables = ['users', 'vault', 'vault_entries', 'inventory_movements']
  let allExist = true
  
  for (const table of newTables) {
    try {
      const response = await fetch(`/api/${table}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        console.log(`✅ ${table} table accessible`)
      } else {
        console.log(`❌ ${table} table not accessible`)
        allExist = false
      }
    } catch (error) {
      console.log(`❌ Error testing ${table}:`, error)
      allExist = false
    }
  }
  
  return allExist
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting migration tests...\n')
  
  const results = await Promise.all([
    testBusinessInfo(),
    testProductsBusinessId(),
    testProductIdType(),
    testNewTables()
  ])
  
  const passedTests = results.filter(result => result).length
  const totalTests = results.length
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Migration successful!')
  } else {
    console.log('⚠️ Some tests failed. Check the migration script.')
  }
}

// Manual test function for Supabase SQL Editor
function manualTestQueries() {
  console.log(`
🔧 Manual Test Queries (Run in Supabase SQL Editor):

-- Test 1: Check business_info table
SELECT * FROM business_info LIMIT 1;

-- Test 2: Check products table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('product_id', 'business_id');

-- Test 3: Check if products have business_id
SELECT product_id, name, business_id 
FROM products 
LIMIT 5;

-- Test 4: Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('users', 'vault', 'vault_entries', 'inventory_movements');

-- Test 5: Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('products', 'customers', 'sales')
ORDER BY tc.table_name;
  `)
}

// Export for use in browser console
window.testMigration = runAllTests
window.manualTestQueries = manualTestQueries

console.log('📝 Migration test functions loaded!')
console.log('Run testMigration() to test the migration')
console.log('Run manualTestQueries() to see manual test queries')
