# Payment Gateway Integration - Click & Collect Only

## 🎯 **Important Clarification**

The payment gateway integration (Stripe, Revolut, PayPal) is **ONLY** for **click & collect orders** in the customer portal. Regular in-store sales continue to use traditional payment methods.

## 📊 **Payment Method Usage**

### **In-Store Sales (POS System)**
- **Cash** - Physical cash payments
- **Card** - Chip & PIN card payments  
- **Tap** - Contactless card payments
- **Credit** - Store credit/account payments

### **Click & Collect Orders (Customer Portal)**
- **Stripe** - Credit/debit cards online
- **Revolut** - Lower fees for European businesses
- **PayPal** - PayPal and credit cards online

## 🔄 **How It Works**

### **Regular In-Store Sale Flow:**
```
Customer at POS → Cashier scans items → Customer pays cash/card/tap → Receipt printed → Sale recorded
```

### **Click & Collect Sale Flow:**
```
Customer online → Adds items to cart → Pays via Stripe/Revolut/PayPal → Order confirmed → Customer collects in-store
```

## 💾 **Database Distinction**

### **Regular Sales Table:**
```sql
payment_method: 'cash' | 'card' | 'tap' | 'credit'
payment_gateway: NULL (not used for in-store)
payment_status: 'completed' (always completed for in-store)
```

### **Click & Collect Sales Table:**
```sql
payment_method: 'online'
payment_gateway: 'stripe' | 'revolut' | 'paypal'
payment_status: 'completed' | 'failed' | 'refunded'
payment_transaction_id: 'txn_123456789'
notes: 'Click & Collect - Online Payment'
```

## 🏪 **Store Owner Experience**

### **In-Store POS:**
- No changes to existing cash/card/tap workflow
- Same payment methods as before
- No gateway configuration needed

### **Customer Portal Management:**
- Configure Stripe/Revolut/PayPal in Business Settings
- Enable/disable online payment gateways
- Monitor click & collect orders separately

## 👥 **Customer Experience**

### **Shopping In-Store:**
- Pay with cash, card, or tap as usual
- No online payment options needed

### **Click & Collect Online:**
- Browse products on customer portal
- Add items to click & collect cart
- Pay securely online with Stripe/Revolut/PayPal
- Collect items in-store when ready

## 🔧 **Technical Implementation**

### **Files Modified:**
- `src/pages/CustomerPortal.tsx` - Added payment modal for click & collect
- `src/components/BusinessSettingsModal.tsx` - Added gateway configuration
- `src/utils/paymentGateways.ts` - Online payment processing only
- `src/components/payment/` - Payment components for online orders

### **Files NOT Modified:**
- Regular POS sales processing
- In-store payment handling
- Cash/card/tap payment flows

## ✅ **Summary**

The payment gateway integration is a **separate system** specifically for click & collect orders. It does not interfere with or change the existing in-store payment methods. Store owners can:

1. **Keep using** cash/card/tap for regular sales
2. **Optionally enable** Stripe/Revolut/PayPal for click & collect orders
3. **Manage both** payment types independently

This provides the best of both worlds - traditional in-store payments for walk-in customers, and modern online payments for click & collect convenience.
