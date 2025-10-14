import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import VaultReports from './VaultReports'

interface VaultModalProps {
  isOpen: boolean
  onClose: () => void
}

interface VaultEntry {
  entry_id: number
  label: string
  email: string
  password: string
  created_at: string
}

const VaultModal = ({ isOpen, onClose }: VaultModalProps) => {
  const { user } = useAuth()
  const [pin, setPin] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [vaultId, setVaultId] = useState<number | null>(null)
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([])
  const [, setShowEntries] = useState(false)
  const [isCreatingVault, setIsCreatingVault] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({
    title: '',
    username: '',
    password: '',
    website: ''
  })
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [showReports, setShowReports] = useState(false)
  const [showPinManagement, setShowPinManagement] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isUpdatingPin, setIsUpdatingPin] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setPin('')
      setStatusMessage('')
      setStatusType('')
      setIsUnlocked(false)
      setVaultId(null)
      setVaultEntries([])
      setShowEntries(false)
      setIsCreatingVault(false)
      setShowAddForm(false)
      setVisiblePasswords(new Set())
      setShowDeleteConfirm(null)
      setShowReports(false)
      setShowPinManagement(false)
      setNewPin('')
      setConfirmPin('')
      setIsUpdatingPin(false)
      setNewEntry({
        title: '',
        username: '',
        password: '',
        website: ''
      })
    }
  }, [isOpen])

  const addDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
      setStatusMessage('')
      setStatusType('')
    }
  }

  const clearPin = () => {
    setPin('')
    setStatusMessage('')
    setStatusType('')
  }

  const createVault = async (pinValue: string) => {
    if (!user) return

    try {
      // Hash the PIN using SHA-256 (same as system PIN)
      const hashedPin = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinValue))
      const hashedPinHex = Array.from(new Uint8Array(hashedPin))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      const { data, error } = await supabase
        .from('vault')
        .insert([{
          owner_id: user.user_id,
          pin_hash: hashedPinHex
        }])
        .select()

      if (error) throw error

      setVaultId(data[0].vault_id)
      setStatusMessage('✓ Vault created successfully!')
      setStatusType('success')
      setIsUnlocked(true)
    } catch (error) {
      console.error('Error creating vault:', error)
      setStatusMessage('✗ Failed to create vault. Try again.')
      setStatusType('error')
    }
  }

  const verifyPin = async (pinValue: string) => {
    if (!user) return

    try {
      // Check if vault exists for this user
      const { data: vaultData, error: vaultError } = await supabase
        .from('vault')
        .select('vault_id, pin_hash')
        .eq('owner_id', user.user_id)
        .single()

      if (vaultError) {
        if (vaultError.code === 'PGRST116') {
          // No vault found, create one
          setIsCreatingVault(true)
          setStatusMessage('Creating your vault...')
          setStatusType('success')
          await createVault(pinValue)
          return
        }
        throw vaultError
      }

      // Verify PIN by hashing the entered PIN and comparing
      const enteredPinHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinValue))
      const enteredPinHashHex = Array.from(new Uint8Array(enteredPinHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (vaultData.pin_hash === enteredPinHashHex) {
        setVaultId(vaultData.vault_id)
        setStatusMessage('✓ Access Granted! Vault Unlocked')
        setStatusType('success')
        setIsUnlocked(true)
        await fetchVaultEntries(vaultData.vault_id)
      } else {
        setStatusMessage('✗ Incorrect PIN. Try again.')
        setStatusType('error')
        setTimeout(() => clearPin(), 1000)
      }
    } catch (error) {
      console.error('Error verifying PIN:', error)
      setStatusMessage('✗ Failed to access vault. Try again.')
      setStatusType('error')
    }
  }

  const fetchVaultEntries = async (vaultId: number) => {
    try {
      const { data, error } = await supabase
        .from('vault_entries')
        .select('entry_id, label, email, password_enc, link, created_at')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Debug: Log what we're getting from the database
      console.log('Raw data from database:', data)
      if (data.length > 0) {
        console.log('First entry password_enc:', data[0].password_enc)
        console.log('Type of password_enc:', typeof data[0].password_enc)
      }

      // Handle the password display - for now just use the stored value
      const decryptedEntries = data.map(entry => ({
        ...entry,
        password: entry.password_enc || 'No password'
      }))

      setVaultEntries(decryptedEntries)
      setShowEntries(true)
    } catch (error) {
      console.error('Error fetching vault entries:', error)
    }
  }

  const saveNewEntry = async () => {
    if (!vaultId || !newEntry.title || !newEntry.password) {
      setStatusMessage('✗ Title and password are required')
      setStatusType('error')
      return
    }

    try {
      // For now, store as plain text (we'll implement encryption later)
      // TODO: Implement proper PGP_SYM_ENCRYPT when encryption is added
      
      const { error } = await supabase
        .from('vault_entries')
        .insert([{
          vault_id: vaultId,
          label: newEntry.title,
          email: newEntry.username,
          password_enc: newEntry.password, // Store as plain text for now
          link: newEntry.website
        }])
        .select()

      if (error) throw error

      // Refresh entries
      await fetchVaultEntries(vaultId)
      
      // Reset form
      setNewEntry({
        title: '',
        username: '',
        password: '',
        website: ''
      })
      setShowAddForm(false)
      setStatusMessage('✓ Password saved successfully!')
      setStatusType('success')
    } catch (error) {
      console.error('Error saving entry:', error)
      setStatusMessage('✗ Failed to save password. Try again.')
      setStatusType('error')
    }
  }

  const togglePasswordVisibility = (entryId: number) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage(`✓ ${type} copied to clipboard!`)
      setStatusType('success')
      setTimeout(() => {
        setStatusMessage('')
        setStatusType('')
      }, 2000)
    } catch (error) {
      setStatusMessage(`✗ Failed to copy ${type}`)
      setStatusType('error')
      setTimeout(() => {
        setStatusMessage('')
        setStatusType('')
      }, 2000)
    }
  }

  const confirmDelete = (entryId: number) => {
    setShowDeleteConfirm(entryId)
  }

  const deleteEntry = async (entryId: number) => {
    if (!vaultId) return

    try {
      const { error } = await supabase
        .from('vault_entries')
        .delete()
        .eq('entry_id', entryId)
        .eq('vault_id', vaultId)

      if (error) throw error

      // Refresh entries
      await fetchVaultEntries(vaultId)
      setShowDeleteConfirm(null)
      setStatusMessage('✓ Password deleted successfully!')
      setStatusType('success')
      setTimeout(() => {
        setStatusMessage('')
        setStatusType('')
      }, 2000)
    } catch (error) {
      console.error('Error deleting entry:', error)
      setStatusMessage('✗ Failed to delete password. Try again.')
      setStatusType('error')
      setTimeout(() => {
        setStatusMessage('')
        setStatusType('')
      }, 2000)
    }
  }

  const submitPin = () => {
    if (pin.length !== 4) return
    verifyPin(pin)
  }

  const updateVaultPin = async () => {
    if (newPin.length < 4) {
      setStatusMessage('✗ PIN must be at least 4 digits')
      setStatusType('error')
      return
    }

    if (newPin !== confirmPin) {
      setStatusMessage('✗ PINs do not match')
      setStatusType('error')
      return
    }

    if (!vaultId) {
      setStatusMessage('✗ No vault found')
      setStatusType('error')
      return
    }

    setIsUpdatingPin(true)
    setStatusMessage('Updating vault PIN...')
    setStatusType('success')

    try {
      // Hash the new PIN
      const hashedPin = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPin))
      const hashedPinHex = Array.from(new Uint8Array(hashedPin))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { error } = await supabase
        .from('vault')
        .update({ pin_hash: hashedPinHex })
        .eq('vault_id', vaultId)

      if (error) throw error

      setStatusMessage('✓ Vault PIN updated successfully!')
      setStatusType('success')
      setNewPin('')
      setConfirmPin('')
      setShowPinManagement(false)
    } catch (error) {
      console.error('Error updating vault PIN:', error)
      setStatusMessage('✗ Failed to update vault PIN')
      setStatusType('error')
    } finally {
      setIsUpdatingPin(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key
    
    if (key >= '0' && key <= '9') {
      addDigit(key)
    } else if (key === 'Backspace' || key === 'Delete') {
      if (pin.length > 0) {
        setPin(prev => prev.slice(0, -1))
      }
    } else if (key === 'Enter') {
      submitPin()
    } else if (key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* PIN Entry Interface - Only show when not unlocked */}
      {!isUnlocked && (
        <>
          {/* Dark Overlay */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              backdropFilter: 'blur(6px)'
            }}
            onClick={onClose}
          />
          
          {/* PIN Modal */}
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
          <div style={{
            background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(20, 20, 20, 0.98))',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            color: '#ffffff'
          }}>
            <div style={{
              marginBottom: '40px'
            }}>
              <h2 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 8px 0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
              }}>
                Password Vault
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                margin: '0',
                fontWeight: '400'
              }}>
                {isCreatingVault ? 'Creating your secure vault...' : 'Enter your 4-digit PIN to continue'}
              </p>
            </div>
            
            {/* PIN Display */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '40px'
            }}>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: index < pin.length ? '#ffffff' : 'transparent',
                    borderColor: index < pin.length ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                    transform: index < pin.length ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    boxShadow: index < pin.length ? '0 0 10px rgba(255, 255, 255, 0.5)' : 'none'
                  }}
                />
              ))}
            </div>
            
            {/* Keypad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              marginBottom: '20px'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => addDigit(num.toString())}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.95))',
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(45, 45, 45, 0.95))', 'important')
                    e.currentTarget.style.setProperty('transform', 'translateY(-2px)', 'important')
                    e.currentTarget.style.setProperty('box-shadow', '0 6px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.08)', 'important')
                    e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.3)', 'important')
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.95))', 'important')
                    e.currentTarget.style.setProperty('transform', 'translateY(0)', 'important')
                    e.currentTarget.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)', 'important')
                    e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.15)', 'important')
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => addDigit('0')}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.95))',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(5px)',
                  gridColumn: '2'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(45, 45, 45, 0.95))', 'important')
                  e.currentTarget.style.setProperty('transform', 'translateY(-2px)', 'important')
                  e.currentTarget.style.setProperty('box-shadow', '0 6px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.08)', 'important')
                  e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.3)', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(15, 15, 15, 0.95), rgba(25, 25, 25, 0.95))', 'important')
                  e.currentTarget.style.setProperty('transform', 'translateY(0)', 'important')
                  e.currentTarget.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)', 'important')
                  e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.15)', 'important')
                }}
              >
                0
              </button>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={clearPin}
                style={{
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(35, 35, 35, 0.9))',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(35, 35, 35, 0.95), rgba(55, 55, 55, 0.95))', 'important')
                  e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.4)', 'important')
                  e.currentTarget.style.setProperty('transform', 'translateY(-2px)', 'important')
                  e.currentTarget.style.setProperty('color', '#ffffff', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('background', 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(35, 35, 35, 0.9))', 'important')
                  e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.2)', 'important')
                  e.currentTarget.style.setProperty('transform', 'translateY(0)', 'important')
                  e.currentTarget.style.setProperty('color', 'rgba(255, 255, 255, 0.8)', 'important')
                }}
              >
                Clear
              </button>
              <button
                onClick={submitPin}
                disabled={pin.length !== 4}
                style={{
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, #ffffff, #e8e8e8)',
                  color: '#1a1a1a',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  opacity: pin.length === 4 ? 1 : 0.5,
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (pin.length === 4) {
                    e.currentTarget.style.setProperty('transform', 'translateY(-2px)', 'important')
                    e.currentTarget.style.setProperty('box-shadow', '0 8px 16px rgba(255, 255, 255, 0.4), 0 0 25px rgba(255, 255, 255, 0.2)', 'important')
                    e.currentTarget.style.setProperty('border-color', '#ffffff', 'important')
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('transform', 'translateY(0)', 'important')
                  e.currentTarget.style.setProperty('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3)', 'important')
                  e.currentTarget.style.setProperty('border-color', 'rgba(255, 255, 255, 0.3)', 'important')
                }}
              >
                {isCreatingVault ? 'Creating...' : 'Unlock'}
              </button>
            </div>
            
            {/* Status Message */}
            {statusMessage && (
              <div style={{
                marginTop: '20px',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '500',
                background: statusType === 'success' 
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(240, 240, 240, 0.08))' 
                  : 'rgba(220, 53, 69, 0.15)',
                color: statusType === 'success' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : '#ff6b6b',
                border: statusType === 'success' 
                  ? '1px solid rgba(255, 255, 255, 0.15)' 
                  : '1px solid rgba(255, 107, 107, 0.3)'
              }}>
                {statusMessage}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Vault Interior - Shows when unlocked */}
      {isUnlocked && (
        <>
          {/* Dark Overlay for Vault Interior */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
              backdropFilter: 'blur(6px)'
            }}
            onClick={onClose}
          />
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              maxWidth: '900px',
              width: '95%',
              maxHeight: '70vh',
              minHeight: '500px',
              overflowY: 'auto',
              textAlign: 'center'
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(20, 20, 20, 0.98))',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              color: '#ffffff'
            }}>
            {/* Vault Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '700',
                margin: 0,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
              }}>
                <i className="fa-solid fa-vault" style={{ marginRight: '10px', color: 'rgba(255, 255, 255, 0.8)' }}></i>
                Password Vault
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowPinManagement(true)}
                  style={{
                    background: 'linear-gradient(135deg, #dc3545, #c82333)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 8px rgba(220, 53, 69, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #c82333, #a71e2a)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(220, 53, 69, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #dc3545, #c82333)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.3)'
                  }}
                >
                  <i className="fa-solid fa-key"></i>
                  Manage PIN
                </button>
                <button
                  onClick={() => setShowReports(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <i className="fa-solid fa-chart-line"></i>
                  Reports
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '20px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                    e.currentTarget.style.transform = 'rotate(90deg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'rotate(0deg)'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Add Password Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '25px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.12))'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                {showAddForm ? 'Cancel' : 'Add Password'}
              </button>
            </div>

            {/* Add Password Form */}
            {showAddForm && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  textAlign: 'center',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                }}>
                  Add New Password
                </h3>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  <input
                    type="text"
                    placeholder="Title (e.g., Facebook, Twitter)"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  
                  <input
                    type="text"
                    placeholder="Username/Email"
                    value={newEntry.username}
                    onChange={(e) => setNewEntry({...newEntry, username: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  
                  <input
                    type="password"
                    placeholder="Password"
                    value={newEntry.password}
                    onChange={(e) => setNewEntry({...newEntry, password: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  
                  <input
                    type="url"
                    placeholder="Website (optional)"
                    value={newEntry.website}
                    onChange={(e) => setNewEntry({...newEntry, website: e.target.value})}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowAddForm(false)}
                      style={{
                        padding: '10px 20px',
                        border: '2px solid rgba(125, 141, 134, 0.3)',
                        borderRadius: '20px',
                        background: 'transparent',
                        color: '#7d8d86',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(125, 141, 134, 0.1)'
                        e.currentTarget.style.borderColor = '#7d8d86'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(125, 141, 134, 0.3)'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNewEntry}
                      disabled={!newEntry.title || !newEntry.password}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '20px',
                        background: newEntry.title && newEntry.password 
                          ? '#7d8d86' 
                          : 'rgba(125, 141, 134, 0.3)',
                        color: '#f1f0e4',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: newEntry.title && newEntry.password ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (newEntry.title && newEntry.password) {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      Save Password
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Vault Content */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Saved Passwords Section */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
                borderRadius: '15px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: 'rgba(255, 255, 255, 0.8)' }}></i>
                  Saved Passwords
                </div>
                
                {vaultEntries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vaultEntries.map((entry) => (
                      <div key={entry.entry_id} style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
                        borderRadius: '10px',
                        padding: '15px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        position: 'relative',
                        backdropFilter: 'blur(5px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                      >
                        {/* Delete X button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            confirmDelete(entry.entry_id)
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.3s ease',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          ×
                        </button>
                        
                        <div style={{
                          color: '#ffffff',
                          fontWeight: '600',
                          marginBottom: '5px',
                          paddingRight: '30px'
                        }}>
                          {entry.label}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '14px',
                          marginBottom: '8px'
                        }}>
                          {entry.email}
                        </div>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          marginBottom: '8px',
                          padding: '4px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          wordBreak: 'break-all',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {visiblePasswords.has(entry.entry_id) ? entry.password : '••••••••'}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <button 
                            onClick={() => copyToClipboard(entry.password, 'Password')}
                            style={{
                              background: '#7d8d86',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3e3f29'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#7d8d86'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <i className="fa-solid fa-copy" style={{ marginRight: '4px' }}></i>
                            Copy
                          </button>
                          <button 
                            onClick={() => copyToClipboard(entry.email, 'Email')}
                            style={{
                              background: '#7d8d86',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3e3f29'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#7d8d86'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <i className="fa-solid fa-envelope" style={{ marginRight: '4px' }}></i>
                            Copy Email
                          </button>
                          <button 
                            onClick={() => togglePasswordVisibility(entry.entry_id)}
                            style={{
                              background: visiblePasswords.has(entry.entry_id) ? '#3e3f29' : '#7d8d86',
                              border: 'none',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = visiblePasswords.has(entry.entry_id) ? '#7d8d86' : '#3e3f29'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = visiblePasswords.has(entry.entry_id) ? '#3e3f29' : '#7d8d86'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <i className={`fa-solid ${visiblePasswords.has(entry.entry_id) ? 'fa-eye-slash' : 'fa-eye'}`} style={{ marginRight: '4px' }}></i>
                            {visiblePasswords.has(entry.entry_id) ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px'
                  }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', marginBottom: '8px', display: 'block', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                    No passwords saved yet
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
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
            zIndex: 2000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(125, 141, 134, 0.2)',
              boxShadow: '0 20px 40px rgba(62, 63, 41, 0.15)',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              color: '#3e3f29'
            }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '15px'
              }}>
                Delete Password?
              </h3>
              <p style={{
                color: '#7d8d86',
                fontSize: '16px',
                marginBottom: '25px',
                lineHeight: '1.5'
              }}>
                Are you sure you want to delete this password? This action cannot be undone.
              </p>
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid rgba(125, 141, 134, 0.3)',
                    borderRadius: '25px',
                    background: 'transparent',
                    color: '#7d8d86',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(125, 141, 134, 0.1)'
                    e.currentTarget.style.borderColor = '#7d8d86'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(125, 141, 134, 0.3)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEntry(showDeleteConfirm)}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '25px',
                    background: '#dc3545',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#c82333'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#dc3545'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIN Management Modal */}
        {showPinManagement && (
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
            zIndex: 2000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '30px',
              border: '1px solid rgba(125, 141, 134, 0.2)',
              boxShadow: '0 20px 40px rgba(62, 63, 41, 0.15)',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              color: '#3e3f29'
            }}>
              <h3 style={{
                color: '#3e3f29',
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                <i className="fa-solid fa-key" style={{ color: '#dc3545' }}></i>
                Manage System PIN
              </h3>
              
              <p style={{
                color: '#7d8d86',
                fontSize: '16px',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                Change the system access PIN. This PIN is required to access the POS system.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#3e3f29',
                    marginBottom: '8px',
                    textAlign: 'left'
                  }}>
                    New PIN (minimum 4 digits)
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter new PIN"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid rgba(125, 141, 134, 0.3)',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#3e3f29',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'monospace',
                      letterSpacing: '2px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#dc3545'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(125, 141, 134, 0.3)'
                    }}
                    maxLength={10}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#3e3f29',
                    marginBottom: '8px',
                    textAlign: 'left'
                  }}>
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm new PIN"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid rgba(125, 141, 134, 0.3)',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#3e3f29',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: 'monospace',
                      letterSpacing: '2px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#dc3545'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(125, 141, 134, 0.3)'
                    }}
                    maxLength={10}
                  />
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowPinManagement(false)}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid rgba(125, 141, 134, 0.3)',
                    borderRadius: '25px',
                    background: 'transparent',
                    color: '#7d8d86',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(125, 141, 134, 0.1)'
                    e.currentTarget.style.borderColor = '#7d8d86'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(125, 141, 134, 0.3)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateVaultPin}
                  disabled={isUpdatingPin || newPin.length < 4 || newPin !== confirmPin}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '25px',
                    background: (isUpdatingPin || newPin.length < 4 || newPin !== confirmPin) 
                      ? 'rgba(220, 53, 69, 0.3)' 
                      : '#dc3545',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (isUpdatingPin || newPin.length < 4 || newPin !== confirmPin) 
                      ? 'not-allowed' 
                      : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdatingPin && newPin.length >= 4 && newPin === confirmPin) {
                      e.currentTarget.style.background = '#c82333'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = (isUpdatingPin || newPin.length < 4 || newPin !== confirmPin) 
                      ? 'rgba(220, 53, 69, 0.3)' 
                      : '#dc3545'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {isUpdatingPin ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i>
                      Update PIN
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vault Reports Modal */}
        <VaultReports 
          isOpen={showReports}
          onClose={() => setShowReports(false)}
          vaultEntries={vaultEntries}
          businessId={user?.business_id || undefined}
        />
    </>
  )
}

export default VaultModal
