import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hashPassword } from '../utils/auth'
import VaultModal from '../components/VaultModal'

interface User {
  user_id: number
  username: string
  password_hash: string
  role: string
  active: boolean
  icon?: string
}

interface NewUser {
  username: string
  password: string
  role: string
  icon: string
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    password: '',
    role: 'Cashier',
    icon: 'ryu'
  })

  // Available character icons
  const availableIcons = [
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showVaultModal, setShowVaultModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('user_id', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        setError('Failed to fetch users')
        return
      }

      setUsers(users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const passwordHash = hashPassword(newUser.password)

      const { error } = await supabase
        .from('users')
        .insert([{
          username: newUser.username,
          password_hash: passwordHash,
          role: newUser.role,
          active: true,
          icon: newUser.icon
        }])
        .select()

      if (error) {
        console.error('Error adding user:', error)
        throw error
      }

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
      setError(`Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      icon: user.icon || 'ryu'
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
        icon: newUser.icon
      }

      // Only update password if provided
      if (newUser.password.trim()) {
        updateData.password_hash = hashPassword(newUser.password)
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#ef4444' // Red
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
        color: '#1a1a1a'
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
            fontWeight: '600', 
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            <i className="fa-solid fa-users-cog" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
            User Management
          </h1>
          <p style={{ 
            color: '#1a1a1a', 
            margin: '0',
            fontSize: '18px'
          }}>
            Manage system users and their permissions
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#7d8d86',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '18px',
            fontWeight: '500',
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
            color: '#1a1a1a'
          }}>
            <i className="fa-solid fa-list" style={{ marginRight: '8px', color: '#7d8d86' }}></i>
            All Users ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#1a1a1a'
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
                    color: '#1a1a1a',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#1a1a1a',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Icon
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#1a1a1a',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Role
                  </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#1a1a1a',
                    borderBottom: '2px solid #d1d5db',
                    fontSize: '16px'
                  }}>
                    Status
                  </th>
                   <th style={{ 
                     padding: '16px 24px', 
                     textAlign: 'left', 
                     fontWeight: '600',
                     color: '#1a1a1a',
                     borderBottom: '2px solid #d1d5db',
                     fontSize: '16px'
                   }}>
                     User ID
                   </th>
                  <th style={{ 
                    padding: '16px 24px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#1a1a1a',
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
                           fontWeight: '500', 
                           color: '#1a1a1a',
                           marginBottom: '4px',
                           fontSize: '16px'
                         }}>
                           {user.username}
                         </div>
                         <div style={{ 
                           fontSize: '15px', 
                           color: '#1a1a1a' 
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
                             src={`/retailpos/images/icons/${user.icon}.png`} 
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
                             color: '#9ca3af' 
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
                         fontWeight: '500',
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
                         fontWeight: '500'
                       }}>
                         {user.active ? 'Active' : 'Inactive'}
                       </span>
                     </td>
                     <td style={{ padding: '16px 24px', color: '#1a1a1a', fontSize: '15px' }}>
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
                color: '#1a1a1a'
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
                  color: '#1a1a1a',
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
                   fontWeight: '500',
                   color: '#1a1a1a'
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
                  fontWeight: '500',
                  color: '#1a1a1a'
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
                  fontWeight: '500',
                  color: '#1a1a1a'
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '16px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  fontSize: '16px'
                }}>
                  Character Icon *
                </label>
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
                          src={`/retailpos/images/icons/${icon.name}.png`} 
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
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '500',
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
                    fontWeight: '500',
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
                 color: '#1a1a1a'
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
                   color: '#1a1a1a',
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
                   fontWeight: '500',
                   color: '#1a1a1a'
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
                   fontWeight: '500',
                   color: '#1a1a1a'
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
                   fontWeight: '500',
                   color: '#1a1a1a'
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

               <div style={{ marginBottom: '24px' }}>
                 <label style={{
                   display: 'block',
                   marginBottom: '16px',
                   fontWeight: '600',
                   color: '#1a1a1a',
                   fontSize: '16px'
                 }}>
                   Character Icon *
                 </label>
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
                           src={`/retailpos/images/icons/${icon.name}.png`} 
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
                     color: '#1a1a1a',
                     border: 'none',
                     borderRadius: '8px',
                     padding: '12px 24px',
                     fontSize: '16px',
                     fontWeight: '500',
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
                     fontWeight: '500',
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
