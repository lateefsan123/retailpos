import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'
import BranchSelector from '../components/BranchSelector'
import { Supplier, SupplierRequest } from '../types/multitenant'
import { formatCurrency } from '../utils/currency'
import styles from './Suppliers.module.css'

// Vehicle icon colors and types
const VEHICLE_COLORS = [
  '#1a1a1a', // Black
  '#dc2626', // Red
  '#2563eb', // Blue
  '#16a34a', // Green
  '#ca8a04', // Yellow
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#be123c', // Rose
  '#65a30d', // Lime
  '#7c2d12', // Brown
  '#1e40af', // Indigo
]

const VEHICLE_TYPES = ['truck', 'van']

// Function to get a consistent vehicle icon for a supplier
async function uploadSupplierImage(file: File, supplierId: number, businessId: number) {
  console.log("🔄 Starting image upload for supplier:", supplierId)
  console.log("📁 File details:", {
    name: file.name,
    size: file.size,
    type: file.type
  })
  
  if (!businessId) {
    console.error('Cannot upload supplier image without an active business')
    return null
  }

  try {
    // Upload original file directly to Supabase Storage
    const fileName = `supplier-images/${supplierId}.${file.name.split('.').pop()}`
    console.log("📤 Uploading to Supabase Storage:", fileName)
    
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error("❌ Upload failed:", uploadError)
      return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)
    
    console.log("✅ Image uploaded successfully:", publicUrl)
    
    // Update database with public URL
    console.log("💾 Updating database with public URL...")
    const { error: dbError } = await supabase
      .from('suppliers')
      .update({ image_url: publicUrl })
      .eq('supplier_id', supplierId)
      .eq('business_id', businessId)

    if (dbError) {
      console.error("❌ DB update failed:", dbError)
      return null
    } else {
      console.log("✅ Database updated with public URL")
    }

    return publicUrl
  } catch (error) {
    console.error("💥 Unexpected error during upload:", error)
    return null
  }
}

const getSupplierVehicleIcon = (supplierId: number) => {
  const colorIndex = supplierId % VEHICLE_COLORS.length
  const vehicleTypeIndex = Math.floor(supplierId / VEHICLE_COLORS.length) % VEHICLE_TYPES.length
  
  const color = VEHICLE_COLORS[colorIndex]
  const vehicleType = VEHICLE_TYPES[vehicleTypeIndex]
  
  return {
    color,
    vehicleType,
    iconClass: vehicleType === 'truck' ? 'fa-truck' : 'fa-van-shuttle'
  }
}

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
  const [showVisitsModal, setShowVisitsModal] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierVisits, setSupplierVisits] = useState<any[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalVisits, setTotalVisits] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [unpaidVisitsCount, setUnpaidVisitsCount] = useState(0)
  const [supplierUnpaidCounts, setSupplierUnpaidCounts] = useState<{[key: number]: number}>({})

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
      
      // Fetch unpaid counts for all suppliers
      if (data && data.length > 0) {
        await fetchUnpaidCountsForSuppliers(data.map(s => s.supplier_id))
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnpaidCountsForSuppliers = async (supplierIds: number[]) => {
    try {
      const { data, error } = await supabase
        .from('supplier_visits')
        .select('supplier_id')
        .eq('business_id', businessId)
        .eq('paid', false)
        .in('supplier_id', supplierIds)

      if (error) throw error

      // Count unpaid visits per supplier
      const unpaidCounts: {[key: number]: number} = {}
      data?.forEach(visit => {
        unpaidCounts[visit.supplier_id] = (unpaidCounts[visit.supplier_id] || 0) + 1
      })

      setSupplierUnpaidCounts(unpaidCounts)
    } catch (err) {
      console.error('Error fetching unpaid counts:', err)
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

      let savedSupplier

      if (editingSupplier) {
        // Update existing supplier
        const { data, error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('supplier_id', editingSupplier.supplier_id)
          .select()
          .single()

        if (error) throw error
        savedSupplier = data

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
        savedSupplier = data

        setSuppliers(prev => [...prev, data])
      }

      // Upload image if provided
      if (imageFile && savedSupplier) {
        console.log('🔄 Uploading supplier image...')
        const imageUrl = await uploadSupplierImage(imageFile, savedSupplier.supplier_id, businessId)
        if (imageUrl) {
          // Update the supplier in the list with the new image URL
          setSuppliers(prev => 
            prev.map(s => 
              s.supplier_id === savedSupplier.supplier_id 
                ? { ...s, image_url: imageUrl }
                : s
            )
          )
          console.log('✅ Supplier image uploaded successfully')
        } else {
          console.error('❌ Failed to upload supplier image')
        }
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

  const fetchSupplierVisits = async (supplierId: number, page: number = 1) => {
    if (!businessId) return

    try {
      setVisitsLoading(true)
      setError(null)

      const visitsPerPage = 10
      const from = (page - 1) * visitsPerPage
      const to = from + visitsPerPage - 1

      // First, get the total count
      const { count, error: countError } = await supabase
        .from('supplier_visits')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplierId)
        .eq('business_id', businessId)

      if (countError) throw countError

      // Get the count of unpaid visits
      const { count: unpaidCount, error: unpaidCountError } = await supabase
        .from('supplier_visits')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplierId)
        .eq('business_id', businessId)
        .eq('paid', false)

      if (unpaidCountError) throw unpaidCountError

      // Then get the paginated data
      const { data, error } = await supabase
        .from('supplier_visits')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('supplier_id', supplierId)
        .eq('business_id', businessId)
        .order('visit_date', { ascending: false })
        .range(from, to)

      if (error) throw error

      setSupplierVisits(data || [])
      setTotalVisits(count || 0)
      setTotalPages(Math.ceil((count || 0) / visitsPerPage))
      setUnpaidVisitsCount(unpaidCount || 0)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching supplier visits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier visits')
    } finally {
      setVisitsLoading(false)
    }
  }

  const handleSupplierRowClick = async (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowVisitsModal(true)
    setCurrentPage(1)
    setTotalVisits(0)
    setTotalPages(0)
    await fetchSupplierVisits(supplier.supplier_id, 1)
  }

  const handlePageChange = async (page: number) => {
    if (selectedSupplier) {
      await fetchSupplierVisits(selectedSupplier.supplier_id, page)
    }
  }

  const toggleVisitPaidStatus = async (visitId: number, currentPaidStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('supplier_visits')
        .update({ paid: !currentPaidStatus })
        .eq('visit_id', visitId)

      if (error) throw error

      // Update the local state
      setSupplierVisits(prev => 
        prev.map(visit => 
          visit.visit_id === visitId 
            ? { ...visit, paid: !currentPaidStatus }
            : visit
        )
      )

      // Update unpaid count
      setUnpaidVisitsCount(prev => 
        currentPaidStatus ? prev + 1 : prev - 1
      )

      // Update supplier unpaid counts if we have a selected supplier
      if (selectedSupplier) {
        setSupplierUnpaidCounts(prev => ({
          ...prev,
          [selectedSupplier.supplier_id]: (prev[selectedSupplier.supplier_id] || 0) + (currentPaidStatus ? 1 : -1)
        }))
      }
    } catch (err) {
      console.error('Error updating visit paid status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update payment status')
    }
  }

  const handlePayAllVisits = async () => {
    if (!selectedSupplier || unpaidVisitsCount === 0) return

    try {
      // Update all unpaid visits for this supplier to paid
      const { error } = await supabase
        .from('supplier_visits')
        .update({ paid: true })
        .eq('supplier_id', selectedSupplier.supplier_id)
        .eq('business_id', businessId)
        .eq('paid', false)

      if (error) throw error

      // Update local state - mark all unpaid visits as paid
      setSupplierVisits(prev => 
        prev.map(visit => ({ ...visit, paid: true }))
      )

      // Reset unpaid count to 0
      setUnpaidVisitsCount(0)

      // Update supplier unpaid counts
      if (selectedSupplier) {
        setSupplierUnpaidCounts(prev => ({
          ...prev,
          [selectedSupplier.supplier_id]: 0
        }))
      }

    } catch (err) {
      console.error('Error paying all visits:', err)
      setError(err instanceof Error ? err.message : 'Failed to pay all visits')
    }
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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading suppliers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.suppliersContainer}>
      <div className={styles.suppliersContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.headerTitle}>
              <i className={`fa-solid fa-truck ${styles.headerTitleIcon}`}></i>
              Suppliers
            </h1>
            <p className={styles.headerSubtitle}>
              Manage your supplier relationships and contact information
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <BranchSelector />
            {canManageSuppliers && (
              <button
                onClick={() => {
                  resetForm()
                  setEditingSupplier(null)
                  setShowAddModal(true)
                }}
                className={styles.addButton}
              >
                <i className={`fa-solid fa-plus ${styles.addButtonIcon}`}></i>
                Add Supplier
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersContainer}>
          <div className={styles.filtersContent}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <label className={styles.inactiveToggle}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive suppliers
            </label>
          </div>
          
          {/* Vehicle Legend */}
          <div className={styles.vehicleLegend}>
            <div className={styles.legendTitle}>
              Vehicle Types:
            </div>
            <div className={styles.legendContent}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendIcon} ${styles.legendIconTruck}`}>
                  <i className="fa-solid fa-truck"></i>
                </div>
                <span className={styles.legendLabel}>Truck</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendIcon} ${styles.legendIconVan}`}>
                  <i className="fa-solid fa-van-shuttle"></i>
                </div>
                <span className={styles.legendLabel}>Van</span>
              </div>
              <div className={styles.legendNote}>
                Each supplier gets a unique colored vehicle icon
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <i className={`fa-solid fa-exclamation-triangle ${styles.errorIcon}`}></i>
            {error}
          </div>
        )}

        {/* Suppliers List */}
        <div className={styles.suppliersList}>
          {loading ? (
            <div className={styles.listLoading}>
              <div className={styles.listSpinner}></div>
              Loading suppliers...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className={styles.emptyState}>
              <i className={`fa-solid fa-truck ${styles.emptyIcon}`}></i>
              <h3 className={styles.emptyTitle}>
                No suppliers found
              </h3>
              <p className={styles.emptyText}>
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first supplier to get started'}
              </p>
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table className={styles.suppliersTable}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.tableHeaderCell}>
                      Supplier
                    </th>
                    <th className={styles.tableHeaderCell}>
                      Contact
                    </th>
                    <th className={styles.tableHeaderCell}>
                      Contact Info
                    </th>
                    <th className={styles.tableHeaderCell}>
                      Status
                    </th>
                    <th className={styles.tableHeaderCell}>
                      Created
                    </th>
                    {canManageSuppliers && (
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.supplier_id}
                      className={styles.tableRow}
                      onClick={() => handleSupplierRowClick(supplier)}
                    >
                      <td className={styles.tableCell}>
                        <div className={styles.supplierInfo}>
                          {/* Supplier Image or Vehicle Icon */}
                          <div 
                            className={styles.supplierImage}
                            style={{ borderColor: getSupplierVehicleIcon(supplier.supplier_id).color }}
                          >
                            {supplier.image_url ? (
                              <img 
                                src={supplier.image_url} 
                                alt={supplier.name}
                                onError={(e) => {
                                  // Fallback to vehicle icon if image fails to load
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<i class="fa-solid ${getSupplierVehicleIcon(supplier.supplier_id).iconClass}" style="color: ${getSupplierVehicleIcon(supplier.supplier_id).color}; font-size: 18px;"></i>`
                                  }
                                }}
                              />
                            ) : (
                              <i 
                                className={`fa-solid ${getSupplierVehicleIcon(supplier.supplier_id).iconClass}`}
                                style={{ 
                                  color: getSupplierVehicleIcon(supplier.supplier_id).color,
                                  fontSize: '18px'
                                }}
                              ></i>
                            )}
                          </div>
                          
                          {/* Supplier Info */}
                          <div className={styles.supplierDetails}>
                            <div className={styles.supplierName}>
                              {supplier.name}
                              {supplierUnpaidCounts[supplier.supplier_id] > 0 && (
                                <div 
                                  className={styles.unpaidBadge}
                                  title={`${supplierUnpaidCounts[supplier.supplier_id]} unpaid visit${supplierUnpaidCounts[supplier.supplier_id] !== 1 ? 's' : ''}`}
                                >
                                  {supplierUnpaidCounts[supplier.supplier_id]}
                                </div>
                              )}
                            </div>
                            {supplier.address && (
                              <div className={styles.supplierAddress}>
                                {supplier.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div>
                          {supplier.contact_name && (
                            <div className={styles.contactName}>
                              {supplier.contact_name}
                            </div>
                          )}
                          {supplier.notes && (
                            <div className={styles.contactNotes}>
                              {supplier.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div>
                          {supplier.email && (
                            <div className={styles.contactDetail}>
                              <i className={`fa-solid fa-envelope ${styles.contactIcon}`}></i>
                              <a 
                                href={`mailto:${supplier.email}`}
                                className={styles.contactLink}
                              >
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className={styles.contactDetail}>
                              <i className={`fa-solid fa-phone ${styles.contactIcon}`}></i>
                              <a 
                                href={`tel:${supplier.phone}`}
                                className={styles.contactLink}
                              >
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusBadge} ${supplier.active ? styles.statusActive : styles.statusInactive}`}>
                          {supplier.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.createdDate}`}>
                        {new Date(supplier.created_at).toLocaleDateString()}
                      </td>
                      {canManageSuppliers && (
                        <td className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(supplier)
                              }}
                              className={`${styles.actionButton} ${styles.actionButtonEdit}`}
                            >
                              <i className="fa-solid fa-edit"></i>
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(supplier)
                              }}
                              className={`${styles.actionButton} ${styles.actionButtonDelete}`}
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
                      placeholder="Enter company name"
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
                      placeholder="Enter contact person name"
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
                      placeholder="supplier@example.com"
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
                      placeholder="+1 (555) 123-4567"
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
                    placeholder="123 Main Street, City, State 12345"
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
                      color: '#1f2937',
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

        {/* Supplier Visits Modal */}
        {showVisitsModal && selectedSupplier && (
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
              maxWidth: '800px',
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
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700',
                    color: '#000000'
                  }}>
                    <i className="fa-solid fa-calendar-check" style={{ marginRight: '12px', color: '#000000' }}></i>
                    {selectedSupplier.name} - Visit History
                  </h2>
                  <p style={{ 
                    margin: '0', 
                    color: '#374151', 
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    All visits and deliveries from this supplier
                  </p>
                </div>
                
                {/* Pay All Button */}
                {unpaidVisitsCount > 0 && (
                  <button
                    onClick={handlePayAllVisits}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#059669'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#10b981'
                    }}
                  >
                    <i className="fa-solid fa-credit-card" style={{ fontSize: '12px' }}></i>
                    Pay All ({unpaidVisitsCount})
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowVisitsModal(false)
                    setSelectedSupplier(null)
                    setSupplierVisits([])
                    setCurrentPage(1)
                    setTotalVisits(0)
                    setTotalPages(0)
                    setUnpaidVisitsCount(0)
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

              {visitsLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: '40px',
                  color: '#374151'
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '12px' }}></i>
                  Loading visits...
                </div>
              ) : supplierVisits.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '40px',
                    color: '#374151'
                  }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ 
                    fontSize: '48px', 
                    marginBottom: '16px',
                    color: '#9ca3af'
                  }}></i>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>
                    No visits recorded for this supplier yet.
                  </p>
                </div>
              ) : (
                <div style={{ 
                  background: '#f9fafb',
                  borderRadius: '12px',
                  padding: '20px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {supplierVisits.map((visit) => (
                      <div key={visit.visit_id} style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              background: 
                                visit.visit_type === 'delivery' ? '#dcfce7' :
                                visit.visit_type === 'meeting' ? '#dbeafe' :
                                visit.visit_type === 'inspection' ? '#fef3c7' :
                                '#f3f4f6',
                              color: 
                                visit.visit_type === 'delivery' ? '#166534' :
                                visit.visit_type === 'meeting' ? '#1e40af' :
                                visit.visit_type === 'inspection' ? '#92400e' :
                                '#374151'
                            }}>
                              {visit.visit_type}
                            </div>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: '700',
                              color: '#000000'
                            }}>
                              {new Date(visit.visit_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          {visit.start_time && visit.end_time && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#374151',
                              marginBottom: '8px',
                              fontWeight: '500'
                            }}>
                              <i className="fa-solid fa-clock" style={{ marginRight: '6px' }}></i>
                              {visit.start_time} - {visit.end_time}
                            </div>
                          )}
                          {visit.amount && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#059669',
                              fontWeight: '600',
                              marginBottom: '8px'
                            }}>
                              <i className="fa-solid fa-dollar-sign" style={{ marginRight: '6px' }}></i>
                              ${visit.amount.toFixed(2)}
                            </div>
                          )}
                          {visit.notes && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#1f2937',
                              fontStyle: 'italic',
                              fontWeight: '500'
                            }}>
                              "{visit.notes}"
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          {/* Paid Status Toggle */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: visit.paid ? '#10b981' : '#6b7280',
                              textTransform: 'uppercase'
                            }}>
                              {visit.paid ? 'Paid' : 'Unpaid'}
                            </span>
                            <button
                              onClick={() => toggleVisitPaidStatus(visit.visit_id, visit.paid || false)}
                              style={{
                                background: visit.paid ? '#10b981' : '#f3f4f6',
                                border: visit.paid ? '2px solid #10b981' : '2px solid #d1d5db',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '12px',
                                color: visit.paid ? '#ffffff' : '#6b7280'
                              }}
                              onMouseOver={(e) => {
                                if (!visit.paid) {
                                  e.currentTarget.style.background = '#e5e7eb'
                                  e.currentTarget.style.borderColor = '#9ca3af'
                                }
                              }}
                              onMouseOut={(e) => {
                                if (!visit.paid) {
                                  e.currentTarget.style.background = '#f3f4f6'
                                  e.currentTarget.style.borderColor = '#d1d5db'
                                }
                              }}
                            >
                              {visit.paid && <i className="fa-solid fa-check"></i>}
                            </button>
                          </div>
                          
                          {/* Created Date */}
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            {new Date(visit.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #9ca3af',
                      borderRadius: '6px',
                      background: currentPage === 1 ? '#f9fafb' : '#ffffff',
                      color: currentPage === 1 ? '#6b7280' : '#1f2937',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                    Previous
                  </button>

                  <div style={{ 
                    display: 'flex', 
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            style={{
                              padding: '8px 12px',
                              border: '2px solid #9ca3af',
                              borderRadius: '6px',
                              background: page === currentPage ? '#1a1a1a' : '#ffffff',
                              color: page === currentPage ? '#ffffff' : '#1f2937',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              minWidth: '40px'
                            }}
                          >
                            {page}
                          </button>
                        )
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} style={{ 
                            color: '#9ca3af',
                            fontSize: '14px',
                            padding: '0 4px'
                          }}>
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #9ca3af',
                      borderRadius: '6px',
                      background: currentPage === totalPages ? '#f9fafb' : '#ffffff',
                      color: currentPage === totalPages ? '#6b7280' : '#1f2937',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Next
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              )}

              {/* Visit Count Info */}
              {totalVisits > 0 && (
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '12px',
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  Showing {((currentPage - 1) * 10) + 1}-{Math.min(currentPage * 10, totalVisits)} of {totalVisits} visits
                </div>
              )}
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
