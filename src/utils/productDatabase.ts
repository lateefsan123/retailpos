// Product Database utility for parsing and searching the master product catalog

export interface MasterProduct {
  brand: string;
  product_name: string;
  barcode: string;
  image_url: string;
  category: string;
}

let cachedProducts: MasterProduct[] | null = null;

export async function loadMasterProducts(): Promise<MasterProduct[]> {
  if (cachedProducts) {
    return cachedProducts;
  }

  try {
    const response = await fetch('/documentation/combined_products_extended_updated (3).csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const products: MasterProduct[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line handling quoted values
      const values = parseCSVLine(line);
      
      if (values.length >= 5) {
        products.push({
          brand: values[0]?.trim() || '',
          product_name: values[1]?.trim() || '',
          barcode: values[2]?.trim() || '',
          image_url: values[3]?.trim() || '',
          category: values[4]?.trim() || 'Uncategorized'
        });
      }
    }
    
    cachedProducts = products;
    return products;
  } catch (error) {
    console.error('Error loading master products:', error);
    return [];
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function searchProducts(
  products: MasterProduct[],
  query: string,
  category?: string
): MasterProduct[] {
  const lowerQuery = query.toLowerCase();
  
  return products.filter(product => {
    // Category filter
    if (category && category !== 'all' && product.category !== category) {
      return false;
    }
    
    // Text search
    if (query) {
      const searchableText = `${product.product_name} ${product.brand} ${product.barcode}`.toLowerCase();
      return searchableText.includes(lowerQuery);
    }
    
    return true;
  });
}

export function getCategories(products: MasterProduct[]): string[] {
  const categories = new Set<string>();
  products.forEach(product => {
    if (product.category) {
      categories.add(product.category);
    }
  });
  return Array.from(categories).sort();
}

