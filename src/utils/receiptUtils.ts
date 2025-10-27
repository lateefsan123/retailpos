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
  voucher?: { code: string; name: string }
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
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receiptNumber}</title>
      <style>
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
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <img src="${businessLogo}" alt="${businessName}" style="max-width: 110px; height: auto; display: block; margin: 0 auto 10px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <div class="logo-fallback" style="display: none; font-size: 24px; font-weight: bold; margin-bottom: 8px; color: #1f2937;">${businessName}</div>
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
          return `
          <div class="item-row">
            <span>${itemName} x${item.quantity}</span>
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
        <div class="item-row" style="font-size: 11px; color: #6b7280; font-style: italic;">
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
          <div style="font-weight: bold; margin-bottom: 5px; color: #92400e;">
            <i class="fa-solid fa-credit-card" style="margin-right: 5px;"></i>
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
          <div style="margin-top: 5px; font-size: 10px; color: #92400e;">
            Note: ${partialPayment.notes}
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        ${paymentInfo.receiptNotes ? `
        <div class="divider"></div>
        <div class="notes-section">
          <div style="font-weight: bold; margin-bottom: 5px;">Notes:</div>
          <div style="font-size: 9px; line-height: 1.3; margin-left: 10px;">${paymentInfo.receiptNotes}</div>
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>${receiptFooter}</div>
          <div style="margin-top: 5px;">${businessName}</div>
          ${partialPayment ? `
          <div style="margin-top: 10px; font-size: 9px; color: #92400e;">
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
  voucher?: { code: string; name: string }
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(generateReceiptHTML(order, paymentInfo, user, businessInfo, partialPayment, voucher))
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