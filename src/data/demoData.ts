// Demo data for the POS system
export const demoProducts = [
  {
    product_id: 'PROD001',
    name: 'Wireless Headphones',
    category: 'Electronics',
    price: 99.99,
    stock_quantity: 25,
    description: 'High-quality wireless headphones with noise cancellation',
    sku: 'WH-001',
    barcode: '1234567890123',
    is_weighted: false,
    image_url: null,
    business_id: 1
  },
  {
    product_id: 'PROD002',
    name: 'Coffee Beans (1kg)',
    category: 'Food & Beverage',
    price: 24.99,
    stock_quantity: 50,
    description: 'Premium coffee beans from Colombia',
    sku: 'CB-001',
    barcode: '1234567890124',
    is_weighted: true,
    price_per_unit: 24.99,
    weight_unit: 'kg',
    image_url: null,
    business_id: 1
  },
  {
    product_id: 'PROD003',
    name: 'Smartphone Case',
    category: 'Accessories',
    price: 19.99,
    stock_quantity: 100,
    description: 'Protective case for smartphones',
    sku: 'SC-001',
    barcode: '1234567890125',
    is_weighted: false,
    image_url: null,
    business_id: 1
  },
  {
    product_id: 'PROD004',
    name: 'Energy Drink',
    category: 'Food & Beverage',
    price: 3.99,
    stock_quantity: 200,
    description: 'High-energy drink for active lifestyle',
    sku: 'ED-001',
    barcode: '1234567890126',
    is_weighted: false,
    image_url: null,
    business_id: 1
  },
  {
    product_id: 'PROD005',
    name: 'Laptop Stand',
    category: 'Electronics',
    price: 45.99,
    stock_quantity: 15,
    description: 'Adjustable laptop stand for ergonomic workspace',
    sku: 'LS-001',
    barcode: '1234567890127',
    is_weighted: false,
    image_url: null,
    business_id: 1
  }
];

export const demoCustomers = [
  {
    customer_id: 1,
    name: 'John Smith',
    phone_number: '+1 (555) 123-4567',
    email: 'john.smith@email.com',
    loyalty_points: 150,
    business_id: 1
  },
  {
    customer_id: 2,
    name: 'Sarah Johnson',
    phone_number: '+1 (555) 234-5678',
    email: 'sarah.johnson@email.com',
    loyalty_points: 75,
    business_id: 1
  },
  {
    customer_id: 3,
    name: 'Mike Wilson',
    phone_number: '+1 (555) 345-6789',
    email: 'mike.wilson@email.com',
    loyalty_points: 200,
    business_id: 1
  }
];

export const demoSales = [
  {
    sale_id: 1,
    datetime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    total_amount: 119.98,
    payment_method: 'card',
    cashier_id: 2,
    customer_id: 1,
    discount_applied: 0,
    partial_payment: false,
    notes: 'Customer was very satisfied',
    business_id: 1,
    created_by_user_id: 2
  },
  {
    sale_id: 2,
    datetime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    total_amount: 24.99,
    payment_method: 'cash',
    cashier_id: 2,
    customer_id: 2,
    discount_applied: 5.00,
    partial_payment: false,
    notes: 'Loyalty discount applied',
    business_id: 1,
    created_by_user_id: 2
  },
  {
    sale_id: 3,
    datetime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    total_amount: 65.98,
    payment_method: 'card',
    cashier_id: 3,
    customer_id: 3,
    discount_applied: 0,
    partial_payment: false,
    notes: 'Bulk purchase',
    business_id: 1,
    created_by_user_id: 3
  }
];

export const demoSaleItems = [
  {
    sale_item_id: 1,
    sale_id: 1,
    product_id: 'PROD001',
    quantity: 1,
    price_each: 99.99,
    calculated_price: 99.99
  },
  {
    sale_item_id: 2,
    sale_id: 1,
    product_id: 'PROD003',
    quantity: 1,
    price_each: 19.99,
    calculated_price: 19.99
  },
  {
    sale_item_id: 3,
    sale_id: 2,
    product_id: 'PROD002',
    quantity: 1,
    price_each: 24.99,
    weight: 1.0,
    calculated_price: 24.99
  },
  {
    sale_item_id: 4,
    sale_id: 3,
    product_id: 'PROD005',
    quantity: 1,
    price_each: 45.99,
    calculated_price: 45.99
  },
  {
    sale_item_id: 5,
    sale_id: 3,
    product_id: 'PROD004',
    quantity: 5,
    price_each: 3.99,
    calculated_price: 19.95
  }
];

export const demoReminders = [
  {
    reminder_id: 1,
    owner_id: 1,
    title: 'Restock Coffee Beans',
    body: 'Coffee beans inventory is running low. Order more from supplier.',
    remind_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    created_at: new Date().toISOString(),
    resolved: false,
    business_id: 1
  },
  {
    reminder_id: 2,
    owner_id: 1,
    title: 'Monthly Sales Report',
    body: 'Generate and review monthly sales report for management.',
    remind_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
    created_at: new Date().toISOString(),
    resolved: false,
    business_id: 1
  },
  {
    reminder_id: 3,
    owner_id: 2,
    title: 'Staff Training Session',
    body: 'Conduct training session for new cashier on POS system.',
    remind_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    created_at: new Date().toISOString(),
    resolved: false,
    business_id: 1
  }
];
