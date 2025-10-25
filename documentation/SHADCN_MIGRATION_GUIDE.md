# shadcn/ui Migration Guide

## Overview

This guide helps you migrate from the existing custom form system to the new shadcn/ui based form components. The new system provides better accessibility, consistency, and modern design patterns.

## What's New

### ✅ Completed Setup
- **Tailwind CSS**: Full Tailwind CSS integration with custom configuration
- **shadcn/ui Components**: Core UI components (Button, Input, Card, Dialog, etc.)
- **Path Aliases**: `@/` alias configured for clean imports
- **CSS Variables**: shadcn/ui design tokens integrated with your existing theme system
- **Form Components**: Complete shadcn/ui form system ready to use

### 🎨 Design System Integration
- **Theme Support**: Works with your existing light/dark theme system
- **Brand Colors**: Integrates with your sage green and cream color palette
- **Consistent Styling**: All components follow the same design patterns
- **Accessibility**: Built-in ARIA support and keyboard navigation

## Migration Steps

### 1. Import Changes

**Old System:**
```tsx
import { FormModal, FormInput, FormButton } from '@/components/forms'
```

**New System:**
```tsx
import { FormModal, FormInput, FormButton } from '@/components/forms/shadcn'
```

### 2. Component Usage

The API is largely the same, but with improved TypeScript support and better styling:

```tsx
// Old system
<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Add Product"
  footer={footerContent}
>
  <FormInput
    label="Product Name"
    value={name}
    onChange={setName}
    required
  />
</FormModal>

// New system (same API, better styling)
<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Add Product"
  footer={footerContent}
>
  <FormInput
    label="Product Name"
    value={name}
    onChange={setName}
    required
  />
</FormModal>
```

### 3. Available Components

| Component | Description | Status |
|-----------|-------------|---------|
| `FormModal` | Modal dialog with header/footer | ✅ Ready |
| `FormInput` | Text input with validation | ✅ Ready |
| `FormTextarea` | Multi-line text input | ✅ Ready |
| `FormSelect` | Dropdown select | ✅ Ready |
| `FormButton` | Styled button with variants | ✅ Ready |
| `FormCheckbox` | Checkbox with label | ✅ Ready |
| `FormGrid` | Responsive grid layout | ✅ Ready |

### 4. Button Variants

The new system supports more button variants:

```tsx
<FormButton variant="primary">Primary</FormButton>
<FormButton variant="secondary">Secondary</FormButton>
<FormButton variant="destructive">Delete</FormButton>
<FormButton variant="outline">Outline</FormButton>
<FormButton variant="ghost">Ghost</FormButton>
<FormButton variant="link">Link</FormButton>
```

### 5. Error Handling

Enhanced error display with better styling:

```tsx
<FormInput
  label="Email"
  value={email}
  onChange={setEmail}
  error={emailError} // Automatically styled with red border and text
  required
/>
```

## Benefits of Migration

### 🚀 Performance
- **Smaller Bundle**: Tree-shakeable components
- **Better CSS**: Tailwind's utility-first approach
- **Optimized**: No unused CSS or JavaScript

### 🎨 Design
- **Consistent**: All components follow the same design system
- **Modern**: Clean, professional appearance
- **Responsive**: Mobile-first design approach
- **Accessible**: WCAG compliant components

### 🛠️ Developer Experience
- **TypeScript**: Full type safety
- **IntelliSense**: Better autocomplete and error detection
- **Maintainable**: Easier to customize and extend
- **Documentation**: Well-documented components

## Example Migration

Here's a complete example of migrating a product form:

```tsx
// Before (old system)
import { FormModal, FormInput, FormSelect, FormButton, FormGrid } from '@/components/forms'

const ProductForm = () => {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Add Product">
      <FormGrid columns={2}>
        <FormInput label="Name" value={name} onChange={setName} />
        <FormInput label="Price" value={price} onChange={setPrice} />
      </FormGrid>
      <FormSelect
        label="Category"
        value={category}
        onChange={setCategory}
        options={categories}
      />
      <FormButton variant="primary" onClick={handleSave}>
        Save Product
      </FormButton>
    </FormModal>
  )
}

// After (new system)
import { FormModal, FormInput, FormSelect, FormButton, FormGrid } from '@/components/forms/shadcn'

const ProductForm = () => {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Add Product">
      <FormGrid columns={2}>
        <FormInput label="Name" value={name} onChange={setName} />
        <FormInput label="Price" value={price} onChange={setPrice} />
      </FormGrid>
      <FormSelect
        label="Category"
        value={category}
        onChange={setCategory}
        options={categories}
      />
      <FormButton variant="primary" onClick={handleSave}>
        Save Product
      </FormButton>
    </FormModal>
  )
}
```

## Next Steps

1. **Start Small**: Begin with one form at a time
2. **Test Thoroughly**: Ensure all functionality works as expected
3. **Update Imports**: Change import paths to use the new shadcn components
4. **Remove Old CSS**: Clean up unused CSS modules
5. **Customize**: Adjust colors and styling to match your brand

## Support

If you encounter any issues during migration:
1. Check the example usage in `src/components/forms/shadcn/ExampleUsage.tsx`
2. Refer to the shadcn/ui documentation
3. Ensure all dependencies are installed correctly

The new system is designed to be a drop-in replacement with minimal changes required!
