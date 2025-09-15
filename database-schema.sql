-- Database Schema for Retail POS System
-- Run these SQL commands in your Supabase SQL Editor

-- Products
CREATE TABLE products (
    product_id      TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT,
    price           DECIMAL(10,2) NOT NULL,
    stock_quantity  INTEGER DEFAULT 0,
    supplier_info   TEXT,
    reorder_level   INTEGER DEFAULT 0,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    image_url       TEXT,
    last_updated    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    customer_id     SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    phone_number    TEXT NOT NULL UNIQUE,
    email           TEXT,
    loyalty_points  INTEGER DEFAULT 0,
    credit_balance  DECIMAL(10,2) DEFAULT 0
);

-- Users (staff)
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    user_role            TEXT NOT NULL,          -- Owner, Manager, Cashier
    active          BOOLEAN DEFAULT TRUE,
    icon            TEXT DEFAULT 'lily'          -- Character icon for user
);

-- Sales (transaction header)
CREATE TABLE sales (
    sale_id         SERIAL PRIMARY KEY,
    datetime        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount    DECIMAL(10,2) NOT NULL,
    payment_method  TEXT NOT NULL,
    cashier_id      INTEGER REFERENCES users(user_id),
    customer_id     INTEGER REFERENCES customers(customer_id),
    discount_applied DECIMAL(10,2) DEFAULT 0
);

-- Sale Items (transaction details)
CREATE TABLE sale_items (
    sale_item_id    SERIAL PRIMARY KEY,
    sale_id         INTEGER REFERENCES sales(sale_id),
    product_id      TEXT REFERENCES products(product_id),
    quantity        INTEGER NOT NULL,
    price_each      DECIMAL(10,2) NOT NULL
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    movement_id     SERIAL PRIMARY KEY,
    product_id      TEXT REFERENCES products(product_id),
    quantity_change INTEGER NOT NULL,
    movement_type   TEXT NOT NULL,          -- Sale, Restock, Adjustment
    datetime        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_id    INTEGER
);

-- Business Information
CREATE TABLE business_info (
    business_id     SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    logo_url        TEXT,
    address         TEXT,
    phone_number    TEXT,
    vat_number      TEXT,
    receipt_footer  TEXT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample business info
INSERT INTO business_info (name, logo_url, address, phone_number, vat_number, receipt_footer) VALUES 
('LandM Store', '/images/backgrounds/logo1.png', 'Unit 2 Glenmore Park, Dundalk, Co. Louth', '087 797 0412', 'IE1234567A', 'Thank you for shopping with us! LandM Store - Your Local African Food Store');

-- Insert sample users
INSERT INTO users (username, password_hash, user_role, icon) VALUES 
('admin', 'admin123', 'Owner', 'ryu'),
('cashier1', 'cashier123', 'Cashier', 'chunli'),
('manager1', 'manager123', 'Manager', 'ken');

-- Insert sample products
INSERT INTO products (product_id, name, category, price, stock_quantity, reorder_level, image_url) VALUES 
('PROD001', 'Coca Cola 500ml', 'Beverages', 2.50, 5, 20, '/images/products/coca-cola.jpg'),
('PROD002', 'Chips Ahoy Cookies', 'Snacks', 3.99, 3, 10, '/images/products/chips-ahoy.jpg'),
('PROD003', 'iPhone Charger', 'Electronics', 15.99, 2, 5, '/images/products/iphone-charger.jpg'),
('PROD004', 'Energy Drink', 'Beverages', 4.50, 7, 15, '/images/products/energy-drink.jpg'),
('PROD005', 'Chocolate Bar', 'Candy', 1.99, 8, 30, '/images/products/chocolate-bar.jpg');

-- Side Businesses
CREATE TABLE side_businesses (
    business_id     SERIAL PRIMARY KEY,
    owner_id        INTEGER REFERENCES users(user_id),
    name            TEXT NOT NULL,
    description     TEXT,
    business_type   TEXT NOT NULL,          -- service, rental, resale
    icon            TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Side Business Items
CREATE TABLE side_business_items (
    item_id         SERIAL PRIMARY KEY,
    business_id     INTEGER REFERENCES side_businesses(business_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    price           DECIMAL(10,2),          -- NULL for service items with custom pricing
    stock_qty       INTEGER,                -- NULL for service items
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Side Business Sales
CREATE TABLE side_business_sales (
    sale_id         SERIAL PRIMARY KEY,
    item_id         INTEGER REFERENCES side_business_items(item_id),
    quantity        INTEGER NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    payment_method  TEXT NOT NULL,
    date_time       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample customers
INSERT INTO customers (name, phone_number, email, loyalty_points, credit_balance) VALUES 
('Alice Johnson', '555-0123', 'alice@email.com', 150, 25.50),
('Bob Wilson', '555-0456', 'bob@email.com', 75, 0.00),
('Carol Davis', '555-0789', 'carol@email.com', 300, 50.00),
('David Brown', '555-0321', NULL, 25, 0.00);

-- Insert sample sales with recent dates
INSERT INTO sales (datetime, total_amount, payment_method, cashier_id, customer_id, discount_applied) VALUES 
(NOW() - INTERVAL '1 day', 12.48, 'card', 1, 1, 2.00),
(NOW() - INTERVAL '2 days', 8.99, 'cash', 2, 2, 0.00),
(NOW() - INTERVAL '3 days', 25.97, 'card', 1, 3, 5.00),
(NOW() - INTERVAL '4 days', 6.50, 'cash', 2, NULL, 0.00),
(NOW() - INTERVAL '5 days', 15.75, 'card', 1, 1, 0.00),
(NOW() - INTERVAL '6 days', 9.99, 'cash', 2, 2, 1.00),
(NOW() - INTERVAL '7 days', 22.50, 'card', 1, 3, 0.00),
(NOW() - INTERVAL '1 hour', 18.25, 'cash', 2, NULL, 0.00),
(NOW() - INTERVAL '3 hours', 11.99, 'card', 1, 1, 0.00);

-- Insert sample sale items (matching the 9 sales records above)
INSERT INTO sale_items (sale_id, product_id, quantity, price_each) VALUES 
(1, 'PROD001', 2, 2.50),
(1, 'PROD002', 1, 3.99),
(1, 'PROD005', 2, 1.99),
(2, 'PROD002', 1, 3.99),
(2, 'PROD004', 1, 4.50),
(3, 'PROD003', 1, 15.99),
(3, 'PROD001', 4, 2.50),
(4, 'PROD004', 1, 4.50),
(4, 'PROD005', 1, 1.99),
(5, 'PROD001', 3, 2.50),
(5, 'PROD002', 2, 3.99),
(6, 'PROD004', 2, 4.50),
(7, 'PROD003', 1, 15.99),
(7, 'PROD005', 3, 1.99),
(8, 'PROD001', 4, 2.50),
(8, 'PROD004', 2, 4.50),
(9, 'PROD002', 3, 3.99);

-- Create indexes for better performance
CREATE INDEX idx_sales_datetime ON sales(datetime);
CREATE INDEX idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_business_info_updated_at ON business_info(updated_at);

-- Vault System Tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE vault (
    vault_id      SERIAL PRIMARY KEY,
    owner_id      INT REFERENCES users(user_id) ON DELETE CASCADE,
    pin_hash      TEXT NOT NULL,     -- store hashed 4-digit PIN
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vault_entries (
    entry_id      SERIAL PRIMARY KEY,
    vault_id      INT REFERENCES vault(vault_id) ON DELETE CASCADE,
    label         TEXT NOT NULL,     -- e.g. "Gmail", "Facebook"
    email         TEXT NOT NULL,
    password_enc  BYTEA NOT NULL,    -- encrypted with pgcrypto
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes for vault tables
CREATE INDEX idx_vault_owner_id ON vault(owner_id);
CREATE INDEX idx_vault_entries_vault_id ON vault_entries(vault_id);

-- Reminders Table
CREATE TABLE reminders (
    reminder_id   SERIAL PRIMARY KEY,
    owner_id      INT REFERENCES users(user_id) ON DELETE CASCADE, -- who created it
    title         TEXT NOT NULL,     -- short title, e.g. "Restock Milk"
    body          TEXT NOT NULL,     -- reminder text/details
    remind_date   DATE NOT NULL,     -- when the reminder is due
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Indexes for reminders table
CREATE INDEX idx_reminders_owner_id ON reminders(owner_id);
CREATE INDEX idx_reminders_remind_date ON reminders(remind_date);
