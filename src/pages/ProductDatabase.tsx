import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter, Grid, List, Table as TableIcon, X, Loader2, Box, Image as ImageIcon, Barcode, Plus, Edit3 } from "lucide-react";
import { loadMasterProducts } from '../utils/productDatabase';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import styles from './ProductDatabase.module.css';

// ---- Types ----
interface ProductRow {
  id: string;
  brand: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  category?: string;
  imageQuality?: "ok" | "low" | "missing";
  source?: "csv" | "openfoodfacts" | "site" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

interface UIState {
  view: "cards" | "list" | "table";
  query: string;
  selectedIds: Set<string>;
  filters: { category: string[]; brand: string[]; hasBarcode?: boolean; hasImage?: boolean };
  sort: { key: "name" | "brand" | "category" | "hasImage" | "hasBarcode"; dir: "asc" | "desc" };
}

// ---- Utils ----

function isValidEAN13(raw?: string): boolean {
  if (!raw) return false;
  const s = raw.replace(/\D/g, "");
  if (s.length !== 13) return false;
  const digits = s.split("").map(Number);
  const checksum = digits.pop()!;
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const calc = (10 - (sum % 10)) % 10;
  return calc === checksum;
}

function isValidUPCA(raw?: string): boolean {
  if (!raw) return false;
  const s = raw.replace(/\D/g, "");
  if (s.length !== 12) return false;
  const digits = s.split("").map(Number);
  const checksum = digits.pop()!;
  const odd = digits.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const even = digits.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  const calc = (10 - (((odd * 3) + even) % 10)) % 10;
  return calc === checksum;
}

const CATEGORIES = [
  "Hair & Beauty Products",
  "Toiletries & Personal Care",
  "Snacks & Confectionery",
  "Spices/Condiments/Seasonings",
  "Rice",
  "Uncategorized",
];

export default function ProductDatabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [state, setState] = useState<UIState>({
    view: "cards",
    query: "",
    selectedIds: new Set<string>(),
    filters: { category: [], brand: [], hasBarcode: undefined, hasImage: undefined },
    sort: { key: "name", dir: "asc" },
  });
  const [inspecting, setInspecting] = useState<ProductRow | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const products = await loadMasterProducts();
      const productRows: ProductRow[] = products.map((product, index) => ({
        id: `product-${index}`,
        brand: product.brand || 'Unbranded',
        name: product.product_name,
        barcode: product.barcode || undefined,
        imageUrl: product.image_url || undefined,
        category: product.category || 'Uncategorized',
        source: 'csv' as const,
      }));
      setRows(productRows);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  const brands = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.brand))).sort();
  }, [rows]);

  const countsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    CATEGORIES.forEach(c => m.set(c, 0));
    rows.forEach(r => m.set(r.category || "Uncategorized", (m.get(r.category || "Uncategorized") || 0) + 1));
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    let list = rows.filter(r => {
      const qmatch = q
        ? `${r.name} ${r.brand} ${r.barcode || ""}`.toLowerCase().includes(q)
        : true;
      const catOk = state.filters.category.length
        ? state.filters.category.includes(r.category || "Uncategorized")
        : true;
      const brandOk = state.filters.brand.length ? state.filters.brand.includes(r.brand) : true;
      const hasBarcodeOk =
        state.filters.hasBarcode === undefined
          ? true
          : state.filters.hasBarcode
          ? Boolean(r.barcode && (isValidEAN13(r.barcode) || isValidUPCA(r.barcode)))
          : !r.barcode;
      const hasImageOk =
        state.filters.hasImage === undefined
          ? true
          : state.filters.hasImage
          ? Boolean(r.imageUrl)
          : !r.imageUrl;
      return qmatch && catOk && brandOk && hasBarcodeOk && hasImageOk;
    });

    list.sort((a, b) => {
      const { key, dir } = state.sort;
      const mult = dir === "asc" ? 1 : -1;
      if (key === "hasImage") {
        const av = a.imageUrl ? 1 : 0;
        const bv = b.imageUrl ? 1 : 0;
        return (av - bv) * mult;
      }
      if (key === "hasBarcode") {
        const av = a.barcode ? 1 : 0;
        const bv = b.barcode ? 1 : 0;
        return (av - bv) * mult;
      }
      const va = (key === "category" ? (a.category || "Uncategorized") : (a as any)[key])?.toString().toLowerCase();
      const vb = (key === "category" ? (b.category || "Uncategorized") : (b as any)[key])?.toString().toLowerCase();
      return va.localeCompare(vb) * mult;
    });

    return list;
  }, [rows, state]);

  const toggleSelect = (id: string) => {
    setState(s => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...s, selectedIds: next };
    });
  };

  const clearSelection = () => setState(s => ({ ...s, selectedIds: new Set() }));

  const bulkCategorize = (category: string) => {
    setRows(prev => prev.map(r => (state.selectedIds.has(r.id) ? { ...r, category } : r)));
    clearSelection();
  };

  const bulkAddToStore = async () => {
    if (!user) {
      alert('Please log in to add products to your store');
      return;
    }
    
    // Get business_id from user object (already available from AuthContext)
    const business_id = (user as any).business_id;
    
    if (!business_id) {
      alert('Business ID not found. Please contact support.');
      console.error('User object:', user);
      return;
    }
    
    try {
      const selectedProducts = rows.filter(r => state.selectedIds.has(r.id));
      
      for (const product of selectedProducts) {
        try {
          // Generate a unique product_id
          const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Check if product already exists
          const { data: existing } = await supabase
            .from('products')
            .select('product_id')
            .eq('business_id', business_id)
            .or(`name.eq.${product.name},barcode.eq.${product.barcode || ''}`)
            .maybeSingle();

          if (existing) continue; // Skip if already exists

          // Add product to store as pending confirmation (don't set branch_id to allow it to show in all branches)
          await supabase.from('products').insert({
            product_id: productId,
            name: product.name,
            category: product.category || 'Uncategorized',
            price: 0,
            stock_quantity: 0,
            image_url: product.imageUrl || null,
            barcode: product.barcode || null,
            business_id: business_id,
            branch_id: null, // Set to null so it shows in all branches
            supplier_info: product.brand || null,
            reorder_level: 10,
            tax_rate: 20,
            pending_confirmation: true // Mark as pending for confirmation in Products page
          });
        } catch (error) {
          console.error('Error adding product:', error);
        }
      }
      
      alert(`Added ${selectedProducts.length} product(s) as pending! Go to Products page to confirm and set prices & stock.`);
      clearSelection();
    } catch (error) {
      console.error('Error in bulk add:', error);
      alert('Failed to add products to store');
    }
  };

  const renameProduct = (id: string, nextName: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, name: nextName } : r)));
  };

  const setImageFor = (id: string, url: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, imageUrl: url } : r)));
  };

  const addSingleProduct = async (product: ProductRow) => {
    if (!user) {
      alert('Please log in to add products to your store');
      return;
    }
    
    // Get business_id from user object (already available from AuthContext)
    const business_id = (user as any).business_id;
    
    console.log('User object:', user);
    console.log('Business ID:', business_id);
    
    if (!business_id) {
      alert('Business ID not found. Please contact support.');
      console.error('User object:', user);
      return;
    }
    
    try {

      // Generate a unique product_id (using timestamp + random)
      const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if product already exists
      const { data: existing } = await supabase
        .from('products')
        .select('product_id')
        .eq('business_id', business_id)
        .or(`name.eq.${product.name},barcode.eq.${product.barcode || ''}`)
        .maybeSingle();

      if (existing) {
        alert('This product already exists in your store');
        return;
      }

      // Add product to store as pending confirmation (don't set branch_id to allow it to show in all branches)
      const { data: insertedProduct, error: insertError } = await supabase.from('products').insert({
        product_id: productId,
        name: product.name,
        category: product.category || 'Uncategorized',
        price: 0,
        stock_quantity: 0,
        image_url: product.imageUrl || null,
        barcode: product.barcode || null,
        business_id: business_id,
        branch_id: null, // Set to null so it shows in all branches
        supplier_info: product.brand || null,
        reorder_level: 10,
        tax_rate: 20,
        pending_confirmation: true // Mark as pending for confirmation in Products page
      }).select();

      if (insertError) {
        console.error('Insert error:', insertError);
        alert('Failed to add product: ' + insertError.message);
        return;
      }

      console.log('Product added successfully:', insertedProduct);
      
      // Verify the product was added by querying the database
      const { data: verifyProduct, error: verifyError } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', productId)
        .single();
      
      console.log('Verification query result:', verifyProduct);
      console.log('Verification error:', verifyError);
      
      // Also check how many products exist for this business
      const { data: allProducts } = await supabase
        .from('products')
        .select('product_id, name, business_id, branch_id')
        .eq('business_id', business_id);
      
      console.log(`Total products for business ${business_id}:`, allProducts?.length);
      console.log('All products:', allProducts);
      
      alert(`Product "${product.name}" added as pending! Go to Products page to confirm and set price & stock.`);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product to store');
    }
  };

  const SelectionBar = () => (
    <div className={styles.selectionBar}>
      <div className={styles.selectionBarContent}>
        <div className={styles.selectionBarInner}>
          <div className={styles.selectionCount}>
            <span className={styles.selectionCountNumber}>{state.selectedIds.size}</span> selected
          </div>
          <div className={styles.selectionActions}>
            <button onClick={() => bulkCategorize("Spices/Condiments/Seasonings")} className={styles.selectionButton}>Set Category: Spices</button>
            <button onClick={() => bulkCategorize("Snacks & Confectionery")} className={styles.selectionButton}>Set Category: Snacks</button>
            <button onClick={bulkAddToStore} className={`${styles.selectionButton} ${styles.selectionButtonPrimary}`}>Add to store</button>
            <button onClick={clearSelection} className={styles.selectionButton}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <Box className="h-9 w-9" />
            Product Database
          </div>
          <div className={styles.headerControls}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                value={state.query}
                onChange={(e) => setState(s => ({ ...s, query: e.target.value }))}
                placeholder="Search name, brand, or barcode (Ctrl/Cmd+K)"
                className={styles.searchInput}
              />
            </div>
            <button
              className={styles.filterButton}
              onClick={() => {
                const wantBarcode = state.filters.hasBarcode === undefined ? true : state.filters.hasBarcode === false ? undefined : false; // cycle true -> false -> undefined
                setState(s => ({ ...s, filters: { ...s.filters, hasBarcode: wantBarcode } }));
              }}
              title="Toggle Has Barcode filter"
            >
              <Barcode className="h-4 w-4"/>
              {state.filters.hasBarcode === true ? "Has barcode" : state.filters.hasBarcode === false ? "No barcode" : "Barcode: Any"}
            </button>
            <button
              className={styles.viewButton}
              onClick={() => {
                const views: UIState["view"][] = ["cards", "list", "table"]; 
                const next = views[(views.indexOf(state.view) + 1) % views.length];
                setState(s => ({ ...s, view: next }));
              }}
              title="Switch view"
            >
              {state.view === "cards" ? <Grid className="h-4 w-4"/> : state.view === "list" ? <List className="h-4 w-4"/> : <TableIcon className="h-4 w-4"/>}
              {state.view.charAt(0).toUpperCase() + state.view.slice(1)}
            </button>
            <SortMenu state={state} setState={setState} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className={styles.body}>
        {/* Left Rail */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>
              <Filter className="h-4 w-4"/> Filters
            </div>
            <div>
              <div className={styles.filterSection}>
                <div className={styles.filterSectionTitle}>Categories</div>
                <div className={styles.filterList}>
                  {CATEGORIES.map(cat => (
                    <label key={cat} className={styles.filterItem}>
                      <div className={styles.filterItemContent}>
                        <input
                          type="checkbox"
                          checked={state.filters.category.includes(cat)}
                          onChange={(e) => {
                            setState(s => {
                              const next = new Set(s.filters.category);
                              if (e.target.checked) next.add(cat); else next.delete(cat);
                              return { ...s, filters: { ...s.filters, category: Array.from(next) } };
                            });
                          }}
                        />
                        <span className={styles.filterItemText}>{cat}</span>
                      </div>
                      <span className={styles.filterItemCount}>{countsByCategory.get(cat) || 0}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.filterSection}>
                <div className={styles.filterSectionTitle}>Brands</div>
                <div className={`${styles.filterList} ${styles.brandList}`}>
                  {brands.map(b => (
                    <label key={b} className={styles.filterItem}>
                      <div className={styles.filterItemContent}>
                        <input
                          type="checkbox"
                          checked={state.filters.brand.includes(b)}
                          onChange={(e) => {
                            setState(s => {
                              const next = new Set(s.filters.brand);
                              if (e.target.checked) next.add(b); else next.delete(b);
                              return { ...s, filters: { ...s.filters, brand: Array.from(next) } };
                            });
                          }}
                        />
                        <span className={styles.filterItemText}>{b}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <main className={styles.mainContent}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.spinner}/>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className={styles.productViews}>
              {state.view === "cards" && (
                <div className={styles.cardsGrid}>
                  {filtered.map(r => (
                    <Card key={r.id} r={r} selected={state.selectedIds.has(r.id)} onSelect={() => toggleSelect(r.id)} onInspect={() => setInspecting(r)} onAdd={() => addSingleProduct(r)} />
                  ))}
                </div>
              )}
              {state.view === "list" && (
                <div className={styles.listContainer}>
                  {filtered.map(r => (
                    <Row key={r.id} r={r} selected={state.selectedIds.has(r.id)} onSelect={() => toggleSelect(r.id)} onInspect={() => setInspecting(r)} onAdd={() => addSingleProduct(r)} />
                  ))}
                </div>
              )}
              {state.view === "table" && (
                <TableView rows={filtered} selectedIds={state.selectedIds} toggleSelect={toggleSelect} onInspect={setInspecting} onAdd={addSingleProduct}/>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bulk Bar */}
      {state.selectedIds.size > 0 && <SelectionBar />}

      {/* Inspector */}
      {inspecting && (
        <Inspector r={inspecting} onClose={() => setInspecting(null)} onRename={(name) => renameProduct(inspecting.id, name)} onSetImage={(url) => setImageFor(inspecting.id, url)} onAdd={() => addSingleProduct(inspecting)} />
      )}
    </div>
  );
}

function SortMenu({ state, setState }: { state: UIState; setState: React.Dispatch<React.SetStateAction<UIState>> }) {
  const keys: UIState["sort"]["key"][] = ["name", "brand", "category", "hasImage", "hasBarcode"];
  return (
    <div className={styles.sortMenu}>
      <select
        className={styles.sortSelect}
        value={state.sort.key}
        onChange={(e) => setState(s => ({ ...s, sort: { ...s.sort, key: e.target.value as any } }))}
      >
        {keys.map(k => (
          <option key={k} value={k}>Sort: {k}</option>
        ))}
      </select>
      <button
        className={styles.sortToggle}
        onClick={() => setState(s => ({ ...s, sort: { ...s.sort, dir: s.sort.dir === "asc" ? "desc" : "asc" } }))}
        title="Toggle sort direction"
      >
        {state.sort.dir === "asc" ? "↑" : "↓"}
      </button>
    </div>
  );
}

function badge(text: string, tone: "neutral" | "ok" | "warn" | "danger" = "neutral") {
  const toneClass = tone === "ok" ? styles.badgeOk : 
                   tone === "warn" ? styles.badgeWarn : 
                   tone === "danger" ? styles.badgeDanger : 
                   styles.badgeNeutral;
  return <span className={`${styles.badge} ${toneClass}`}>{text}</span>;
}

function Card({ r, selected, onSelect, onInspect, onAdd }: { r: ProductRow; selected: boolean; onSelect: () => void; onInspect: () => void; onAdd: () => void }) {
  const hasBarcode = Boolean(r.barcode);
  const validBarcode = isValidEAN13(r.barcode) || isValidUPCA(r.barcode);
  const hasImage = Boolean(r.imageUrl);
  return (
    <div className={`${styles.productCard} ${selected ? styles.selected : ''}`}> 
      <div className={styles.productImage}>
        {hasImage ? (
          <img src={r.imageUrl} alt={r.name} className={styles.productImageImg} />
        ) : (
          <div className={styles.productImagePlaceholder}>
            <ImageIcon className={styles.productImageIcon}/>
          </div>
        )}
      </div>
      <div className={styles.productInfo}>
        <div className={styles.productDetails}>
          <div className={styles.productBrand}>{r.brand || "—"}</div>
          <div className={styles.productName}>{r.name}</div>
          <div className={styles.productBadges}>
            {badge(r.category || "Uncategorized")}
            {hasBarcode ? badge(validBarcode ? "Barcode" : "Invalid barcode", validBarcode ? "ok" : "danger") : badge("No barcode", "warn")}
          </div>
        </div>
        <input type="checkbox" checked={selected} onChange={onSelect} className={styles.productCheckbox}/>
      </div>
      <div className={styles.productActions}>
        <button onClick={onInspect} className={`${styles.button} ${styles.buttonSecondary}`}>Inspect</button>
        <button onClick={onAdd} className={`${styles.button} ${styles.buttonPrimary}`}>Add to store</button>
      </div>
    </div>
  );
}

function Row({ r, selected, onSelect, onInspect, onAdd }: { r: ProductRow; selected: boolean; onSelect: () => void; onInspect: () => void; onAdd: () => void }) {
  const hasBarcode = Boolean(r.barcode);
  const validBarcode = isValidEAN13(r.barcode) || isValidUPCA(r.barcode);
  return (
    <div className={styles.listItem}>
      <input type="checkbox" checked={selected} onChange={onSelect} />
      <div className={styles.listImage}>
        {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className={styles.listImageImg}/> : <div className={styles.listImagePlaceholder}><ImageIcon className={styles.listImageIcon}/></div>}
      </div>
      <div className={styles.listContent}>
        <div className={styles.listName}>{r.name}</div>
        <div className={styles.listDetails}>{r.brand} • {(r.category || "Uncategorized")}</div>
      </div>
      <div className={styles.listActions}>
        {hasBarcode ? badge(validBarcode ? "Barcode" : "Invalid barcode", validBarcode ? "ok" : "danger") : badge("No barcode", "warn")}
        <button onClick={onInspect} className={`${styles.button} ${styles.buttonSecondary}`}>Inspect</button>
        <button onClick={onAdd} className={`${styles.button} ${styles.buttonPrimary}`}>Add</button>
      </div>
    </div>
  );
}

function TableView({ rows, selectedIds, toggleSelect, onInspect, onAdd }: { rows: ProductRow[]; selectedIds: Set<string>; toggleSelect: (id: string) => void; onInspect: (r: ProductRow) => void; onAdd: (r: ProductRow) => void }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.tableHeader}>Sel</th>
            <th className={styles.tableHeader}>Product</th>
            <th className={styles.tableHeader}>Brand</th>
            <th className={styles.tableHeader}>Category</th>
            <th className={styles.tableHeader}>Barcode</th>
            <th className={styles.tableHeader}>Image</th>
            <th className={styles.tableHeader}></th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {rows.map(r => {
            const valid = isValidEAN13(r.barcode) || isValidUPCA(r.barcode);
            return (
              <tr key={r.id} className={styles.tableRow}>
                <td className={styles.tableCell}><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                <td className={`${styles.tableCell} font-medium`}>{r.name}</td>
                <td className={styles.tableCell}>{r.brand}</td>
                <td className={styles.tableCell}>{r.category || "Uncategorized"}</td>
                <td className={styles.tableCell}>{r.barcode ? (valid ? r.barcode : <span className="text-red-600">{r.barcode} ✕</span>) : <span className="text-amber-600">—</span>}</td>
                <td className={styles.tableCell}>{r.imageUrl ? "Yes" : "No"}</td>
                <td className={`${styles.tableCell} ${styles.tableCellFlex}`}>
                  <button onClick={() => onInspect(r)} className={`${styles.button} ${styles.buttonSecondary}`}>Inspect</button>
                  <button onClick={() => onAdd(r)} className={`${styles.button} ${styles.buttonPrimary}`}>Add</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <ImageIcon className={styles.emptyStateIcon}/>
      <div className={styles.emptyStateTitle}>No products found</div>
      <div className={styles.emptyStateText}>Try a different search or clear some filters.</div>
    </div>
  );
}

function Inspector({ r, onClose, onRename, onSetImage, onAdd }: { r: ProductRow; onClose: () => void; onRename: (name: string) => void; onSetImage: (url: string) => void; onAdd: () => void }) {
  const [name, setName] = useState(r.name);
  const [img, setImg] = useState(r.imageUrl || "");
  const [cat, setCat] = useState(r.category || "Uncategorized");
  const [bc, setBc] = useState(r.barcode || "");

  const valid = isValidEAN13(bc) || isValidUPCA(bc);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImg(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={styles.inspectorOverlay} onClick={handleOverlayClick}>
      <div className={styles.inspectorPanel}>
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorTitle}>Inspector</div>
          <button onClick={onClose} className={styles.inspectorCloseButton}><X className="h-5 w-5"/></button>
        </div>
        <div className={styles.inspectorBody}>
          <div className={styles.inspectorImage}>
            {img ? <img src={img} alt={name} className={styles.inspectorImageImg}/> : <div className={styles.inspectorImagePlaceholder}><ImageIcon className={styles.inspectorImageIcon}/></div>}
          </div>
          <div className={styles.inspectorFormGroup}>
            <label className={styles.inspectorLabel}>Product name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className={styles.inspectorInput}/>
            <button onClick={()=>onRename(name)} className={`${styles.inspectorButton} mt-1`}><Edit3 className="h-4 w-4"/> Rename</button>
          </div>
          <div className={styles.inspectorGrid}>
            <div>
              <label className={styles.inspectorLabel}>Brand</label>
              <input value={r.brand} disabled className={styles.inspectorInput}/>
            </div>
            <div>
              <label className={styles.inspectorLabel}>Category</label>
              <select value={cat} onChange={(e)=>setCat(e.target.value)} className={styles.inspectorSelect}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={styles.inspectorLabel}>Image</label>
            <input value={img} onChange={(e)=>setImg(e.target.value)} placeholder="https:// or upload file" className={styles.inspectorInput}/>
            <div className={styles.inspectorButtonGroup}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="image-upload"
              />
              <label htmlFor="image-upload" className={styles.inspectorButton}>
                <ImageIcon className="h-4 w-4"/> Upload File
              </label>
              <button onClick={()=>onSetImage(img)} className={styles.inspectorButton}>Replace image</button>
              <a href={img || "#"} target="_blank" rel="noreferrer" className={`${styles.inspectorButton} ${!img ? styles.disabled : ''}`}>Open</a>
            </div>
          </div>
          <div>
            <label className={styles.inspectorLabel}>Barcode</label>
            <input value={bc} onChange={(e)=>setBc(e.target.value)} className={styles.inspectorInput}/>
            <div className={`${styles.inspectorStatus} ${bc ? (valid ? styles.inspectorStatusValid : styles.inspectorStatusInvalid) : styles.inspectorStatusMissing}`}>
              Status: {bc ? (valid ? "Valid" : "Invalid") : "Missing"}
            </div>
          </div>
          <div className={styles.inspectorFooter}>
            <button onClick={onAdd} className={`${styles.inspectorButton} ${styles.inspectorButtonPrimary}`}><Plus className="h-4 w-4"/> Add to store</button>
            <button onClick={onClose} className={styles.inspectorButton}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

