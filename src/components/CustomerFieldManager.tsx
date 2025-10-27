import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CustomerFieldDefinition, CustomerFieldRequest } from '../types/multitenant';
import { Button } from './ui/Button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import styles from './CustomerFieldManager.module.css';

interface CustomerFieldManagerProps {
  businessId: number;
  onFieldsChange?: (fields: CustomerFieldDefinition[]) => void;
}

const CustomerFieldManager: React.FC<CustomerFieldManagerProps> = ({ businessId, onFieldsChange }) => {
  const [fields, setFields] = useState<CustomerFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<CustomerFieldDefinition | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CustomerFieldRequest>({
    business_id: businessId,
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    fetchFields();
  }, [businessId]);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_field_definitions')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setFields(data || []);
      onFieldsChange?.(data || []);
    } catch (err) {
      console.error('Error fetching customer fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_field_definitions')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;
      
      setFields(prev => [...prev, data]);
      onFieldsChange?.(fields);
      resetForm();
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding field:', err);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;

    try {
      const { data, error } = await supabase
        .from('customer_field_definitions')
        .update(formData)
        .eq('field_id', editingField.field_id)
        .select()
        .single();

      if (error) throw error;
      
      setFields(prev => prev.map(f => f.field_id === editingField.field_id ? data : f));
      onFieldsChange?.(fields);
      resetForm();
      setEditingField(null);
    } catch (err) {
      console.error('Error updating field:', err);
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm('Are you sure you want to delete this field? This will remove all customer data for this field.')) return;

    try {
      const { error } = await supabase
        .from('customer_field_definitions')
        .update({ is_active: false })
        .eq('field_id', fieldId);

      if (error) throw error;
      
      setFields(prev => prev.filter(f => f.field_id !== fieldId));
      onFieldsChange?.(fields);
    } catch (err) {
      console.error('Error deleting field:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      business_id: businessId,
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: fields.length
    });
  };

  const startEdit = (field: CustomerFieldDefinition) => {
    setEditingField(field);
    setFormData({
      business_id: field.business_id,
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options,
      is_required: field.is_required,
      is_active: field.is_active,
      display_order: field.display_order
    });
    setShowAddForm(true);
  };

  if (loading) {
    return <div className="p-4">Loading customer fields...</div>;
  }

  return (
    <div className={styles.fieldManager}>
      <div className={styles.header}>
        <h3 className={styles.title}>Customer Custom Fields</h3>
        <Button
          onClick={() => {
            resetForm();
            setEditingField(null);
            setShowAddForm(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Field
        </Button>
      </div>

      {/* Fields List */}
      <div className={styles.fieldsList}>
        {fields.map((field) => (
          <div key={field.field_id} className={styles.fieldItem}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldName}>
                <span>{field.field_label}</span>
                <span className={styles.fieldType}>({field.field_type})</span>
                {field.is_required && (
                  <span className={styles.requiredBadge}>Required</span>
                )}
              </div>
              <div className={styles.fieldDetails}>
                Field name: {field.field_name}
                {field.field_options && field.field_options.length > 0 && (
                  <span> • Options: {field.field_options.join(', ')}</span>
                )}
              </div>
            </div>
            <div className={styles.fieldActions}>
              <button
                className={styles.editButton}
                onClick={() => startEdit(field)}
                title="Edit field"
              >
                <Edit2 size={16} />
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteField(field.field_id)}
                title="Delete field"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h4 className={styles.formTitle}>
              {editingField ? 'Edit Field' : 'Add New Field'}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setEditingField(null);
                resetForm();
              }}
            >
              <X size={16} />
            </Button>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <Label htmlFor="field_name">Field Name</Label>
              <Input
                id="field_name"
                value={formData.field_name}
                onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                placeholder="e.g., date_of_birth"
              />
            </div>
            <div className={styles.formField}>
              <Label htmlFor="field_label">Field Label</Label>
              <Input
                id="field_label"
                value={formData.field_label}
                onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
                placeholder="e.g., Date of Birth"
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <Label htmlFor="field_type">Field Type</Label>
              <select
                id="field_type"
                value={formData.field_type}
                onChange={(e) => setFormData(prev => ({ ...prev, field_type: e.target.value as any }))}
                className={styles.formField}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="select">Select</option>
                <option value="boolean">Boolean (Yes/No)</option>
              </select>
            </div>
            <div className={styles.formField}>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {formData.field_type === 'select' && (
            <div className={styles.formField}>
              <Label htmlFor="field_options">Options (comma-separated)</Label>
              <Input
                id="field_options"
                value={formData.field_options?.join(', ') || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  field_options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt) 
                }))}
                placeholder="e.g., Option 1, Option 2, Option 3"
              />
            </div>
          )}

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))}
              />
              Required field
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setEditingField(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingField ? handleUpdateField : handleAddField}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {editingField ? 'Update' : 'Add'} Field
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFieldManager;
