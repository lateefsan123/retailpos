import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'

interface Customer {
  customer_id: number
  name: string
  phone_number: string
  email?: string
  loyalty_points: number
}

interface CustomerAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelectCustomer?: (customer: Customer | null) => void
  placeholder?: string
  style?: React.CSSProperties
}

const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  onSelectCustomer,
  placeholder = "Enter customer name (optional)",
  style
}) => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Fetch customers when component mounts or business/branch changes
  useEffect(() => {
    if (businessId) {
      fetchCustomers()
    }
  }, [businessId, selectedBranchId])

  // Filter customers based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredCustomers([])
      setShowSuggestions(false)
      onSelectCustomer?.(null)
      return
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(value.toLowerCase()) ||
      customer.phone_number.includes(value)
    )
    setFilteredCustomers(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [value, customers])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCustomers = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      let query = supabase
        .from('customers')
        .select('customer_id, name, phone_number, email, loyalty_points')
        .eq('business_id', businessId)
        .order('name', { ascending: true })

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const handleCustomerSelect = (customer: Customer) => {
    onChange(customer.name)
    onSelectCustomer?.(customer)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filteredCustomers.length > 0) {
            setShowSuggestions(true)
          }
        }}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid #1a1a1a',
          borderRadius: '8px',
          fontSize: '15px',
          background: '#ffffff',
          boxSizing: 'border-box',
          outline: 'none',
          ...style
        }}
      />
      
      {showSuggestions && filteredCustomers.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
        >
          {filteredCustomers.map((customer) => (
            <div
              key={customer.customer_id}
              onClick={() => handleCustomerSelect(customer)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '2px'
                }}>
                  {customer.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {customer.phone_number}
                  {customer.email && ` • ${customer.email}`}
                </div>
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#f59e0b',
                background: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {customer.loyalty_points} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomerAutocomplete
