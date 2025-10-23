interface Product {
  product_id: string
  name: string
  price: number
  barcode?: string | null
  category: string
  stock_quantity: number
  is_weighted?: boolean
  weight_unit?: string | null
  price_per_unit?: number | null
}

interface BusinessInfo {
  business_name?: string
  name?: string
  address?: string
  phone_number?: string
  logo_url?: string
}

export const generateProductLabelHTML = (
  product: Product,
  businessInfo?: BusinessInfo,
  quantity: number = 1
) => {
  const businessName = businessInfo?.business_name || businessInfo?.name || 'Business'
  const businessLogo = businessInfo?.logo_url || '/images/backgrounds/logo1.png'
  
  // Format price display
  const formatPrice = () => {
    if (product.is_weighted && product.price_per_unit && product.weight_unit) {
      if (product.weight_unit === 'g' && product.price_per_unit < 1) {
        const pricePerKg = product.price_per_unit * 1000
        return `€${pricePerKg.toFixed(2)}/kg`
      } else if (product.weight_unit === 'kg' && product.price_per_unit >= 1) {
        return `€${product.price_per_unit.toFixed(2)}/kg`
      } else {
        return `€${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
      }
    } else {
      return `€${product.price.toFixed(2)}`
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Product Label - ${product.name}</title>
  <style>
    @page {
      size: 2.5in 1.5in;
      margin: 0.1in;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 10px; 
      line-height: 1.2; 
      margin: 0; 
      padding: 4px; 
      background: white;
      color: black;
      width: 2.3in;
      height: 1.3in;
      overflow: hidden;
    }
    .label { 
      width: 100%; 
      height: 100%; 
      border: 1px solid #ccc; 
      padding: 4px; 
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .price { 
      font-size: 16px; 
      font-weight: bold; 
      color: #000;
      text-align: center;
    }
    .product-name { 
      font-size: 12px; 
      font-weight: bold; 
      color: #000;
      line-height: 1.1;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="price">${formatPrice()}</div>
    <div class="product-name">${product.name}</div>
  </div>
</body>
</html>`
}

export const generateBulkLabelsHTML = (
  products: Product[],
  businessInfo?: BusinessInfo,
  quantities: Record<string, number> = {}
) => {
  const businessName = businessInfo?.business_name || businessInfo?.name || 'Business'
  const businessLogo = businessInfo?.logo_url || '/images/backgrounds/logo1.png'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Bulk Product Labels</title>
  <style>
    @page {
      size: A4;
      margin: 0.5in;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 10px; 
      line-height: 1.2; 
      margin: 0; 
      padding: 0; 
      background: white;
      color: black;
    }
    .labels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      width: 100%;
    }
    .label { 
      width: 2.5in;
      height: 1.5in;
      border: 1px solid #ccc; 
      padding: 4px; 
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      page-break-inside: avoid;
    }
    .price { 
      font-size: 16px; 
      font-weight: bold; 
      color: #000;
      text-align: center;
    }
    .product-name { 
      font-size: 12px; 
      font-weight: bold; 
      color: #000;
      line-height: 1.1;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="labels-grid">
    ${products.map(product => {
      const quantity = quantities[product.product_id] || 1
      
      // Format price display
      const formatPrice = () => {
        if (product.is_weighted && product.price_per_unit && product.weight_unit) {
          if (product.weight_unit === 'g' && product.price_per_unit < 1) {
            const pricePerKg = product.price_per_unit * 1000
            return `€${pricePerKg.toFixed(2)}/kg`
          } else if (product.weight_unit === 'kg' && product.price_per_unit >= 1) {
            return `€${product.price_per_unit.toFixed(2)}/kg`
          } else {
            return `€${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
          }
        } else {
          return `€${product.price.toFixed(2)}`
        }
      }

      return `
        <div class="label">
          <div class="price">${formatPrice()}</div>
          <div class="product-name">${product.name}</div>
        </div>
      `
    }).join('')}
  </div>
</body>
</html>`
}

export const printProductLabel = (
  product: Product,
  businessInfo?: BusinessInfo,
  quantity: number = 1
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(generateProductLabelHTML(product, businessInfo, quantity))
  printWindow.document.close()
  printWindow.print()
  printWindow.close()
}

export const printBulkLabels = (
  products: Product[],
  businessInfo?: BusinessInfo,
  quantities: Record<string, number> = {}
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(generateBulkLabelsHTML(products, businessInfo, quantities))
  printWindow.document.close()
  printWindow.print()
  printWindow.close()
}
