# Page Header Standardization Plan

## Overview
We need to standardize the page headers across all major pages to ensure consistent theming (light/dark mode) and styling. The new `PageHeader` component has been created and is ready for implementation.

## Pages to Update

### 1. Products Page ✅ (Partially Done)
- **Current Status**: PageHeader component created and imported
- **Header**: "Inventory Management"
- **Subtitle**: "Manage your product inventory, stock levels, and suppliers"
- **Actions**: BranchSelector, Print Labels button, Add Product button
- **Next Step**: Replace the existing header div with PageHeader component

### 2. Admin Page
- **Current Status**: Needs update
- **Header**: "User Management" or "Administration"
- **Subtitle**: "Manage users, roles, and system settings"
- **Actions**: Add User button, role management tools
- **Files to Update**: `src/pages/Admin.tsx`

### 3. Reminders Page
- **Current Status**: Needs update
- **Header**: "Reminders & Tasks"
- **Subtitle**: "Manage your reminders and scheduled tasks"
- **Actions**: Add Reminder button, filter options
- **Files to Update**: `src/pages/Reminders.tsx`

### 4. Side Business Page
- **Current Status**: Needs update
- **Header**: "Side Businesses"
- **Subtitle**: "Manage your additional business locations"
- **Actions**: Add Business button, business switcher
- **Files to Update**: `src/pages/SideBusinesses.tsx`

### 5. Promotions Page
- **Current Status**: Needs update
- **Header**: "Promotions & Discounts"
- **Subtitle**: "Create and manage promotional campaigns"
- **Actions**: Add Promotion button, campaign tools
- **Files to Update**: `src/pages/Promotions.tsx` (if exists)

### 6. Dashboard Page
- **Current Status**: Needs update
- **Header**: "Dashboard Overview"
- **Subtitle**: "Monitor your business performance and key metrics"
- **Actions**: Refresh button, date range selector
- **Files to Update**: `src/pages/Dashboard.tsx` or `src/pages/DashboardMobile.tsx`

## Implementation Steps

### Step 1: Import PageHeader Component
```tsx
import PageHeader from '../components/PageHeader'
```

### Step 2: Replace Existing Header
Find the existing header div and replace it with:
```tsx
<PageHeader
  title="Page Title"
  subtitle="Page description or instructions"
>
  {/* Action buttons and controls */}
</PageHeader>
```

### Step 3: Remove Hardcoded Colors
- Remove any hardcoded color values from header elements
- Remove inline styles for text colors
- Let CSS custom properties handle theme switching

### Step 4: Test Theme Switching
- Verify headers are black in light mode
- Verify headers are white in dark mode
- Check that subtitles have appropriate contrast

## Benefits

### ✅ Consistent Theming
- All headers automatically switch colors with theme
- No more hardcoded color values
- Unified appearance across the application

### ✅ Responsive Design
- Headers stack properly on mobile devices
- Action buttons adapt to screen size
- Consistent spacing and layout

### ✅ Maintainability
- Single component to update for styling changes
- Centralized header logic
- Easy to add new pages with consistent headers

### ✅ Accessibility
- Proper heading hierarchy (h1 for page titles)
- Consistent focus management
- Screen reader friendly structure

## CSS Custom Properties Used

### Light Mode
```css
--text-header: #000000;        /* Black headers */
--text-secondary: #6b7280;     /* Gray subtitles */
--border-color: #d1d5db;       /* Light gray borders */
```

### Dark Mode
```css
--text-header: #ffffff;        /* White headers */
--text-secondary: #d1d5db;     /* Light gray subtitles */
--border-color: #3a3a3a;       /* Dark gray borders */
```

## Files Created
- ✅ `src/components/PageHeader.tsx` - Main component
- ✅ `src/components/PageHeader.module.css` - Styling
- ✅ Updated `src/index.css` - CSS custom properties

## Priority Order
1. **Products Page** - Complete the partial implementation
2. **Dashboard Page** - Most frequently used
3. **Admin Page** - Important for user management
4. **Reminders Page** - User workflow
5. **Side Business Page** - Business management
6. **Promotions Page** - Marketing features

## Notes
- The PageHeader component is fully responsive and theme-aware
- It supports both title and subtitle
- Action buttons are placed in the headerActions section
- All styling uses CSS custom properties for automatic theme switching
- The component is already tested and ready for use

## Completion Criteria
- [ ] All 6 pages use PageHeader component
- [ ] Headers display correctly in both light and dark themes
- [ ] No hardcoded colors remain in header sections
- [ ] Responsive design works on all screen sizes
- [ ] All action buttons are properly positioned
