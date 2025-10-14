import React, { useState } from 'react'
import {
  FormModal,
  FormInput,
  FormTextarea,
  FormSelect,
  FormButton,
  FormCheckbox,
  FormGrid
} from './index'

// Example usage of the form system
const ExampleUsage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    description: '',
    isActive: false
  })

  const handleSubmit = () => {
    console.log('Form submitted:', formData)
    setIsOpen(false)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const categoryOptions = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'books', label: 'Books' },
    { value: 'home', label: 'Home & Garden' }
  ]

  const footer = (
    <>
      <FormButton variant="secondary" onClick={handleClose}>
        Cancel
      </FormButton>
      <FormButton variant="primary" onClick={handleSubmit}>
        Save Changes
      </FormButton>
    </>
  )

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Open Example Form
      </button>

      <FormModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add New Item"
        footer={footer}
      >
        <FormGrid columns={2}>
          <FormInput
            label="Product Name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Enter product name"
            required
          />
          
          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            placeholder="Enter email address"
            required
          />
        </FormGrid>

        <FormSelect
          label="Category"
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value })}
          options={categoryOptions}
          placeholder="Select a category"
          required
        />

        <FormTextarea
          label="Description"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Enter product description"
          rows={4}
        />

        <FormCheckbox
          label="This product is active and available for sale"
          checked={formData.isActive}
          onChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
      </FormModal>
    </div>
  )
}

export default ExampleUsage
