import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'
import BranchSelector from '../components/BranchSelector'
import { Supplier, SupplierRequest } from '../types/multitenant'
import { formatCurrency } from '../utils/currency'

const Suppliers = () => {
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { user } = useAuth()
  const { hasPermission } = useRole()
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Form state
  const [formData, setFormData] = useState<SupplierRequest>({
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    image_url: '',
    active: true
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Check permissions
  const canManageSuppliers = hasPermission('canManageProducts')

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchSuppliers()
    }
  }, [businessId, businessLoading, selectedBranchId])

  const fetchSuppliers = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true })

      // Filter by branch if selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      // Filter by active status
      if (!showInactive) {
        query = query.eq('active', true)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setSuppliers(data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !canManageSuppliers) return

    try {
      setError(null)

      const supplierData: SupplierRequest = {
        ...formData,
        business_id: businessId,
        branch_id: selectedBranchId || undefined
      }

      if (editingSupplier) {
        // Update existing supplier
        const { data, error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('supplier_id', editingSupplier.supplier_id)
          .select()
          .single()

        if (error) throw error

        setSuppliers(prev => 
          prev.map(s => s.supplier_id === editingSupplier.supplier_id ? data : s)
        )
      } else {
        // Create new supplier
        const { data, error } = await supabase
          .from('suppliers')
          .insert([supplierData])
          .select()
          .single()

        if (error) throw error

        setSuppliers(prev => [...prev, data])
      }

      // Reset form and close modal
      resetForm()
      setShowAddModal(false)
      setEditingSupplier(null)
    } catch (err) {
      console.error('Error saving supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to save supplier')
    }
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!canManageSuppliers || !confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      return
    }

    try {
      setError(null)

      // Soft delete by setting active to false
      const { error } = await supabase
        .from('suppliers')
        .update({ active: false })
        .eq('supplier_id', supplier.supplier_id)

      if (error) throw error

      setSuppliers(prev => 
        prev.map(s => 
          s.supplier_id === supplier.supplier_id 
            ? { ...s, active: false }
            : s
        )
      )
    } catch (err) {
      console.error('Error deleting supplier:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete supplier')
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      business_id: supplier.business_id,
      branch_id: supplier.branch_id,
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
      image_url: supplier.image_url || '',
      active: supplier.active
    })
    setImagePreview(supplier.image_url || null)
    setImageFile(null)
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      image_url: '',
      active: true
    })
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: '' }))
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (businessLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #1a1a1a', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading suppliers...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f9fafb',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '28px', 
              fontWeight: '700',
              color: '#1a1a1a'
            }}>
              <i className="fa-solid fa-truck" style={{ marginRight: '12px', color: '#1a1a1a' }}></i>
              Suppliers
            </h1>
            <p style={{ 
              margin: '0', 
              color: '#6b7280', 
              fontSize: '16px' 
            }}>
              Manage your supplier relationships and contact information
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <BranchSelector />
            {canManageSuppliers && (
              <button
                onClick={() => {
                  resetForm()
                  setEditingSupplier(null)
                  setShowAddModal(true)
                }}
                style={{
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#374151'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#1a1a1a'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                Add Supplier
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ 
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: '#ffffff'
                }}
              />
            </div>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#1a1a1a'
                }}
              />
              Show inactive suppliers
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <i className="fa-solid fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {/* Suppliers List */}
        <div style={{ 
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #e5e7eb', 
                borderTop: '4px solid #1a1a1a', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              Loading suppliers...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <i className="fa-solid fa-truck" style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                color: '#d1d5db'
              }}></i>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                No suppliers found
              </h3>
              <p style={{ margin: '0' }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first supplier to get started'}
              </p>
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ 
                    background: '#f9fafb',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Supplier
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Contact
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Contact Info
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Created
                    </th>
                    {canManageSuppliers && (
                      <th style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.supplier_id}
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#f9fafb'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#1a1a1a',
                            marginBottom: '4px'
                          }}>
                            {supplier.name}
                          </div>
                          {supplier.address && (
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280',
                              lineHeight: '1.4'
                            }}>
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div>
                          {supplier.contact_name && (
                            <div style={{ 
                              fontWeight: '500', 
                              color: '#374151',
                              marginBottom: '4px'
                            }}>
                              {supplier.contact_name}
                            </div>
                          )}
                          {supplier.notes && (
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280',
                              fontStyle: 'italic',
                              lineHeight: '1.4'
                            }}>
                              {supplier.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div>
                          {supplier.email && (
                            <div style={{ 
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="fa-solid fa-envelope" style={{ 
                                color: '#6b7280', 
                                fontSize: '12px',
                                width: '12px'
                              }}></i>
                              <a 
                                href={`mailto:${supplier.email}`}
                                style={{ 
                                  color: '#1a1a1a',
                                  textDecoration: 'none',
                                  fontSize: '13px'
                                }}
                              >
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="fa-solid fa-phone" style={{ 
                                color: '#6b7280', 
                                fontSize: '12px',
                                width: '12px'
                              }}></i>
                              <a 
                                href={`tel:${supplier.phone}`}
                                style={{ 
                                  color: '#1a1a1a',
                                  textDecoration: 'none',
                                  fontSize: '13px'
                                }}
                              >
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: supplier.active ? '#dcfce7' : '#fee2e2',
                          color: supplier.active ? '#166534' : '#dc2626'
                        }}>
                          {supplier.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                        {new Date(supplier.created_at).toLocaleDateString()}
                      </td>
                      {canManageSuppliers && (
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEdit(supplier)}
                              style={{
                                background: 'none',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                color: '#374151',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#f3f4f6'
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'none'
                              }}
                            >
                              <i className="fa-solid fa-edit"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(supplier)}
                              style={{
                                background: 'none',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                color: '#dc2626',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#fef2f2'
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'none'
                              }}
                            >
                              <i className="fa-solid fa-trash"></i>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{ 
                  margin: '0', 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  <i className="fa-solid fa-truck" style={{ marginRight: '12px', color: '#1a1a1a' }}></i>
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingSupplier(null)
                    resetForm()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #1a1a1a',
                        borderRadius: '8px',
                        fontSize: '15px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #1a1a1a',
                        borderRadius: '8px',
                        fontSize: '15px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #1a1a1a',
                        borderRadius: '8px',
                        fontSize: '15px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #1a1a1a',
                        borderRadius: '8px',
                        fontSize: '15px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      fontSize: '15px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes about this supplier..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      fontSize: '15px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    Supplier Image (Optional)
                  </label>
                  
                  {imagePreview ? (
                    <div style={{ 
                      position: 'relative',
                      width: '150px',
                      height: '150px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}>
                      <img 
                        src={imagePreview} 
                        alt="Supplier preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '150px',
                      border: '2px dashed #1a1a1a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f9fafb',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#374151'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#f9fafb'
                      e.currentTarget.style.borderColor = '#1a1a1a'
                    }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                      <i className="fa-solid fa-cloud-upload" style={{ 
                        fontSize: '32px', 
                        color: '#6b7280',
                        marginBottom: '8px'
                      }}></i>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        Click to upload image
                      </span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#9ca3af',
                        marginTop: '4px'
                      }}>
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </label>
                  )}
                </div>

                {editingSupplier && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: '#1a1a1a'
                        }}
                      />
                      Active supplier
                    </label>
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end' 
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingSupplier(null)
                      resetForm()
                    }}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#1a1a1a',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      background: '#1a1a1a',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fa-solid fa-save"></i>
                    {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Suppliers
