# Retail POS System

A modern React-based Point of Sale system built with Vite, TypeScript, and Supabase.

## Features

- **Dashboard**: Overview of key metrics and statistics
- **Products**: Manage your inventory with product listings
- **Sales**: Track and view sales transactions
- **Customers**: Manage customer information and loyalty points
- **Dark Mode**: Beautiful dark theme with TailwindCSS
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js (version 16 or higher)
- A Supabase project with the following tables:
  - `products` (id, name, category, price, stock_quantity)
  - `sales` (id, created_at, total_amount, payment_method)
  - `customers` (id, name, phone_number, loyalty_points)

## Setup Instructions

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `env.example` to `.env`
   - Add your Supabase project URL and anonymous key:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Database Schema

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0
);
```

### Sales Table
```sql
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL
);
```

### Customers Table
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  loyalty_points INTEGER DEFAULT 0
);
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/
│   └── Navigation.tsx      # Main navigation component
├── lib/
│   └── supabaseClient.ts  # Supabase configuration
├── pages/
│   ├── Dashboard.tsx      # Home/Dashboard page
│   ├── Products.tsx       # Products management
│   ├── Sales.tsx          # Sales tracking
│   └── Customers.tsx      # Customer management
├── App.tsx                # Main app component with routing
├── main.tsx              # App entry point
└── index.css             # Global styles with TailwindCSS
```

## Features Implemented

✅ Vite + TypeScript React setup  
✅ Supabase integration with environment variables  
✅ React Router for navigation  
✅ TailwindCSS for styling with dark mode  
✅ Dashboard with statistics  
✅ Products page with table display  
✅ Sales page with latest transactions  
✅ Customers page with loyalty points  
✅ Responsive design  
✅ Error handling and loading states  

## Next Steps

- Add product creation functionality
- Implement customer management features
- Add sales transaction creation
- Implement search and filtering
- Add data export capabilities
- Set up user authentication
