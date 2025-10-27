import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Customer, CustomerFieldDefinition, CustomerCustomField } from '../types/multitenant';
import { Button } from './ui/Button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Save, X } from 'lucide-react';
import styles from './CustomerProfileEditor.module.css';

interface CustomerProfileEditorProps {
  customer: Customer;
  businessId: number;
  onSave: (updatedCustomer: Customer) => void;
  onCancel: () => void;
}

const CustomerProfileEditor: React.FC<CustomerProfileEditorProps> = ({
  customer,
  businessId,
  onSave,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomerFieldDefinition[]>([]);
  const [customFields, setCustomFields] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState({
    name: customer.name,
    phone_number: customer.phone_number,
    email: customer.email || '',
    gender: customer.gender || '',
    icon: customer.icon || ''
  });

  useEffect(() => {
    fetchFieldDefinitions();
    fetchCustomFields();
  }, [customer.customer_id, businessId]);

  const fetchFieldDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_field_definitions')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setFieldDefinitions(data || []);
    } catch (err) {
      console.error('Error fetching field definitions:', err);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_custom_fields')
        .select('*')
        .eq('customer_id', customer.customer_id);

      if (error) throw error;
      
      const fieldValues: Record<number, string> = {};
      data?.forEach(field => {
        fieldValues[field.field_id] = field.field_value || '';
      });
      setCustomFields(fieldValues);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Check email uniqueness if email is being changed and not empty
      const trimmedEmail = formData.email?.trim();
      const originalEmail = customer.email?.trim();
      
      if (trimmedEmail && trimmedEmail !== originalEmail) {
        console.log('Checking email uniqueness for:', trimmedEmail);
        
        const { data: existingCustomer, error: checkError } = await supabase
          .from('customers')
          .select('customer_id, email')
          .eq('email', trimmedEmail)
          .neq('customer_id', customer.customer_id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking email uniqueness:', checkError);
          throw checkError;
        }

        console.log('Existing customer found:', existingCustomer);

        if (existingCustomer) {
          alert(`Email address "${trimmedEmail}" is already in use by another customer`);
          setLoading(false);
          return;
        }
      }

      // Check phone number uniqueness if phone is being changed
      const trimmedPhone = formData.phone_number?.trim();
      const originalPhone = customer.phone_number?.trim();
      
      if (trimmedPhone && trimmedPhone !== originalPhone) {
        console.log('Checking phone uniqueness for:', trimmedPhone);
        
        const { data: existingCustomer, error: checkError } = await supabase
          .from('customers')
          .select('customer_id, phone_number')
          .eq('phone_number', trimmedPhone)
          .eq('business_id', businessId)
          .neq('customer_id', customer.customer_id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking phone uniqueness:', checkError);
          throw checkError;
        }

        console.log('Existing customer with phone found:', existingCustomer);

        if (existingCustomer) {
          alert(`Phone number "${trimmedPhone}" is already in use by another customer`);
          setLoading(false);
          return;
        }
      }

      // Update basic customer info
      const { data: updatedCustomer, error: customerError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          phone_number: trimmedPhone,
          email: trimmedEmail || null,
          gender: formData.gender || null,
          icon: formData.icon || null
        })
        .eq('customer_id', customer.customer_id)
        .select()
        .single();

      if (customerError) {
        console.error('Customer update error:', customerError);
        throw customerError;
      }

      // Update custom fields
      for (const [fieldId, value] of Object.entries(customFields)) {
        const fieldIdNum = parseInt(fieldId);
        
        if (value.trim()) {
          // Upsert custom field value
          const { error: customFieldError } = await supabase
            .from('customer_custom_fields')
            .upsert({
              customer_id: customer.customer_id,
              field_id: fieldIdNum,
              field_value: value.trim()
            });

          if (customFieldError) throw customFieldError;
        } else {
          // Remove empty custom field values
          const { error: deleteError } = await supabase
            .from('customer_custom_fields')
            .delete()
            .eq('customer_id', customer.customer_id)
            .eq('field_id', fieldIdNum);

          if (deleteError) throw deleteError;
        }
      }

      onSave(updatedCustomer);
    } catch (err: any) {
      console.error('Error saving customer profile:', err);
      
      // Show specific error messages based on the error
      if (err.code === '23505' || err.status === 409) {
        if (err.message?.includes('email') || err.details?.includes('email')) {
          alert('Email address is already in use by another customer');
        } else if (err.message?.includes('phone') || err.details?.includes('phone') || err.message?.includes('customers_phone_business_unique')) {
          alert('Phone number is already in use by another customer in this business');
        } else {
          alert('This information is already in use by another customer. Please check email and phone number.');
        }
      } else if (err.message?.includes('duplicate key')) {
        alert('This information is already in use by another customer');
      } else {
        alert(`Failed to save customer profile: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFieldInput = (field: CustomerFieldDefinition) => {
    const value = customFields[field.field_id] || '';

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );
      
      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        );
      
      case 'phone':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            className={styles.selectInput}
          >
            <option value="">Select an option</option>
            {field.field_options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <select
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            className={styles.selectInput}
          >
            <option value="">Select an option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setCustomFields(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className={styles.profileEditor}>
      <div className={styles.header}>
        <h3 className={styles.title}>Edit Customer Profile</h3>
        <Button variant="ghost" onClick={onCancel}>
          <X size={16} />
        </Button>
      </div>

      {/* Basic Information */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Basic Information</h4>
        
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className={styles.formField}>
            <Label htmlFor="phone_number">Phone Number *</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className={styles.formField}>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className={styles.selectInput}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      {fieldDefinitions.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Additional Information</h4>
          
          {fieldDefinitions.map((field) => (
            <div key={field.field_id} className={styles.formField}>
              <Label htmlFor={`custom_${field.field_id}`}>
                {field.field_label}
                {field.is_required && <span style={{ color: 'var(--error-color)', marginLeft: '0.25rem' }}>*</span>}
              </Label>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
          <Save size={16} />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default CustomerProfileEditor;
