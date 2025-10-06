import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hashPassword } from '../utils/auth'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import VaultModal from '../components/VaultModal'
import BranchSelector from '../components/BranchSelector'
import PendingRegistrations from '../components/PendingRegistrations'

interface User {
  user_id: number
  username: string
  password_hash: string
  role: string
  active: boolean
  icon?: string
  business_id: number
  branch_id?: number
  branch_name?: string
}

interface NewUser {
  username: string
  password: string
  role: string
  icon: string
  branch_id?: number
}

interface Branch {
  branch_id: number
  branch_name: string
  address: string
  phone: string
  manager_id?: number
  shop_image: string
  business_id: number
  active: boolean
  created_at: string
}

interface NewBranch {
  branch_name: string
  address: string
  phone: string
  manager_id?: number
  shop_image: string
}

const Admin = () => {
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [showEditBranchModal, setShowEditBranchModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    password: '',
    role: 'Cashier',
    icon: 'ryu',
    branch_id: selectedBranchId || undefined
  })
  const [newBranch, setNewBranch] = useState<NewBranch>({
    branch_name: '',
    address: '',
    phone: '',
    manager_id: undefined,
    shop_image: 'shop1'
  })

  // Icon packs
  const iconPacks = {
    'default': {
      name: 'Default Pack',
      icons: [
        { name: 'lily', label: 'Lily' },
        { name: 'chunli', label: 'Chun-Li' },
        { name: 'ken', label: 'Ken' },
        { name: 'kimberly', label: 'Kimberly' },
        { name: 'mai', label: 'Mai' },
        { name: 'manon', label: 'Manon' },
        { name: 'rashid', label: 'Rashid' },
        { name: 'ryu', label: 'Ryu' },
        { name: 'zangief', label: 'Zangief' }
      ]
    },
    'modern': {
      name: 'Modern Pack',
      icons: [
        { name: 'icon10', label: 'Icon 10' },
        { name: 'icon11', label: 'Icon 11' },
        { name: 'icon12', label: 'Icon 12' },
        { name: 'icon13', label: 'Icon 13' },
        { name: 'icon14', label: 'Icon 14' },
        { name: 'icon15', label: 'Icon 15' }
      ]
    }
  }

  const [selectedIconPack, setSelectedIconPack] = useState('default')
  const availableIcons = iconPacks[selectedIconPack as keyof typeof iconPacks].icons

  // Available shop images
  const availableShopImages = [
    { name: 'shop1', label: 'Shop 1' },
    { name: 'shop2', label: 'Shop 2' },
    { name: 'shop3', label: 'Shop 3' },
    { name: 'shop4', label: 'Shop 4' }
  ]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showVaultModal, setShowVaultModal] = useState(false)
  const [showPendingRegistrations, setShowPendingRegistrations] = useState(false)

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchUsers()
      fetchBranches()
    }
  }, [businessId, businessLoading, selectedBranchId])

  // Update newUser branch_id when selectedBranchId changes
  useEffect(() => {
    setNewUser(prev => ({
      ...prev,
      branch_id: selectedBranchId || undefined
    }))
  }, [selectedBranchId])

  const fetchUsers = async () => {
    if (!businessId) {
      setUsers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('*')
        .eq('business_id', businessId)
        .order('user_id', { ascending: false })

      // Add branch filtering if branch is selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: users, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
        setError('Failed to fetch users')
        return
      }

      // Get branch information for users
      const usersWithBranches = await Promise.all((users || []).map(async (user) => {
        if (user.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('branch_name')
            .eq('branch_id', user.branch_id)
            .single();
          
          return {
            ...user,
            branch_name: branchData?.branch_name || 'Branch Not Found'
          };
        }
        
        return {
          ...user,
          branch_name: 'No Branch Assigned'
        };
      }));

      setUsers(usersWithBranches)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    if (!businessId) {
      setBranches([])
      return
    }

    try {
      const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .order('branch_id', { ascending: false })

      if (error) {
        console.error('Error fetching branches:', error)
        setError('Failed to fetch branches')
        return
      }

      setBranches(branches || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      setError('Failed to fetch branches')
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validate required fields
    if (!newUser.username.trim()) {
      setError('Username is required')
      setIsSubmitting(false)
      return
    }

    if (!newUser.password.trim()) {
      setError('Password is required')
      setIsSubmitting(false)
      return
    }

    if (!businessId) {
      setError('Business ID is not available. Please refresh the page and try again.')
      setIsSubmitting(false)
      return
    }

    try {
      console.log('Adding user with data:', {
        username: newUser.username,
        role: newUser.role,
        icon: newUser.icon,
        business_id: businessId
      })

      // Check if username already exists within this business
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', newUser.username.trim())
        .eq('business_id', businessId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is expected if username doesn't exist
        console.error('Error checking username:', checkError)
        throw new Error('Failed to check if username exists')
      }

      if (existingUser) {
        throw new Error('Username already exists. Please choose a different username.')
      }

      const passwordHash = hashPassword(newUser.password)
      console.log('Creating user with password:', newUser.password)
      console.log('Generated hash:', passwordHash)
      console.log('Hash type:', typeof passwordHash)

      // Prepare user data - only include icon if column exists
      const userData: any = {
        username: newUser.username.trim(),
        password_hash: passwordHash,
        role: newUser.role,
        active: true,
        business_id: businessId,
        branch_id: newUser.branch_id
      }

      // Only add icon if the column exists (will be handled by database migration)
      // For now, we'll try to include it and let the database handle it
      userData.icon = newUser.icon

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()

      if (error) {
        console.error('Supabase error adding user:', error)
        
        // Handle specific error cases
        if (error.code === '23505') {
          throw new Error('Username already exists. Please choose a different username.')
        } else if (error.code === '23503') {
          throw new Error('Invalid business ID. Please refresh the page and try again.')
        } else if (error.code === '23502') {
          throw new Error('Required field is missing. Please fill in all required fields.')
        } else if (error.message.includes('duplicate key value violates unique constraint')) {
          throw new Error('Username already exists. Please choose a different username.')
        } else if (error.message.includes('violates foreign key constraint')) {
          throw new Error('Invalid business ID. Please refresh the page and try again.')
        } else if (error.message.includes("Could not find the 'icon' column")) {
          throw new Error('Database schema is outdated. Please run the database migration to add the icon column.')
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation')
      }

      console.log('User added successfully:', data[0])

      // Reset form and close modal
      setNewUser({
        username: '',
        password: '',
        role: 'Cashier',
        icon: 'ryu'
      })
      setShowAddModal(false)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error adding user:', error)
      if (error instanceof Error) {
        setError(`Failed to add user: ${error.message}`)
      } else {
        setError('Failed to add user: Unknown error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting user:', error)
        throw error
      }

      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error)
      setError(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: !currentStatus })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating user status:', error)
        throw error
      }

      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditUser = (user: User) => {
    setEditingUser(user)
    setNewUser({
      username: user.username,
      password: '', // Don't pre-fill password
      role: user.role,
      icon: user.icon || 'ryu',
      branch_id: user.branch_id
    })
    setShowEditModal(true)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSubmitting(true)
    setError('')

    try {
      const updateData: any = {
        username: newUser.username,
        role: newUser.role,
        icon: newUser.icon,
        branch_id: newUser.branch_id
      }

      // Only update password if provided
      if (newUser.password.trim()) {
        const newPasswordHash = hashPassword(newUser.password)
        console.log('Updating user password:', newUser.password)
        console.log('Generated hash:', newPasswordHash)
        console.log('Hash type:', typeof newPasswordHash)
        updateData.password_hash = newPasswordHash
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', editingUser.user_id)

      if (error) {
        console.error('Error updating user:', error)
        throw error
      }

      // Reset form and close modal
      setNewUser({
        username: '',
        password: '',
        role: 'Cashier',
        icon: 'ryu'
      })
      setEditingUser(null)
      setShowEditModal(false)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error updating user:', error)
      setError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validate required fields
    if (!newBranch.branch_name.trim()) {
      setError('Branch name is required')
      setIsSubmitting(false)
      return
    }

    if (!newBranch.address.trim()) {
      setError('Address is required')
      setIsSubmitting(false)
      return
    }

    if (!businessId) {
      setError('Business ID is not available. Please refresh the page and try again.')
      setIsSubmitting(false)
      return
    }

    try {
      const branchData = {
        branch_name: newBranch.branch_name.trim(),
        address: newBranch.address.trim(),
        phone: newBranch.phone.trim() || null,
        manager_id: newBranch.manager_id || null,
        shop_image: newBranch.shop_image,
        business_id: businessId,
        active: true,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('branches')
        .insert([branchData])
        .select()

      if (error) {
        console.error('Supabase error adding branch:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation')
      }

      console.log('Branch added successfully:', data[0])

      // Reset form and close modal
      setNewBranch({
        branch_name: '',
        address: '',
        phone: '',
        manager_id: undefined,
        shop_image: 'shop1'
      })
      setShowAddBranchModal(false)
      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error adding branch:', error)
      if (error instanceof Error) {
        setError(`Failed to add branch: ${error.message}`)
      } else {
        setError('Failed to add branch: Unknown error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBranch = async (branchId: number) => {
    if (!confirm('Are you sure you want to delete this branch?')) return

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('branch_id', branchId)

      if (error) {
        console.error('Error deleting branch:', error)
        throw error
      }

      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error deleting branch:', error)
      setError(`Failed to delete branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setNewBranch({
      branch_name: branch.branch_name,
      address: branch.address,
      phone: branch.phone,
      manager_id: branch.manager_id,
      shop_image: branch.shop_image
    })
    setShowEditBranchModal(true)
  }

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch) return

    setIsSubmitting(true)
    setError('')

    try {
      const updateData = {
        branch_name: newBranch.branch_name.trim(),
        address: newBranch.address.trim(),
        phone: newBranch.phone.trim() || null,
        manager_id: newBranch.manager_id || null,
        shop_image: newBranch.shop_image
      }

      const { error } = await supabase
        .from('branches')
        .update(updateData)
        .eq('branch_id', editingBranch.branch_id)

      if (error) {
        console.error('Error updating branch:', error)
        throw error
      }

      // Reset form and close modal
      setNewBranch({
        branch_name: '',
        address: '',
        phone: '',
        manager_id: undefined,
        shop_image: 'shop1'
      })
      setEditingBranch(null)
      setShowEditBranchModal(false)
      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error updating branch:', error)
      setError(`Failed to update branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }


  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#ef4444' // Red
      case 'Owner': return '#8b5cf6' // Purple
      case 'Manager': return '#f59e0b' // Orange
      case 'Cashier': return '#3b82f6' // Blue
      default: return '#1a1a1a' // Gray
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#000000'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '12px' }}></i>
        Loading users...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            color: '#000000',
            margin: '0 0 8px 0'
          }}>
            <i className="fa-solid fa-users-cog" style={{ marginRight: '12px', color: '#000000' }}></i>
            User Management
          </h1>
          <p style={{ 
            color: '#000000', 
            margin: '0',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            Manage system users and their permissions
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
          {/* Branch Selector */}
          <BranchSelector size="sm" />
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowPendingRegistrations(!showPendingRegistrations)}
            style={{
              background: showPendingRegistrations ? '#7d8d86' : '#e5e7eb',
              color: showPendingRegistrations ? 'white' : '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-user-plus"></i>
            Pending Registrations
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#7d8d86',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-plus"></i>
            Add User
          </button>
          
          <button
            onClick={() => setShowAddBranchModal(true)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-building"></i>
            Add Branch
          </button>
          
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
        </div>
      )}

      {/* Pending Registrations */}
      {showPendingRegistrations && (
        <div style={{ marginBottom: '32px' }}>
          <PendingRegistrations />
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid #d1d5db',
          background: '#f9fafb'
        }}>
          <h3 style={{ 
            margin: '0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#000000'
          }}>
            <i className="fa-solid fa-list" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
            All Users ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#000000'
          }}>
            <i className="fa-solid fa-users" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p style={{ fontSize: '20px', margin: '0 0 8px 0' }}>No users found</p>
            <p style={{ fontSize: '16px', margin: '0' }}>Add your first user to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Icon
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Role
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Status
                  </th>
                   <th style={{ 
                     padding: '16px 24px', 
                     textAlign: 'left', 
                     fontWeight: '600',
                     color: '#000000',
                     borderBottom: '2px solid #d1d5db',
                     fontSize: '16px'
                   }}>
                     User ID
                   </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                 {users.map((user, index) => (
                   <tr key={user.user_id} style={{ 
                     borderBottom: index < users.length - 1 ? '1px solid #f3f4f6' : 'none'
                   }}>
                     <td style={{ padding: '16px 24px' }}>
                       <div>
                         <div style={{ 
                           fontWeight: '700', 
                           color: '#000000',
                           marginBottom: '4px',
                           fontSize: '16px'
                         }}>
                           {user.username}
                         </div>
                         <div style={{ 
                           fontSize: '15px', 
                           color: '#000000' 
                         }}>
                           ID: {user.user_id}
                         </div>
                       </div>
                     </td>
                     <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                       <div style={{
                         width: '48px',
                         height: '48px',
                         borderRadius: '50%',
                         background: '#f3f4f6',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         margin: '0 auto',
                         overflow: 'hidden',
                         border: '2px solid #e5e7eb'
                       }}>
                         {user.icon ? (
                           <img 
                             src={`/images/icons/${user.icon}.png`} 
                             alt={user.icon}
                             style={{
                               width: '40px',
                               height: '40px',
                               objectFit: 'cover',
                               borderRadius: '50%'
                             }}
                           />
                         ) : (
                           <i className="fa-solid fa-user" style={{ 
                             fontSize: '20px', 
                             color: '#000000' 
                           }}></i>
                         )}
                       </div>
                     </td>
                    <td style={{ padding: '16px 24px' }}>
                       <span style={{
                         background: `${getRoleColor(user.role)}20`,
                         color: getRoleColor(user.role),
                         padding: '4px 12px',
                         borderRadius: '20px',
                         fontSize: '14px',
                         fontWeight: '700',
                         textTransform: 'capitalize'
                       }}>
                         {user.role}
                       </span>
                    </td>
                     <td style={{ padding: '16px 24px' }}>
                       <span style={{
                         background: user.active ? '#dcfce720' : '#fef2f220',
                         color: user.active ? '#16a34a' : '#dc2626',
                         padding: '4px 12px',
                         borderRadius: '20px',
                         fontSize: '14px',
                         fontWeight: '700'
                       }}>
                         {user.active ? 'Active' : 'Inactive'}
                       </span>
                     </td>
                     <td style={{ padding: '16px 24px', color: '#000000', fontSize: '15px' }}>
                       User #{user.user_id}
                     </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEditUser(user)}
                          style={{
                            background: '#e0f2fe',
                            color: '#0c4a6e',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit User"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit
                        </button>
                        
                        <button
                          onClick={() => toggleUserStatus(user.user_id, user.active)}
                          style={{
                            background: user.active ? '#fef2f2' : '#dcfce7',
                            color: user.active ? '#dc2626' : '#16a34a',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={user.active ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`fa-solid fa-${user.active ? 'ban' : 'check'}`}></i>
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteUser(user.user_id)}
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Delete User"
                        >
                          <i className="fa-solid fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branches Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        marginTop: '32px'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '2px solid #d1d5db',
          background: '#f9fafb'
        }}>
          <h3 style={{ 
            margin: '0', 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#000000'
          }}>
            <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
            Branches ({branches.length})
          </h3>
        </div>

        {branches.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#000000'
          }}>
            <i className="fa-solid fa-building" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p style={{ fontSize: '20px', margin: '0 0 8px 0' }}>No branches found</p>
            <p style={{ fontSize: '16px', margin: '0' }}>Add your first branch to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Branch Name
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Shop Image
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Address
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Phone
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Manager
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#000000',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch, index) => (
                  <tr key={branch.branch_id} style={{ 
                    borderBottom: index < branches.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          color: '#000000',
                          marginBottom: '4px',
                          fontSize: '16px'
                        }}>
                          {branch.branch_name}
                        </div>
                        <div style={{ 
                          fontSize: '15px', 
                          color: '#000000' 
                        }}>
                          ID: {branch.branch_id}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        overflow: 'hidden',
                        border: '2px solid #e5e7eb'
                      }}>
                        {branch.shop_image ? (
                          <div 
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundImage: `url(images/shop/${branch.shop_image}.png)`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              backgroundColor: 'white',
                              borderRadius: '10px'
                            }}
                          />
                        ) : (
                          <i className="fa-solid fa-building" style={{ 
                            fontSize: '24px', 
                            color: '#000000' 
                          }}></i>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#000000', fontSize: '15px' }}>
                      {branch.address}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#000000', fontSize: '15px' }}>
                      {branch.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#000000', fontSize: '15px' }}>
                      {branch.manager_id ? `User #${branch.manager_id}` : 'Not assigned'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        background: branch.active ? '#dcfce720' : '#fef2f220',
                        color: branch.active ? '#16a34a' : '#dc2626',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        {branch.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEditBranch(branch)}
                          style={{
                            background: '#e0f2fe',
                            color: '#0c4a6e',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit Branch"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit
                        </button>
                        
                        <button
                          onClick={() => handleDeleteBranch(branch.branch_id)}
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Delete Branch"
                        >
                          <i className="fa-solid fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ 
                margin: '0', 
                fontSize: '26px', 
                fontWeight: '600',
                color: '#000000'
              }}>
                <i className="fa-solid fa-user-plus" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
                Add New User
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#000000',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

             <form onSubmit={handleAddUser}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Username *
                 </label>
                 <input
                   type="text"
                   value={newUser.username}
                   onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter username"
                 />
               </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '700',
                  color: '#000000'
                }}>
                  Branch *
                </label>
                <select
                  value={newUser.branch_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '16px',
                  fontWeight: '600',
                  color: '#000000',
                  fontSize: '16px'
                }}>
                  Character Icon *
                </label>
                
                {/* Icon Pack Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '700',
                    color: '#000000',
                    fontSize: '14px'
                  }}>
                    Icon Pack
                  </label>
                  <select
                    value={selectedIconPack}
                    onChange={(e) => setSelectedIconPack(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      fontSize: '14px',
                      color: '#000000',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                    }}
                  >
                    {Object.entries(iconPacks).map(([key, pack]) => (
                      <option key={key} value={key}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}>
                  {availableIcons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, icon: icon.name })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        border: newUser.icon === icon.name ? '3px solid #7d8d86' : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: newUser.icon === icon.name 
                          ? 'linear-gradient(135deg, #7d8d86 0%, #5a6b5f 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: newUser.icon === icon.name ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: newUser.icon === icon.name 
                          ? '0 8px 25px rgba(125, 141, 134, 0.3), 0 0 0 1px rgba(125, 141, 134, 0.1)' 
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '3px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}>
                        <img 
                          src={`/images/icons/${icon.name}.png`} 
                          alt={icon.label}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: newUser.icon === icon.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                          }}
                        />
                      </div>
                      {newUser.icon === icon.name && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          zIndex: 10
                        }}>
                          <i className="fa-solid fa-check" style={{ 
                            fontSize: '10px', 
                            color: 'white' 
                          }}></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f3f4f6',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus"></i>
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
           </div>
         </div>
       )}

       {/* Edit User Modal */}
       {showEditModal && editingUser && (
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
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '24px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-user-pen" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
                 Edit User
               </h2>
               <button
                 onClick={() => {
                   setShowEditModal(false)
                   setEditingUser(null)
                 }}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleEditUser}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Username *
                 </label>
                 <input
                   type="text"
                   value={newUser.username}
                   onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter username"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   New Password (leave blank to keep current)
                 </label>
                 <input
                   type="password"
                   value={newUser.password}
                   onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter new password (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Role *
                 </label>
                 <select
                   value={newUser.role}
                   onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="Cashier">Cashier</option>
                   <option value="Manager">Manager</option>
                   <option value="Admin">Admin</option>
                 </select>
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch *
                 </label>
                 <select
                   value={newUser.branch_id || ''}
                   onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="">Select a branch</option>
                   {branches.map((branch) => (
                     <option key={branch.branch_id} value={branch.branch_id}>
                       {branch.branch_name}
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Character Icon *
                 </label>
                 
                 {/* Icon Pack Selector */}
                 <div style={{ marginBottom: '16px' }}>
                   <label style={{
                     display: 'block',
                     marginBottom: '8px',
                     fontWeight: '700',
                     color: '#000000',
                     fontSize: '14px'
                   }}>
                     Icon Pack
                   </label>
                   <select
                     value={selectedIconPack}
                     onChange={(e) => setSelectedIconPack(e.target.value)}
                     style={{
                       width: '100%',
                       padding: '12px 16px',
                       border: '2px solid #e5e7eb',
                       borderRadius: '8px',
                       backgroundColor: '#ffffff',
                       fontSize: '14px',
                       color: '#000000',
                       cursor: 'pointer',
                       outline: 'none',
                       transition: 'border-color 0.2s ease'
                     }}
                     onFocus={(e) => {
                       e.target.style.borderColor = '#7d8d86'
                     }}
                     onBlur={(e) => {
                       e.target.style.borderColor = '#e5e7eb'
                     }}
                   >
                     {Object.entries(iconPacks).map(([key, pack]) => (
                       <option key={key} value={key}>
                         {pack.name}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(3, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableIcons.map((icon) => (
                     <button
                       key={icon.name}
                       type="button"
                       onClick={() => setNewUser({ ...newUser, icon: icon.name })}
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newUser.icon === icon.name ? '3px solid #7d8d86' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newUser.icon === icon.name 
                           ? 'linear-gradient(135deg, #7d8d86 0%, #5a6b5f 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newUser.icon === icon.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newUser.icon === icon.name 
                           ? '0 8px 25px rgba(125, 141, 134, 0.3), 0 0 0 1px rgba(125, 141, 134, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '56px',
                         height: '56px',
                         borderRadius: '50%',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                       }}>
                         <img 
                           src={`/images/icons/${icon.name}.png`} 
                           alt={icon.label}
                           style={{
                             width: '100%',
                             height: '100%',
                             objectFit: 'cover',
                             filter: newUser.icon === icon.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       {newUser.icon === icon.name && (
                         <div style={{
                           position: 'absolute',
                           top: '4px',
                           right: '4px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowEditModal(false)
                     setEditingUser(null)
                   }}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : '#7d8d86',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Updating...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-floppy-disk"></i>
                       Update User
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Add Branch Modal */}
       {showAddBranchModal && (
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
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '26px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                 Add New Branch
               </h2>
               <button
                 onClick={() => setShowAddBranchModal(false)}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleAddBranch}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch Name *
                 </label>
                 <input
                   type="text"
                   value={newBranch.branch_name}
                   onChange={(e) => setNewBranch({ ...newBranch, branch_name: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter branch name"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Address *
                 </label>
                 <textarea
                   value={newBranch.address}
                   onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                   required
                   rows={3}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     resize: 'vertical'
                   }}
                   placeholder="Enter branch address"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Phone Number
                 </label>
                 <input
                   type="tel"
                   value={newBranch.phone}
                   onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter phone number (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Manager (Optional)
                 </label>
                 <select
                   value={newBranch.manager_id || ''}
                   onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="">Select a manager (optional)</option>
                   {users.filter(user => user.role === 'Manager' || user.role === 'Admin').map(user => (
                     <option key={user.user_id} value={user.user_id}>
                       {user.username} ({user.role})
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Shop Image *
                 </label>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(2, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableShopImages.map((shop) => (
                     <button
                       key={shop.name}
                       type="button"
                       onClick={() => setNewBranch({ ...newBranch, shop_image: shop.name })}
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newBranch.shop_image === shop.name ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newBranch.shop_image === shop.name 
                           ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newBranch.shop_image === shop.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newBranch.shop_image === shop.name 
                           ? '0 8px 25px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '80px',
                         height: '80px',
                         borderRadius: '12px',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                         marginBottom: '8px'
                       }}>
                         <div 
                           style={{
                             width: '100%',
                             height: '100%',
                             backgroundImage: `url(images/shop/${shop.name}.png)`,
                             backgroundSize: 'contain',
                             backgroundRepeat: 'no-repeat',
                             backgroundPosition: 'center',
                             backgroundColor: 'white',
                             filter: newBranch.shop_image === shop.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       <span style={{
                         fontSize: '14px',
                         fontWeight: '700',
                         color: newBranch.shop_image === shop.name ? 'white' : '#000000'
                       }}>
                         {shop.label}
                       </span>
                       {newBranch.shop_image === shop.name && (
                         <div style={{
                           position: 'absolute',
                           top: '8px',
                           right: '8px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => setShowAddBranchModal(false)}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Adding...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-building"></i>
                       Add Branch
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Edit Branch Modal */}
       {showEditBranchModal && editingBranch && (
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
           zIndex: 1000
         }}>
           <div style={{
             background: '#ffffff',
             borderRadius: '12px',
             padding: '32px',
             width: '90%',
             maxWidth: '500px',
             maxHeight: '90vh',
             overflowY: 'auto',
             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
           }}>
             <div style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: '24px'
             }}>
               <h2 style={{ 
                 margin: '0', 
                 fontSize: '24px', 
                 fontWeight: '600',
                 color: '#000000'
               }}>
                 <i className="fa-solid fa-building" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                 Edit Branch
               </h2>
               <button
                 onClick={() => {
                   setShowEditBranchModal(false)
                   setEditingBranch(null)
                 }}
                 style={{
                   background: 'none',
                   border: 'none',
                   fontSize: '20px',
                   color: '#000000',
                   cursor: 'pointer',
                   padding: '4px'
                 }}
               >
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleEditBranch}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Branch Name *
                 </label>
                 <input
                   type="text"
                   value={newBranch.branch_name}
                   onChange={(e) => setNewBranch({ ...newBranch, branch_name: e.target.value })}
                   required
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter branch name"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Address *
                 </label>
                 <textarea
                   value={newBranch.address}
                   onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                   required
                   rows={3}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     resize: 'vertical'
                   }}
                   placeholder="Enter branch address"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Phone Number
                 </label>
                 <input
                   type="tel"
                   value={newBranch.phone}
                   onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box'
                   }}
                   placeholder="Enter phone number (optional)"
                 />
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '8px',
                   fontWeight: '700',
                   color: '#000000'
                 }}>
                   Manager (Optional)
                 </label>
                 <select
                   value={newBranch.manager_id || ''}
                   onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '2px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '16px',
                     boxSizing: 'border-box',
                     background: '#ffffff'
                   }}
                 >
                   <option value="">Select a manager (optional)</option>
                   {users.filter(user => user.role === 'Manager' || user.role === 'Admin').map(user => (
                     <option key={user.user_id} value={user.user_id}>
                       {user.username} ({user.role})
                     </option>
                   ))}
                 </select>
               </div>

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#000000',
                   fontSize: '16px'
                 }}>
                   Shop Image *
                 </label>
                 <div style={{
                   display: 'grid',
                   gridTemplateColumns: 'repeat(2, 1fr)',
                   gap: '16px',
                   padding: '20px',
                   border: '2px solid #e5e7eb',
                   borderRadius: '16px',
                   background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                 }}>
                   {availableShopImages.map((shop) => (
                     <button
                       key={shop.name}
                       type="button"
                       onClick={() => setNewBranch({ ...newBranch, shop_image: shop.name })}
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         padding: '16px',
                         border: newBranch.shop_image === shop.name ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                         borderRadius: '20px',
                         background: newBranch.shop_image === shop.name 
                           ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                           : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                         cursor: 'pointer',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         transform: newBranch.shop_image === shop.name ? 'scale(1.05)' : 'scale(1)',
                         boxShadow: newBranch.shop_image === shop.name 
                           ? '0 8px 25px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
                           : '0 2px 8px rgba(0, 0, 0, 0.1)',
                         position: 'relative',
                         overflow: 'hidden'
                       }}
                     >
                       <div style={{
                         position: 'relative',
                         width: '80px',
                         height: '80px',
                         borderRadius: '12px',
                         overflow: 'hidden',
                         border: '3px solid rgba(255, 255, 255, 0.8)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                         marginBottom: '8px'
                       }}>
                         <div 
                           style={{
                             width: '100%',
                             height: '100%',
                             backgroundImage: `url(images/shop/${shop.name}.png)`,
                             backgroundSize: 'contain',
                             backgroundRepeat: 'no-repeat',
                             backgroundPosition: 'center',
                             backgroundColor: 'white',
                             filter: newBranch.shop_image === shop.name ? 'brightness(1.1) contrast(1.1)' : 'none'
                           }}
                         />
                       </div>
                       <span style={{
                         fontSize: '14px',
                         fontWeight: '700',
                         color: newBranch.shop_image === shop.name ? 'white' : '#000000'
                       }}>
                         {shop.label}
                       </span>
                       {newBranch.shop_image === shop.name && (
                         <div style={{
                           position: 'absolute',
                           top: '8px',
                           right: '8px',
                           width: '20px',
                           height: '20px',
                           borderRadius: '50%',
                           background: '#10b981',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           border: '2px solid white',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                           zIndex: 10
                         }}>
                           <i className="fa-solid fa-check" style={{ 
                             fontSize: '10px', 
                             color: 'white' 
                           }}></i>
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               </div>

               <div style={{
                 display: 'flex',
                 gap: '16px',
                 justifyContent: 'flex-end'
               }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowEditBranchModal(false)
                     setEditingBranch(null)
                   }}
                   style={{
                     background: '#f3f4f6',
                     color: '#000000',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: 'pointer'
                   }}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   style={{
                     background: isSubmitting ? '#9ca3af' : '#3b82f6',
                     color: 'white',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '700',
                     cursor: isSubmitting ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}
                 >
                   {isSubmitting ? (
                     <>
                       <i className="fa-solid fa-spinner fa-spin"></i>
                       Updating...
                     </>
                   ) : (
                     <>
                       <i className="fa-solid fa-floppy-disk"></i>
                       Update Branch
                     </>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* FontAwesome Icon - Bottom Right */}
       <div 
         onClick={() => setShowVaultModal(true)}
         title="Access Secure Vault - Manage sensitive operations and settings"
         style={{
           position: 'fixed',
           bottom: '24px',
           right: '24px',
           zIndex: 50,
           width: '120px',
           height: '120px',
           borderRadius: '50%',
           background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           boxShadow: '0 8px 24px rgba(125, 141, 134, 0.4)',
           cursor: 'pointer',
           transition: 'all 0.2s ease'
         }}
       >
         <i className="fa-solid fa-vault" style={{ 
           fontSize: '48px', 
           color: '#f1f0e4' 
         }}></i>
       </div>

       {/* Vault Modal */}
       <VaultModal 
         isOpen={showVaultModal} 
         onClose={() => setShowVaultModal(false)} 
       />
     </div>
   )
 }
 
 export default Admin
