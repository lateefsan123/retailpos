import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { Reminder, NewTask } from '../types/multitenant';
import { TASK_ICONS } from '../utils/taskIcons';
import { useProductsData } from '../hooks/data/useProductsData';
import styles from './modals/AddProductModal.module.css';

interface TaskAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: NewTask) => Promise<void>;
  editingTask?: Reminder | null;
  availableUsers: User[];
}

interface User {
  user_id: number;
  username: string;
  role: string;
  icon?: string;
  full_name?: string;
}

const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  open,
  onClose,
  onSave,
  editingTask,
  availableUsers
}) => {
  const { user } = useAuth();
  const { canAssignToUser } = useRole();
  const { data: productsData } = useProductsData();
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    remind_date: new Date().toISOString().split('T')[0],
    assigned_to: 0,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    notes: '',
    task_icon: '',
    product_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filter users based on role hierarchy
  const filteredUsers = availableUsers.filter(targetUser => 
    canAssignToUser(targetUser.role)
  );

  // Filter products based on search
  const filteredProducts = productsData?.products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearch.toLowerCase())
  ) || [];

  // Get selected product for display
  const selectedProduct = productsData?.products.find(p => p.product_id === formData.product_id);

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        body: editingTask.body,
        remind_date: editingTask.remind_date,
        assigned_to: editingTask.assigned_to || 0,
        priority: editingTask.priority || 'Medium',
        notes: editingTask.notes || '',
        task_icon: editingTask.task_icon || '',
        product_id: editingTask.product_id || ''
      });
      // Set product search to selected product name
      if (editingTask.product_id) {
        const product = productsData?.products.find(p => p.product_id === editingTask.product_id);
        setProductSearch(product?.name || '');
      }
    } else {
      setFormData({
        title: '',
        body: '',
        remind_date: new Date().toISOString().split('T')[0],
        assigned_to: 0,
        priority: 'Medium',
        notes: '',
        task_icon: '',
        product_id: ''
      });
      setProductSearch('');
    }
    setError(null);
    setShowProductDropdown(false);
  }, [editingTask, open, productsData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductSelect = (product: any) => {
    setFormData(prev => ({ ...prev, product_id: product.product_id }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearch(e.target.value);
    setShowProductDropdown(true);
    if (!e.target.value) {
      setFormData(prev => ({ ...prev, product_id: '' }));
    }
  };

  const clearProductSelection = () => {
    setFormData(prev => ({ ...prev, product_id: '' }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Validate task_icon value
      const validTaskIcons = TASK_ICONS.map(icon => icon.id);
      const taskIcon = formData.task_icon && validTaskIcons.includes(formData.task_icon) 
        ? formData.task_icon 
        : undefined;

      await onSave({
        title: formData.title,
        body: formData.body,
        remind_date: formData.remind_date,
        assigned_to: formData.assigned_to,
        priority: formData.priority,
        notes: formData.notes,
        task_icon: taskIcon, // Only send valid task_icon values
        product_id: formData.product_id || undefined
      });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {editingTask ? 'Edit Task' : 'Assign New Task'}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formContent}>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter task title..."
                    maxLength={100}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="remind_date"
                    value={formData.remind_date}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Assign To *
                  </label>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    required
                  >
                    <option value={0}>Select a user...</option>
                    {filteredUsers.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name || user.username} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Related Product (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={handleProductSearchChange}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      className={styles.formInput}
                      placeholder="Search for a product..."
                    />
                    {formData.product_id && (
                      <button
                        type="button"
                        onClick={clearProductSelection}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    )}
                    
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'rgba(26, 26, 26, 0.95)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflow: 'auto',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {filteredProducts.slice(0, 10).map((product) => (
                          <div
                            key={product.product_id}
                            onClick={() => handleProductSelect(product)}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: '#1a1a1a',
                              border: '1px solid #3a3a3a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <i className="fa-solid fa-box" style={{ color: '#7d8d86', fontSize: '16px' }}></i>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                color: '#ffffff', 
                                fontSize: '14px', 
                                fontWeight: '600',
                                marginBottom: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {product.name}
                              </div>
                              <div style={{ 
                                color: 'rgba(255, 255, 255, 0.7)', 
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {product.category} • Stock: {product.stock_quantity} • €{product.price}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>
                    Description *
                  </label>
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Describe what needs to be done..."
                    rows={4}
                    maxLength={500}
                    required
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>
                    Task Icon (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        border: '1px solid #3a3a3a',
                        borderRadius: '0.5rem',
                        background: !formData.task_icon ? 'rgba(99, 102, 241, 0.15)' : '#1a1a1a',
                        borderColor: !formData.task_icon ? 'rgba(99, 102, 241, 0.5)' : '#3a3a3a',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, task_icon: '' }))}
                    >
                      <i className="fa-solid fa-circle" style={{ color: '#6b7280' }}></i>
                      <span style={{ fontSize: '0.75rem', color: '#ffffff' }}>None</span>
                    </div>
                    {TASK_ICONS.map(icon => (
                      <div 
                        key={icon.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          border: '1px solid #3a3a3a',
                          borderRadius: '0.5rem',
                          background: formData.task_icon === icon.id ? 'rgba(99, 102, 241, 0.15)' : '#1a1a1a',
                          borderColor: formData.task_icon === icon.id ? 'rgba(99, 102, 241, 0.5)' : '#3a3a3a',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setFormData(prev => ({ ...prev, task_icon: icon.id }))}
                      >
                        <i className={icon.icon} style={{ color: icon.color }}></i>
                        <span style={{ fontSize: '0.75rem', color: '#ffffff' }}>{icon.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.formLabel}>
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Add any additional notes or context..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : (editingTask ? 'Update Task' : 'Assign Task')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentModal;