# Customer Portal Test Guide

## 🚀 Quick Setup for Testing

### Step 1: Run Database Migrations

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the customer authentication migration:**
   - Copy and paste the contents of `customer_auth_migration.sql`
   - Click **Run**

4. **Create test customers:**
   - Copy and paste the contents of `create_test_customer.sql`
   - Click **Run**

### Step 2: Access the Customer Portal

1. **Open your browser** and go to: `http://localhost:5173/customer-portal`
2. **The development server should be running** (you started it with `npm run dev`)

## 🧪 Test Scenarios

### Test 1: First-Time Customer (Account Setup Required)

**Customer:** Test Customer
- **Phone:** `+1-555-9999`
- **Branch:** Main Branch
- **Expected Flow:** Phone → Account Setup → Dashboard

**Steps:**
1. Select "Main Branch" from the store dropdown
2. Enter phone number: `+1-555-9999`
3. Click "Access Portal"
4. You should be redirected to the account setup page
5. Enter email: `test.customer@example.com`
6. Enter password: `testpass123`
7. Confirm password: `testpass123`
8. Click "Complete Setup"
9. You should be automatically logged in and see the dashboard

### Test 2: Returning Customer - Login with Email

**Customer:** John Demo
- **Email:** `john.demo@test.com`
- **Password:** `password`
- **Phone:** `+1-555-8888`
- **Branch:** Main Branch
- **Expected Flow:** Phone → Password Login → Dashboard

**Steps:**
1. Select "Main Branch" from the store dropdown
2. Enter phone number: `+1-555-8888`
3. Click "Access Portal"
4. You should see the password login form
5. Enter email: `john.demo@test.com`
6. Enter password: `password`
7. Click "Login"
8. You should see the dashboard with John's loyalty points (250)

### Test 3: Returning Customer - Login with Phone

**Customer:** Sarah Demo
- **Email:** `sarah.demo@test.com`
- **Password:** `password`
- **Phone:** `+1-555-7777`
- **Branch:** Main Branch
- **Expected Flow:** Phone → Password Login → Dashboard

**Steps:**
1. Select "Main Branch" from the store dropdown
2. Enter phone number: `+1-555-7777`
3. Click "Access Portal"
4. You should see the password login form
5. Enter phone: `+1-555-7777` (instead of email)
6. Enter password: `password`
7. Click "Login"
8. You should see the dashboard with Sarah's loyalty points (150)

## 🔍 What to Look For

### ✅ Success Indicators:
- **First-time customers** are redirected to account setup
- **Returning customers** see password input form
- **Email validation** works (try invalid email format)
- **Password validation** works (try weak passwords)
- **Login works** with both email and phone number
- **Dashboard loads** with customer information
- **Loyalty points** are displayed correctly
- **Store name and logo** appear in the header

### ❌ Error Scenarios to Test:
- **Invalid phone number** → Should show "Customer not found"
- **Wrong password** → Should show "Invalid credentials"
- **Duplicate email** → Should show "This email is already registered"
- **Weak password** → Should show validation error
- **Password mismatch** → Should show "Passwords do not match"

## 🛠️ Troubleshooting

### If you get "Customer not found":
- Make sure you ran the `create_test_customer.sql` script
- Check that the branch_id matches in the database
- Verify the phone number format matches exactly

### If you get database errors:
- Make sure you ran the `customer_auth_migration.sql` first
- Check that the new columns (email, password_hash, account_setup_complete) exist

### If the portal doesn't load:
- Make sure the dev server is running (`npm run dev`)
- Check the browser console for any JavaScript errors
- Verify your Supabase credentials in `.env` file

## 📱 Mobile Testing

The customer portal is fully responsive! Test on:
- **Desktop browsers** (Chrome, Firefox, Safari)
- **Mobile devices** (iPhone, Android)
- **Tablet devices** (iPad, Android tablets)

## 🎯 Expected Features

Once logged in, you should see:
- **Customer dashboard** with loyalty points
- **Transaction history** (if any sales exist)
- **Rewards section** (if loyalty prizes are configured)
- **Download receipt** functionality
- **Profile icon management**
- **Store branding** (name and logo)

## 🔐 Security Notes

- **Passwords are hashed** with bcrypt (10 salt rounds)
- **No plaintext passwords** are stored
- **Email uniqueness** is enforced
- **Session management** is handled securely
- **Error messages** don't reveal if accounts exist

---

**Ready to test?** Start with Test 1 (first-time customer) to see the complete flow! 🚀
