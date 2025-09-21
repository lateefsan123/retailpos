# 📖 Cursor Rules - Supabase Data Fetching

## 🔹 Core Principles

### One Source of Truth per Table
- Each table (`business_info`, `sales`, `side_business_sales`, etc.) should only have **one dedicated hook/provider** that fetches its data
- **Do not create multiple hooks** that run `supabase.from('table')` separately
- All other hooks should consume cached data (via React Query or Context)

### Always Use React Query
```typescript
// ✅ CORRECT
const { data, isLoading, error } = useQuery(['sales'], fetchSales)

// ❌ WRONG
useEffect(() => {
  fetchSales().then(setData)
}, [])
```

**Fetch**: `useQuery(['table'], fetchFn)`  
**Mutations**: `useMutation(mutationFn, { onSuccess: invalidateQueries })`  
**Never use** `useEffect(() => fetchFn(), [])` for Supabase queries

This ensures deduplication + caching + auto refetch.

### Batch Related Queries
When data spans multiple tables, prefer a **joined query** instead of multiple requests:

```typescript
// ✅ CORRECT - Single optimized query
supabase
  .from('sales')
  .select(`
    *,
    customers (name),
    shop_staff!sales_cashier_id_fkey (username),
    sale_items (
      *,
      products (name, price)
    )
  `)

// ❌ WRONG - Multiple separate queries
supabase.from('sales').select('*')
supabase.from('sale_items').select('*')
supabase.from('customers').select('*')
```

Cursor should suggest combining instead of looping fetches.

### Derived Hooks, No Extra Fetches
Hooks like `useBusinessInfo` or `useBusinessId` should **read from cached data**, not trigger a new query:

```typescript
// ✅ CORRECT
export const useBusinessInfo = () => {
  const { data: businesses } = useQuery(['businesses'])
  return businesses?.[0] ?? null
}

// ❌ WRONG
export const useBusinessInfo = () => {
  const [data, setData] = useState(null)
  useEffect(() => {
    supabase.from('business_info').select('*').then(setData)
  }, [])
  return data
}
```

## 🔹 Implementation Rules

### Refetch Only On Demand
- Provide a `refetch` function from React Query
- **Do not auto-refetch** unless the underlying data changes
- Use `queryClient.invalidateQueries(['table'])` after mutations

### Error & Loading States
Every hook must expose:
```typescript
{
  data,
  isLoading,
  error
}
```

Components should **never directly await** supabase calls — they use hooks only.

### Logging Rule (Debugging)
Every fetch function should log once:
```typescript
console.log('[fetchBusinesses] fetching business_info…')
```

This helps detect duplicate queries.

### Invalidate Queries After Mutations
Always call `queryClient.invalidateQueries(['table'])` after an insert, update, or delete:

```typescript
const mutation = useMutation(deleteSale, {
  onSuccess: () => {
    queryClient.invalidateQueries(['sales'])
  }
})
```

### Global Context Allowed
If React Query is unavailable, use Context Providers:
- The provider should fetch **once on mount**
- All consumer hooks **read from context only**

## 🔹 Performance Rules

### Target Performance
**One page load should result in only 1–3 requests per major table, not dozens**

Cursor should automatically consolidate queries until this goal is met.

### Example Optimization
```typescript
// ❌ BAD - Multiple hooks making separate calls
const useTransactions = () => {
  const [sales, setSales] = useState([])
  useEffect(() => {
    supabase.from('sales').select('*').then(setSales)
  }, [])
}

const useSalesAnalytics = () => {
  const [sales, setSales] = useState([])
  useEffect(() => {
    supabase.from('sales').select('*').then(setSales)
  }, [])
}

// ✅ GOOD - Single source of truth
const useSalesData = () => {
  return useQuery(['sales'], () => 
    supabase.from('sales').select('*, sale_items(*), customers(*)')
  )
}

const useTransactions = () => {
  const { data: sales } = useSalesData()
  return { transactions: sales }
}

const useSalesAnalytics = () => {
  const { data: sales } = useSalesData()
  return { analytics: processSales(sales) }
}
```

## 🔹 File Structure Rules

### Hook Organization
```
src/hooks/
├── data/           # Data fetching hooks only
│   ├── useSalesData.ts
│   ├── useBusinessData.ts
│   └── useProductsData.ts
├── derived/        # Hooks that consume cached data
│   ├── useTransactions.ts
│   ├── useSalesAnalytics.ts
│   └── useBusinessInfo.ts
└── utils/          # Utility hooks
    ├── useBusinessId.ts
    └── useDebounce.ts
```

### Naming Conventions
- **Data hooks**: `use[Table]Data` (e.g., `useSalesData`, `useProductsData`)
- **Derived hooks**: `use[Feature]` (e.g., `useTransactions`, `useAnalytics`)
- **Utility hooks**: `use[Utility]` (e.g., `useBusinessId`, `useDebounce`)

## 🔹 Enforcement

Cursor should:
1. **Detect duplicate queries** and suggest consolidation
2. **Warn about useEffect data fetching** patterns
3. **Suggest React Query** for new data fetching
4. **Recommend joined queries** for related data
5. **Flag excessive API calls** (more than 3-5 per page)

## 🔹 Migration Guide

### Step 1: Identify Data Sources
Find all `supabase.from()` calls in your codebase

### Step 2: Create Data Hooks
Convert each table to a single data hook with React Query

### Step 3: Update Derived Hooks
Make existing hooks consume cached data instead of fetching

### Step 4: Remove Duplicate Queries
Eliminate redundant API calls

### Step 5: Add Query Invalidation
Ensure mutations properly invalidate related queries

---

**Remember**: The goal is **fewer, smarter queries** that provide **better performance** and **cleaner code**.
