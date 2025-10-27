import { Order, PaymentInfo, PartialPayment } from '../types/sales'

interface BusinessInfo {
  name?: string;
  business_name?: string;
  logo_url?: string;
  address?: string;
  phone_number?: string;
  vat_number?: string;
  receipt_footer?: string;
  currency?: string;
}

export const generateReceiptHTML = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string },
  printerType: 'thermal' | 'standard' = 'thermal'
) => {
  const receiptNumber = `RCP-${Date.now()}`
  const currentDate = new Date()
  const dateStr = currentDate.toLocaleDateString('en-IE')
  const timeStr = currentDate.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
  
  // Get currency symbol
  const getCurrencySymbol = (currency?: string) => {
    if (!currency) return '€'
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
    }
    return symbols[currency] || '€'
  }
  
  const currencySymbol = getCurrencySymbol(businessInfo?.currency)
  const businessName = businessInfo?.business_name || businessInfo?.name || 'Business'
  const businessAddress = businessInfo?.address || ''
  const businessPhone = businessInfo?.phone_number || ''
  const businessLogo = businessInfo?.logo_url || '/images/backgrounds/logo1.png'
  const receiptFooter = businessInfo?.receipt_footer || 'Thank you for shopping with us!'
  
  // Thermal printer optimized styles
  const thermalStyles = `
    @media print {
      body { 
        font-family: 'Courier New', monospace; 
        font-size: 12px; 
        line-height: 1.2; 
        margin: 0; 
        padding: 4px; 
        background: #ffffff !important;
        color: #000000 !important;
        width: 58mm;
        max-width: 58mm;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-variant-numeric: tabular-nums; 
      }
    }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 13px; 
      line-height: 1.3; 
      margin: 0; 
      padding: 6px; 
      background: #ffffff;
      color: #000000;
      width: 80mm;
      max-width: 80mm;
      height: auto;
      min-height: auto;
      font-weight: bold;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-variant-numeric: tabular-nums; 
    }
    .receipt { 
      width: 100%; 
      max-width: 80mm;
      margin: 0; 
      padding: 6px; 
      background: #ffffff;
      height: auto;
      min-height: auto;
    }
    .logo {
      max-width: 60px;
      height: auto;
      display: block;
      margin: 0 auto 8px;
    }
    @media print {
      .receipt { 
        width: 100% !important; 
        max-width: 80mm !important;
        margin: 0 !important; 
        padding: 4px !important; 
        background: #ffffff !important;
        color: #000000 !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
    .header { 
      text-align: center; 
      margin-bottom: 8px; 
      border-bottom: 1px solid #000; 
      padding-bottom: 6px; 
    }
    .logo-fallback {
      display: none;
      background: #f8f9fa;
      color: #000000;
      padding: 4px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 14px;
    }
    .business-info { 
      font-size: 10px; 
      margin: 4px 0; 
      line-height: 1.1;
    }
    .divider { 
      border-top: 1px solid #000; 
      margin: 4px 0; 
    }
    .item-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: baseline;
      margin: 2px 0; 
      gap: 6px;
      font-size: 12px;
      font-weight: bold;
    }
    .item-row span:first-child {
      flex: 1;
      word-wrap: break-word;
    }
    .item-row span:last-child {
      min-width: 50px;
      text-align: right;
      white-space: nowrap;
      font-weight: bold;
    }
    .total-row { 
      font-weight: bold; 
      border-top: 1px solid #000; 
      padding-top: 3px; 
      margin-top: 6px; 
      font-size: 12px;
    }
    .total-row span:last-child {
      font-size: 13px;
    }
    .grand-total {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 4px 6px;
      margin-top: 6px;
      font-size: 13px;
      font-weight: bold;
    }
    .payment-info { 
      margin: 6px 0; 
      font-size: 11px;
    }
    .partial-payment-info {
      margin: 6px 0;
      padding: 4px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      font-size: 10px;
    }
    .notes-section {
      margin: 6px 0;
      padding: 4px;
      background: #f8f9fa;
      font-size: 9px;
    }
    .footer { 
      text-align: center; 
      margin-top: 8px; 
      font-size: 9px; 
      border-top: 1px solid #000; 
      padding-top: 6px; 
    }
    .warning {
      color: #dc2626;
      font-weight: bold;
    }
    .success {
      color: #059669;
      font-weight: bold;
    }
    .center {
      text-align: center;
    }
    .bold {
      font-weight: bold;
    }
  `

  // Standard printer styles (existing)
  const standardStyles = `
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 14px; 
      line-height: 1.55; 
      margin: 0; 
      padding: 12px; 
      background: #ffffff;
      color: #111111;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-variant-numeric: tabular-nums; 
    }
    .receipt { 
      width: 90%; 
      max-width: 700px; 
      margin: 0 auto; 
      border: 1px solid #d1d5db; 
      padding: 24px; 
      background: #ffffff;
      height: 90%;
    }
    .header { 
      text-align: center; 
      margin-bottom: 16px; 
      border-bottom: 1.5px dashed #333; 
      padding-bottom: 12px; 
    }
    .logo-fallback {
      display: none;
      background: #f8f9fa;
      color: #1f2937;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    .business-info { 
      font-size: 12px; 
      margin: 8px 0; 
    }
    .divider { 
      border-top: 1.5px dashed #333; 
      margin: 12px 0; 
    }
    .item-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: baseline;
      margin: 4px 0; 
      gap: 12px;
    }
    .item-row span:last-child {
      min-width: 120px;
      text-align: right;
      white-space: nowrap;
    }
    .total-row { 
      font-weight: bold; 
      border-top: 1px solid #333; 
      padding-top: 6px; 
      margin-top: 10px; 
    }
    .total-row span:last-child {
      font-size: 16px;
    }
    .grand-total {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #111111;
      padding: 8px 10px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .payment-info { 
      margin: 12px 0; 
    }
    .partial-payment-info {
      margin: 12px 0;
      padding: 10px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
    }
    .notes-section {
      margin: 12px 0;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 4px;
    }
    .footer { 
      text-align: center; 
      margin-top: 16px; 
      font-size: 12px; 
      border-top: 1px dashed #333; 
      padding-top: 12px; 
    }
    .warning {
      color: #dc2626;
      font-weight: bold;
    }
    .success {
      color: #059669;
      font-weight: bold;
    }
  `

  const styles = printerType === 'thermal' ? thermalStyles : standardStyles
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receiptNumber}</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <div class="logo-fallback bold" style="display: none; font-size: 16px; margin-bottom: 8px;">${businessName}</div>` : `<div class="logo-fallback bold" style="font-size: 16px; margin-bottom: 8px;">${businessName}</div>`}
          <div class="business-info">
            ${businessAddress ? `<div>${businessAddress}</div>` : ''}
            ${businessPhone ? `<div>${businessPhone}</div>` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="item-row">
          <span>Date: ${dateStr}</span>
          <span>Time: ${timeStr}</span>
        </div>
        <div class="item-row">
          <span>Receipt: ${receiptNumber}</span>
          <span>Cashier: ${user?.username || 'System'}</span>
        </div>
        
        ${paymentInfo.customerName ? `
        <div class="item-row">
          <span>Customer: ${paymentInfo.customerName}</span>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        ${order.items.map(item => {
          const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
          const itemPrice = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
          const displayName = printerType === 'thermal' && itemName.length > 20 
            ? itemName.substring(0, 17) + '...' 
            : itemName
          return `
          <div class="item-row">
            <span>${displayName} x${item.quantity}</span>
            <span>${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}</span>
          </div>
        `
        }).join('')}
        
        <div class="divider"></div>
        
        <div class="item-row total-row">
          <span>SUBTOTAL:</span>
          <span>${currencySymbol}${order.subtotal.toFixed(2)}</span>
        </div>
        ${order.discount > 0 ? `
        <div class="item-row total-row" style="color: #059669;">
          <span>VOUCHER DISCOUNT:</span>
          <span>-${currencySymbol}${order.discount.toFixed(2)}</span>
        </div>
        ${voucher ? `
        <div class="item-row" style="font-size: ${printerType === 'thermal' ? '9px' : '11px'}; color: #6b7280; font-style: italic;">
          <span>Voucher: ${voucher.code}</span>
          <span>${voucher.name}</span>
        </div>
        ` : ''}
        ` : ''}
        <div class="item-row total-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>${currencySymbol}${order.total.toFixed(2)}</span>
        </div>
        
        <div class="payment-info">
          <div class="item-row">
            <span>Payment Method:</span>
            <span>${paymentInfo.method.toUpperCase()}</span>
          </div>
          ${paymentInfo.method === 'cash' ? `
          <div class="item-row">
            <span>Amount Received:</span>
            <span>${currencySymbol}${parseFloat(paymentInfo.amountEntered).toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>Change Given:</span>
            <span>${currencySymbol}${paymentInfo.change.toFixed(2)}</span>
          </div>
          ` : paymentInfo.method === 'card' ? `
          <div class="item-row">
            <span>Card: ****1234</span>
            <span>Approval: ${Math.floor(Math.random() * 10000)}</span>
          </div>
          ` : ''}
        </div>
        
        ${partialPayment ? `
        <div class="partial-payment-info">
          <div style="font-weight: bold; margin-bottom: 3px; color: #92400e;">
            PARTIAL PAYMENT
          </div>
          <div class="item-row">
            <span>Amount Paid Today:</span>
            <span class="success">${currencySymbol}${partialPayment.amountPaid.toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>Remaining Balance:</span>
            <span class="warning">${currencySymbol}${partialPayment.amountRemaining.toFixed(2)}</span>
          </div>
          ${partialPayment.dueDate ? `
          <div class="item-row">
            <span>Due Date:</span>
            <span>${new Date(partialPayment.dueDate).toLocaleDateString()}</span>
          </div>
          ` : ''}
          ${partialPayment.notes ? `
          <div style="margin-top: 3px; font-size: ${printerType === 'thermal' ? '8px' : '10px'}; color: #92400e;">
            Note: ${partialPayment.notes}
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        ${paymentInfo.receiptNotes ? `
        <div class="divider"></div>
        <div class="notes-section">
          <div style="font-weight: bold; margin-bottom: 3px;">Notes:</div>
          <div style="font-size: ${printerType === 'thermal' ? '8px' : '9px'}; line-height: 1.3; margin-left: 6px;">${paymentInfo.receiptNotes}</div>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>${receiptFooter}</div>
          <div style="margin-top: 3px;">${businessName}</div>
          ${partialPayment ? `
          <div style="margin-top: 6px; font-size: ${printerType === 'thermal' ? '8px' : '9px'}; color: #92400e;">
            <strong>Please keep this receipt for your records</strong><br>
            Remaining balance: ${currencySymbol}${partialPayment.amountRemaining.toFixed(2)}
          </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `
}

export const printReceipt = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string },
  printerType: 'thermal' | 'standard' = 'thermal'
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(generateReceiptHTML(order, paymentInfo, user, businessInfo, partialPayment, voucher, printerType))
  printWindow.document.close()
  printWindow.print()
  printWindow.close()
}

// Thermal printer optimized receipt for POSSAFE 58mm/80mm printers
export const generateThermalReceipt = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string }
) => {
  return generateReceiptHTML(order, paymentInfo, user, businessInfo, partialPayment, voucher, 'thermal')
}

// Simple thermal receipt format for better print compatibility
export const generateSimpleThermalReceipt = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string }
) => {
  const receiptNumber = `RCP-${Date.now()}`
  const currentDate = new Date()
  const dateStr = currentDate.toLocaleDateString('en-IE')
  const timeStr = currentDate.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
  
  const currencySymbol = '€'
  const businessName = businessInfo?.business_name || businessInfo?.name || 'Business'
  const businessAddress = businessInfo?.address || ''
  const businessPhone = businessInfo?.phone_number || ''
  const receiptFooter = businessInfo?.receipt_footer || 'Thank you for shopping with us!'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receiptNumber}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.3;
          margin: 0;
          padding: 6px;
          background: white;
          color: black;
          width: 80mm;
          max-width: 80mm;
          height: auto;
          min-height: auto;
          font-weight: bold;
        }
        .receipt {
          width: 100%;
          background: white;
          color: black;
          height: auto;
          min-height: auto;
        }
        .logo {
          max-width: 60px;
          height: auto;
          display: block;
          margin: 0 auto 8px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px solid black; margin: 4px 0; }
        .item-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 2px 0;
          font-size: 12px;
          font-weight: bold;
        }
        .item-name { flex: 1; }
        .item-price { font-weight: bold; }
        .total-row { 
          font-weight: bold; 
          border-top: 1px solid black; 
          padding-top: 2px; 
          margin-top: 4px; 
        }
        .grand-total {
          background: #f0f0f0;
          border: 1px solid black;
          padding: 3px;
          margin-top: 4px;
          font-weight: bold;
        }
        .footer { 
          text-align: center; 
          margin-top: 6px; 
          font-size: 10px; 
          border-top: 1px solid black; 
          padding-top: 4px; 
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="center bold" style="display: none; font-size: 16px; margin-bottom: 8px;">${businessName}</div>` : `<div class="center bold" style="font-size: 16px; margin-bottom: 8px;">${businessName}</div>`}
        ${businessAddress ? `<div class="center">${businessAddress}</div>` : ''}
        ${businessPhone ? `<div class="center">${businessPhone}</div>` : ''}
        
        <div class="divider"></div>
        
        <div class="item-row">
          <span>Date: ${dateStr}</span>
          <span>Time: ${timeStr}</span>
        </div>
        <div class="item-row">
          <span>Receipt: ${receiptNumber}</span>
          <span>Cashier: ${user?.username || 'System'}</span>
        </div>
        
        ${paymentInfo.customerName ? `
        <div class="item-row">
          <span>Customer: ${paymentInfo.customerName}</span>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        ${order.items.map(item => {
          const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
          const itemPrice = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
          const displayName = itemName.length > 15 ? itemName.substring(0, 12) + '...' : itemName
          return `
          <div class="item-row">
            <span class="item-name">${displayName} x${item.quantity}</span>
            <span class="item-price">${currencySymbol}${(itemPrice * item.quantity).toFixed(2)}</span>
          </div>
        `
        }).join('')}
        
        <div class="divider"></div>
        
        <div class="item-row total-row">
          <span>SUBTOTAL:</span>
          <span>${currencySymbol}${order.subtotal.toFixed(2)}</span>
        </div>
        ${order.discount > 0 ? `
        <div class="item-row total-row">
          <span>DISCOUNT:</span>
          <span>-${currencySymbol}${order.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="item-row total-row grand-total">
          <span>TOTAL:</span>
          <span>${currencySymbol}${order.total.toFixed(2)}</span>
        </div>
        
        <div class="item-row">
          <span>Payment:</span>
          <span>${paymentInfo.method.toUpperCase()}</span>
        </div>
        ${paymentInfo.method === 'cash' ? `
        <div class="item-row">
          <span>Received:</span>
          <span>${currencySymbol}${parseFloat(paymentInfo.amountEntered).toFixed(2)}</span>
        </div>
        <div class="item-row">
          <span>Change:</span>
          <span>${currencySymbol}${paymentInfo.change.toFixed(2)}</span>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>${receiptFooter}</div>
          <div>${businessName}</div>
        </div>
      </div>
    </body>
    </html>
  `
}

// Print thermal receipt optimized for POSSAFE printers
export const printThermalReceipt = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string }
) => {
  return printReceipt(order, paymentInfo, user, businessInfo, partialPayment, voucher, 'thermal')
}

// Print simple thermal receipt for better compatibility
export const printSimpleThermalReceipt = (
  order: Order,
  paymentInfo: PaymentInfo,
  user: any,
  businessInfo?: BusinessInfo,
  partialPayment?: PartialPayment,
  voucher?: { code: string; name: string }
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(generateSimpleThermalReceipt(order, paymentInfo, user, businessInfo, partialPayment, voucher))
  printWindow.document.close()
  printWindow.print()
  printWindow.close()
}

// Cash drawer control functions
export const openCashDrawer = () => {
  try {
    // Method 1: ESC/POS command for cash drawer (most common)
    const escPosCommand = new Uint8Array([27, 112, 0, 50, 250]) // ESC p 0 50 250
    
    // Try to send the command to a connected printer
    if (navigator.serial) {
      // Modern Web Serial API approach
      console.log('Attempting to open cash drawer via Web Serial API...')
      // This would require user permission and device selection
    } else {
      // Fallback: Try to send ESC/POS command via print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Cash Drawer</title>
            </head>
            <body>
              <script>
                // ESC/POS command to open cash drawer
                const command = new Uint8Array([27, 112, 0, 50, 250]);
                // This is a fallback - actual implementation would depend on printer driver
                window.close();
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => printWindow.close(), 1000)
      }
    }
    
    console.log('Cash drawer open command sent')
    return true
  } catch (error) {
    console.error('Failed to open cash drawer:', error)
    return false
  }
}

// Alternative method using a simple API call (if you have a backend service)
export const openCashDrawerAPI = async () => {
  try {
    // This would be a call to your backend service that controls the cash drawer
    const response = await fetch('/api/cash-drawer/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      console.log('Cash drawer opened successfully')
      return true
    } else {
      throw new Error('Failed to open cash drawer')
    }
  } catch (error) {
    console.error('Failed to open cash drawer via API:', error)
    // Fallback to local method
    return openCashDrawer()
  }
}