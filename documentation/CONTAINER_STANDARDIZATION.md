# Container Standardization Plan

## Overview
We need to standardize all containers (tables, cards, panels, sections) across the application to ensure proper visibility and contrast in both light and dark modes. Currently, containers lack proper borders and contrast in light mode, and use incorrect colors in dark mode.

## Problem Statement

### Current Issues:
1. **Light Mode Problems:**
   - Containers blend with the background due to insufficient contrast
   - Missing or weak borders make content areas hard to distinguish
   - Poor visual hierarchy

2. **Dark Mode Problems:**
   - Containers use the same colors as light mode instead of theme-aware colors
   - Should use colors darker than the background (#3C3C3C)
   - Text remains dark instead of switching to white

## Design Specifications

### Light Mode
**Background Colors:**
- Primary Background: `#f5f5f5` or `#ffffff`
- Container Background: `#ffffff`
- Card Background: `#ffffff`
- Table Background: `#ffffff`
- Nested Container: `#f9fafb`

**Borders:**
- Primary Border: `2px solid #d1d5db` (gray-300)
- Subtle Border: `1px solid #e5e7eb` (gray-200)
- Accent Border: `3px solid #bca88d` (brand color for emphasis)

**Text Colors:**
- Primary Text: `#000000` or `#1a1a1a`
- Secondary Text: `#6b7280` (gray-500)
- Muted Text: `#9ca3af` (gray-400)

**Shadows:**
- Card Shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Elevated Shadow: `0 4px 6px rgba(0, 0, 0, 0.1)`
- Hover Shadow: `0 10px 15px rgba(0, 0, 0, 0.1)`

### Dark Mode
**Background Colors:**
- Primary Background: `#3C3C3C`
- Container Background: `#2a2a2a` (darker than primary)
- Card Background: `#262626` (even darker for elevation)
- Table Background: `#2a2a2a`
- Nested Container: `#222222`

**Borders:**
- Primary Border: `2px solid #4a4a4a` (lighter than background)
- Subtle Border: `1px solid #444444`
- Accent Border: `3px solid #bca88d` (brand color for emphasis)

**Text Colors:**
- Primary Text: `#ffffff` or `#f1f0e4`
- Secondary Text: `#d1d5db` (gray-300)
- Muted Text: `#9ca3af` (gray-400)

**Shadows:**
- Card Shadow: `0 1px 3px rgba(0, 0, 0, 0.3)`
- Elevated Shadow: `0 4px 6px rgba(0, 0, 0, 0.4)`
- Hover Shadow: `0 10px 15px rgba(0, 0, 0, 0.5)`

## CSS Custom Properties

### Add to `src/index.css`

```css
/* Light Mode */
:root {
  /* Backgrounds */
  --bg-primary: #f5f5f5;
  --bg-container: #ffffff;
  --bg-card: #ffffff;
  --bg-table: #ffffff;
  --bg-nested: #f9fafb;
  
  /* Borders */
  --border-primary: 2px solid #d1d5db;
  --border-subtle: 1px solid #e5e7eb;
  --border-accent: 3px solid #bca88d;
  
  /* Text */
  --text-primary: #000000;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  
  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-elevated: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
[data-theme='dark'] {
  /* Backgrounds */
  --bg-primary: #3C3C3C;
  --bg-container: #2a2a2a;
  --bg-card: #262626;
  --bg-table: #2a2a2a;
  --bg-nested: #222222;
  
  /* Borders */
  --border-primary: 2px solid #4a4a4a;
  --border-subtle: 1px solid #444444;
  --border-accent: 3px solid #bca88d;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  
  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-hover: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

## Component-Specific Patterns

### 1. Table Containers
```tsx
<div style={{
  background: 'var(--bg-container)',
  border: 'var(--border-primary)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden'
}}>
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    background: 'var(--bg-table)'
  }}>
    <thead style={{
      background: 'var(--bg-nested)',
      borderBottom: 'var(--border-primary)'
    }}>
      <tr>
        <th style={{
          color: 'var(--text-primary)',
          padding: '16px',
          textAlign: 'left',
          fontWeight: '600',
          fontSize: '14px'
        }}>Header</th>
      </tr>
    </thead>
    <tbody>
      <tr style={{
        borderBottom: 'var(--border-subtle)'
      }}>
        <td style={{
          color: 'var(--text-primary)',
          padding: '16px'
        }}>Content</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 2. Card Components
```tsx
<div style={{
  background: 'var(--bg-card)',
  border: 'var(--border-primary)',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: 'var(--shadow-card)',
  transition: 'all 0.2s ease'
}}>
  <h3 style={{
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px'
  }}>Card Title</h3>
  <p style={{
    color: 'var(--text-secondary)',
    fontSize: '14px'
  }}>Card content goes here</p>
</div>
```

### 3. Section Panels
```tsx
<div style={{
  background: 'var(--bg-container)',
  border: 'var(--border-primary)',
  borderRadius: '12px',
  overflow: 'hidden'
}}>
  <div style={{
    background: 'var(--bg-nested)',
    padding: '20px 24px',
    borderBottom: 'var(--border-primary)'
  }}>
    <h2 style={{
      color: 'var(--text-primary)',
      fontSize: '20px',
      fontWeight: '600',
      margin: 0
    }}>Section Title</h2>
  </div>
  <div style={{
    padding: '24px'
  }}>
    {/* Section content */}
  </div>
</div>
```

