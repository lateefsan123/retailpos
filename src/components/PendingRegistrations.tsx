import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

interface PendingRegistration {
  id: string
  user_id: number
  email: string
  business_name: string
  first_name?: string
  last_name?: string
  phone?: string
  business_type?: string
  business_description?: string
  business_address?: string
  business_phone?: string
  currency?: string
  website?: string
  vat_number?: string
  open_time?: string
  close_time?: string
  created_at: string
  approved: boolean
  approved_at?: string
  approved_by?: number
  rejection_reason?: string
  status: 'pending' | 'approved' | 'rejected'
}

const PendingRegistrations = () => {
  const { user } = useAuth()
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingRegistrations()
  }, [])

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending registrations:', error)
        setError('Failed to fetch pending registrations')
        return
      }

      setPendingRegistrations(data || [])
    } catch (err) {
      console.error('Error:', err)
      setError('An error occurred while fetching registrations')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (registration: PendingRegistration) => {
    try {
      setProcessing(registration.id)
      
      // Update the user to be active
      const { error: userError } = await supabase
        .from('users')
        .update({ active: true })
        .eq('user_id', registration.user_id)

      if (userError) {
        console.error('Error activating user:', userError)
        setError('Failed to activate user')
        return
      }

      // Update the pending registration
      const { error: pendingError } = await supabase
        .from('pending_registrations')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.user_id,
          status: 'approved'
        })
        .eq('id', registration.id)

      if (pendingError) {
        console.error('Error updating pending registration:', pendingError)
        setError('Failed to update registration status')
        return
      }

      // Refresh the list
      await fetchPendingRegistrations()
      setShowDetailsModal(false)
      setSelectedRegistration(null)
    } catch (err) {
      console.error('Error approving registration:', err)
      setError('An error occurred while approving the registration')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (registration: PendingRegistration) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    try {
      setProcessing(registration.id)
      
      // Update the pending registration
      const { error: pendingError } = await supabase
        .from('pending_registrations')
        .update({
          approved: false,
          approved_at: new Date().toISOString(),
          approved_by: user?.user_id,
          rejection_reason: rejectionReason,
          status: 'rejected'
        })
        .eq('id', registration.id)

      if (pendingError) {
        console.error('Error updating pending registration:', pendingError)
        setError('Failed to update registration status')
        return
      }

      // Refresh the list
      await fetchPendingRegistrations()
      setShowDetailsModal(false)
      setSelectedRegistration(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Error rejecting registration:', err)
      setError('An error occurred while rejecting the registration')
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b' // amber
      case 'approved':
        return '#10b981' // emerald
      case 'rejected':
        return '#ef4444' // red
      default:
        return '#6b7280' // gray
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#7d8d86' }}>Loading pending registrations...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#3e3f29',
          margin: 0
        }}>
          Pending Registrations
        </h2>
        <button
          onClick={fetchPendingRegistrations}
          style={{
            padding: '8px 16px',
            backgroundColor: '#7d8d86',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {pendingRegistrations.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            No pending registrations found
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Business</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Contact</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRegistrations.map((registration) => (
                <tr key={registration.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#3e3f29' }}>
                        {registration.business_name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {registration.business_type}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ color: '#3e3f29' }}>
                        {registration.first_name} {registration.last_name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {registration.email}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: getStatusColor(registration.status) + '20',
                      color: getStatusColor(registration.status)
                    }}>
                      {registration.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {formatDate(registration.created_at)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedRegistration(registration)
                        setShowDetailsModal(true)
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#7d8d86',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRegistration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#3e3f29',
              marginBottom: '20px'
            }}>
              Registration Details
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#3e3f29', marginBottom: '8px' }}>
                Business Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <strong>Business Name:</strong> {selectedRegistration.business_name}
                </div>
                <div>
                  <strong>Business Type:</strong> {selectedRegistration.business_type}
                </div>
                <div>
                  <strong>Address:</strong> {selectedRegistration.business_address}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedRegistration.business_phone}
                </div>
                <div>
                  <strong>Website:</strong> {selectedRegistration.website || 'N/A'}
                </div>
                <div>
                  <strong>VAT Number:</strong> {selectedRegistration.vat_number || 'N/A'}
                </div>
                <div>
                  <strong>Currency:</strong> {selectedRegistration.currency}
                </div>
                <div>
                  <strong>Hours:</strong> {selectedRegistration.open_time} - {selectedRegistration.close_time}
                </div>
              </div>
              {selectedRegistration.business_description && (
                <div style={{ marginTop: '8px' }}>
                  <strong>Description:</strong> {selectedRegistration.business_description}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#3e3f29', marginBottom: '8px' }}>
                Contact Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <strong>Name:</strong> {selectedRegistration.first_name} {selectedRegistration.last_name}
                </div>
                <div>
                  <strong>Email:</strong> {selectedRegistration.email}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedRegistration.phone || 'N/A'}
                </div>
                <div>
                  <strong>Registered:</strong> {formatDate(selectedRegistration.created_at)}
                </div>
              </div>
            </div>

            {selectedRegistration.status === 'pending' && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#3e3f29', marginBottom: '8px' }}>
                  Rejection Reason (if rejecting)
                </h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedRegistration(null)
                  setRejectionReason('')
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              
              {selectedRegistration.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedRegistration)}
                    disabled={processing === selectedRegistration.id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processing === selectedRegistration.id ? 'not-allowed' : 'pointer',
                      opacity: processing === selectedRegistration.id ? 0.6 : 1
                    }}
                  >
                    {processing === selectedRegistration.id ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRegistration)}
                    disabled={processing === selectedRegistration.id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processing === selectedRegistration.id ? 'not-allowed' : 'pointer',
                      opacity: processing === selectedRegistration.id ? 0.6 : 1
                    }}
                  >
                    {processing === selectedRegistration.id ? 'Approving...' : 'Approve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingRegistrations

