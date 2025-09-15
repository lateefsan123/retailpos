-- Add Side Business Tables to Existing Database
-- Run this in your Supabase SQL Editor if the side business tables don't exist

-- Side Businesses
CREATE TABLE IF NOT EXISTS side_businesses (
    business_id     SERIAL PRIMARY KEY,
    owner_id        INTEGER REFERENCES users(user_id),
    name            TEXT NOT NULL,
    description     TEXT,
    business_type   TEXT NOT NULL,          -- service, rental, resale
    icon            TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Side Business Items
CREATE TABLE IF NOT EXISTS side_business_items (
    item_id         SERIAL PRIMARY KEY,
    business_id     INTEGER REFERENCES side_businesses(business_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    price           DECIMAL(10,2),          -- NULL for service items with custom pricing
    stock_qty       INTEGER,                -- NULL for service items
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Side Business Sales
CREATE TABLE IF NOT EXISTS side_business_sales (
    sale_id         SERIAL PRIMARY KEY,
    item_id         INTEGER REFERENCES side_business_items(item_id),
    quantity        INTEGER NOT NULL,
    total_amount    DECIMAL(10,2) NOT NULL,
    payment_method  TEXT NOT NULL,
    date_time       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