### 4. Stats Cards
```tsx
<div style={{
  background: 'var(--bg-card)',
  border: 'var(--border-primary)',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: 'var(--shadow-card)'
}}>
  <p style={{
    color: 'var(--text-secondary)',
    fontSize: '14px',
    margin: '0 0 8px 0'
  }}>Label</p>
  <p style={{
    color: 'var(--text-primary)',
    fontSize: '28px',
    fontWeight: '700',
    margin: 0
  }}>Value</p>
</div>
```

## Pages to Update

### Priority 1 (High Traffic)
- [ ] **Products** (`src/pages/Products.tsx`)
  - Product table container
  - Stats cards
  - Pending products section
  
- [ ] **Dashboard** (`src/pages/Dashboard.tsx`)
  - Stats cards
  - Recent transactions section
  - Sales chart container
  
- [ ] **Transactions** (`src/pages/Transactions.tsx`)
  - Transaction cards
  - Filter container
  - Table wrapper

### Priority 2 (Core Features)
- [ ] **Admin** (`src/pages/Admin.tsx`)
  - Users table container
  - Pending registrations section
  - Action cards
  
- [ ] **Suppliers** (`src/pages/Suppliers.tsx`)
  - Suppliers table
  - Supplier cards
  - Visit history section
  
- [ ] **Reminders** (`src/pages/Reminders.tsx`)
  - Reminder cards (sticky notes should keep their colors)
  - Calendar container
  - Controls section

### Priority 3 (Additional Features)
- [ ] **Side Businesses** (`src/pages/SideBusinesses.tsx`)
  - Business cards
  - Items table
  - Sales section
  
- [ ] **Promotions** (`src/pages/Promotions.tsx`)
  - Promotion cards
  - Stats summary
  - Promotion form modal
  
- [ ] **Product Database** (`src/pages/ProductDatabase.tsx`)
  - Product cards
  - Table view
  - Inspector panel

### Exclusions
- ❌ **Sales Page** - Keep existing styling (as per requirements)
- ❌ **Modal Components** - Already have proper styling
- ❌ **Navigation Components** - Already theme-aware

## Implementation Steps

### Step 1: Update CSS Custom Properties
Add all new CSS variables to `src/index.css` for both light and dark modes.

### Step 2: Identify Hardcoded Colors
Search for and document all instances of:
- `background: '#ffffff'`
- `background: '#f9fafb'`
- `color: '#000000'`
- `color: '#1a1a1a'`
- `border: '1px solid #...'`

### Step 3: Replace with CSS Variables
Systematically replace hardcoded values with CSS custom properties:
```tsx
// Before
background: '#ffffff',
color: '#000000',
border: '2px solid #d1d5db'

// After
background: 'var(--bg-container)',
color: 'var(--text-primary)',
border: 'var(--border-primary)'
```

### Step 4: Test Theme Switching
For each updated page:
1. Test in light mode - verify visibility and contrast
2. Test in dark mode - verify darker containers and white text
3. Test theme toggle - ensure smooth transitions
4. Check hover states and interactions

### Step 5: Update Module CSS Files
For pages using CSS modules, update the `.module.css` files:
```css
.container {
  background: var(--bg-container);
  border: var(--border-primary);
  box-shadow: var(--shadow-card);
}

.cardTitle {
  color: var(--text-primary);
}

.cardSubtext {
  color: var(--text-secondary);
}
```

## Testing Checklist

### Visual Testing
- [ ] Containers are clearly visible in light mode with proper borders
- [ ] Containers are darker than background in dark mode
- [ ] Text is black in light mode, white in dark mode
- [ ] All borders are visible in both modes
- [ ] Shadows provide appropriate depth
- [ ] Brand accent colors remain consistent

### Interaction Testing
- [ ] Hover states work in both modes
- [ ] Active/selected states are visible
- [ ] Focus indicators are clear
- [ ] Transitions are smooth when switching themes

### Contrast Testing
- [ ] WCAG AA compliance for text contrast
- [ ] Container boundaries are clearly defined
- [ ] Interactive elements are easily identifiable

## Benefits

### ✅ Improved Visibility
- Clear container boundaries in light mode
- Proper contrast prevents content from blending with background
- Enhanced visual hierarchy

### ✅ True Dark Mode
- Containers properly darker than background
- White text improves readability
- Consistent dark mode experience

### ✅ Maintainability
- CSS custom properties allow easy theme adjustments
- Centralized color management
- No more scattered hardcoded values

### ✅ Consistency
- Unified appearance across all pages
- Predictable user experience
- Professional look and feel

### ✅ Accessibility
- Better contrast ratios
- Easier to read for all users
- Reduced eye strain in both modes

## Notes
- Keep Sales page styling unchanged
- Modal components already have proper theming
- Brand colors (#bca88d) should remain consistent across both modes
- Maintain existing border-radius values for consistency
- Preserve hover/active state animations

