# Form System

A comprehensive, themeable form system with light and dark mode support.

## Components

### FormModal
The main modal container with header, body, and footer sections.

```tsx
import { FormModal } from '@/components/forms'

<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Add New Product"
  footer={footerContent}
>
  {/* Form content */}
</FormModal>
```

### FormInput
Text input field with validation and error states.

```tsx
<FormInput
  label="Product Name"
  type="text"
  value={value}
  onChange={setValue}
  placeholder="Enter product name"
  required
  error={errorMessage}
/>
```

### FormTextarea
Multi-line text input.

```tsx
<FormTextarea
  label="Description"
  value={value}
  onChange={setValue}
  placeholder="Enter description"
  rows={4}
/>
```

### FormSelect
Dropdown select with options.

```tsx
<FormSelect
  label="Category"
  value={value}
  onChange={setValue}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  placeholder="Select an option"
  required
/>
```

### FormButton
Styled button with variants and states.

```tsx
<FormButton
  variant="primary"
  size="medium"
  onClick={handleSubmit}
  loading={isLoading}
  disabled={!isValid}
>
  Submit
</FormButton>
```

### FormCheckbox
Checkbox input with custom styling.

```tsx
<FormCheckbox
  label="I agree to the terms"
  checked={isChecked}
  onChange={setIsChecked}
/>
```

### FormGrid
Responsive grid layout for form fields.

```tsx
<FormGrid columns={2} gap="medium">
  <FormInput label="First Name" />
  <FormInput label="Last Name" />
</FormGrid>
```

## Features

### Theme Support
- **Light Mode**: Clean, professional appearance with subtle shadows
- **Dark Mode**: Modern dark theme with proper contrast
- **Automatic Switching**: Uses CSS custom properties for seamless theme changes

### Responsive Design
- Mobile-first approach
- Adaptive grid layouts
- Touch-friendly button sizes

### Accessibility
- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

### Validation
- Built-in error states
- Required field indicators
- Custom error messages

## Usage Examples

### Basic Form
```tsx
import { FormModal, FormInput, FormButton } from '@/components/forms'

const BasicForm = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')

  return (
    <FormModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Basic Form"
      footer={
        <FormButton onClick={() => console.log(name)}>
          Submit
        </FormButton>
      }
    >
      <FormInput
        label="Name"
        value={name}
        onChange={setName}
        required
      />
    </FormModal>
  )
}
```

### Complex Form with Grid
```tsx
<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Product Details"
  footer={footerButtons}
>
  <FormGrid columns={2}>
    <FormInput label="Name" value={name} onChange={setName} />
    <FormInput label="SKU" value={sku} onChange={setSku} />
  </FormGrid>
  
  <FormSelect
    label="Category"
    value={category}
    onChange={setCategory}
    options={categoryOptions}
  />
  
  <FormTextarea
    label="Description"
    value={description}
    onChange={setDescription}
  />
</FormModal>
```

## Styling

The form system uses CSS custom properties for theming. To customize colors, override the CSS variables:

```css
:root {
  --primary-bg: #your-color;
  --text-primary: #your-text-color;
  /* ... other variables */
}
```

## Migration from Old Forms

To migrate existing forms:

1. Replace modal structure with `FormModal`
2. Convert input fields to `FormInput`, `FormSelect`, etc.
3. Use `FormButton` for actions
4. Wrap related fields in `FormGrid`
5. Remove custom CSS and rely on the form system styles

## Best Practices

1. **Use semantic labels**: Always provide descriptive labels
2. **Group related fields**: Use `FormGrid` for logical grouping
3. **Provide feedback**: Use error states and loading indicators
4. **Keep forms focused**: One primary action per form
5. **Mobile-first**: Test on mobile devices
