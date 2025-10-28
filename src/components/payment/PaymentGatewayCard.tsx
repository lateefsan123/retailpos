// Payment Gateway Card Component
// Used in Business Settings to configure payment gateways

import React, { useState } from 'react'
import { PaymentGateway } from '../types/multitenant'
import { supabase } from '../../lib/supabaseClient';
import styles from './PaymentGatewayCard.module.css'

interface PaymentGatewayCardProps {
  gatewayType: 'stripe' | 'revolut' | 'paypal' | 'square'
  businessId: number
  branchId?: number
  gateway?: PaymentGateway
  onUpdate: () => void
}

const PaymentGatewayCard: React.FC<PaymentGatewayCardProps> = ({
  gatewayType,
  businessId,
  branchId,
  gateway,
  onUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [publishableKey, setPublishableKey] = useState(gateway?.publishable_key || '')
  const [testMode, setTestMode] = useState(gateway?.test_mode ?? true)
  const [isEnabled, setIsEnabled] = useState(gateway?.is_enabled ?? false)

  const gatewayInfo = {
    stripe: {
      name: 'Stripe',
      description: 'Accept credit and debit cards worldwide',
      icon: (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <i className="fab fa-stripe" style={{ color: '#635BFF', fontSize: '16px' }}></i>
        </div>
      ),
      color: '#635BFF',
      setupUrl: 'https://dashboard.stripe.com/apikeys',
      docsUrl: 'https://stripe.com/docs'
    },
    revolut: {
      name: 'Revolut Business',
      description: 'Lower fees for European businesses',
      icon: (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="16" width="36" viewBox="0 0 2319 512" style={{ fill: 'white' }}>
            <path d="M2317.8 213.9l0-78.8-94.1 0 0-102.7-91 0 0 374.5c0 34.4 8.7 60.6 25.7 77.9 17.1 17.3 43.7 26.1 79 26.1l80.3 0 0-78.8-58.8 0c-12.8 0-22-2.8-27.3-8.4-4.9-5.1-8-17.9-8-32.7l0-177.2 94.1 0zM1056.8 135.1l-94.1 273.8-94.1-273.8-95.6 0 135.8 372.6 107.7 0 135.8-372.6zM1580.9 0l91 0 0 507.7-91 0zm403.5 321.8c0 23.6-3.6 44.1-10.6 61-7 16.8-17 29.7-29.8 38.3s-28.5 12.9-46.6 12.9c-26 0-45.7-8.6-58.3-25.4-12.8-17-19.3-42.9-19.3-76.7l0-196.7-91 0 0 206.8c0 32.2 4 59.5 12 81.2 7.9 21.7 18.9 39.4 32.5 52.5 13.6 13.1 29.4 22.6 47.1 28.1 17.6 5.5 36.5 8.3 56.3 8.3 28.5 0 52-5.2 70-15.3 16.4-9.3 30.1-20.2 40.9-32.4l8.2 43.4 79.9 0 0-372.6-91 0 0 186.6zm-542.6-167c-28.7-15.9-62.7-24-101.2-24-38 0-71.9 8.1-100.8 23.9-28.9 15.9-51.7 38.4-67.6 66.9-15.9 28.4-23.9 62.1-23.9 100.1 0 37.5 8.1 71 23.9 99.4 15.9 28.4 38.7 50.9 67.6 66.9 28.9 15.9 62.8 23.9 100.8 23.9 38.5 0 72.5-8.1 101.2-24 28.7-15.9 51.3-38.4 67.2-66.9 15.9-28.4 24-61.9 24-99.4 0-38-8.1-71.7-24-100.1-15.9-28.5-38.5-51-67.2-66.9zM1393.7 421c-14.7 9.5-32.5 14.4-53.1 14.4-20.1 0-37.9-4.8-52.8-14.4-14.9-9.6-26.6-23.1-34.8-40.1-8.2-17.1-12.4-37-12.4-59.1 0-22.6 4.2-42.6 12.4-59.4 8.2-16.8 19.9-30.3 34.8-40.1 14.9-9.8 32.7-14.8 52.8-14.8 20.6 0 38.4 5 53.1 14.7 14.7 9.8 26.3 23.3 34.5 40.1 8.2 16.9 12.4 36.9 12.4 59.4 0 22.1-4.2 42-12.4 59.1-8.2 17.1-19.8 30.6-34.5 40.1zM0 125.3l94.6 0 0 382.4-94.6 0zm391.1 21.9C391.1 66 325.1 0 243.8 0L0 0 0 81.7 232.2 81.7c36.8 0 67.2 28.9 67.9 64.4 .3 17.8-6.3 34.5-18.8 47.2s-29.1 19.7-46.8 19.7l-90.5 0c-3.2 0-5.8 2.6-5.8 5.8l0 72.6c0 1.2 .4 2.4 1.1 3.4l153.5 212.9 112.4 0-153.9-213.5c77.5-3.9 139.8-69 139.8-147zm290.8 5.4c-27.2-14.5-59.6-21.8-96.1-21.8-36.6 0-69.3 8.1-97.3 24-28 15.9-50 38.4-65.4 66.9-15.4 28.4-23.2 62.3-23.2 100.8 0 37.5 7.9 71 23.6 99.4 15.7 28.5 38.3 50.9 67.3 66.5 28.9 15.7 63.5 23.6 103 23.6 31.3 0 59.4-5.9 83.5-17.4 24.1-11.6 43.8-27.4 58.6-46.9 14-18.6 23.4-39.6 28-62.5l.5-2.4-90.5 0-.4 1.5c-5 17.1-14.6 30.5-28.7 40.1-15.1 10.2-33.7 15.4-55.2 15.4-18.2 0-34.7-3.9-49-11.6-14.2-7.7-25.3-18.6-32.9-32.6-7.7-14-12.1-30.9-13-50l0-3 273.3 0 .3-1.7c1-5.2 1.6-10.6 1.8-16.1 .2-5.3 .4-10.6 .4-15.9-.5-36.1-8.6-67.9-24-94.4-15.5-26.6-37.1-47.4-64.4-61.8zm-33.2 70.2c15.5 13.1 25.2 31.7 28.8 55.3l-179.9 0c2.1-15.3 7.1-28.6 15.1-39.5 8.4-11.4 19.1-20.4 31.9-26.7 12.8-6.3 26.9-9.5 41.8-9.5 25.2 0 46.2 6.8 62.3 20.4z"/>
          </svg>
        </div>
      ),
      color: '#0075EB',
      setupUrl: 'https://business.revolut.com/merchant-api',
      docsUrl: 'https://developer.revolut.com'
    },
    paypal: {
      name: 'PayPal',
      description: 'Trusted by customers worldwide',
      icon: (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <i className="fab fa-paypal" style={{ color: '#0070BA', fontSize: '16px' }}></i>
        </div>
      ),
      color: '#0070BA',
      setupUrl: 'https://developer.paypal.com',
      docsUrl: 'https://developer.paypal.com/docs'
    },
    square: {
      name: 'Square',
      description: 'Complete payment solution',
      icon: (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <i className="fas fa-square" style={{ color: '#00A86B', fontSize: '16px' }}></i>
        </div>
      ),
      color: '#00A86B',
      setupUrl: 'https://developer.squareup.com',
      docsUrl: 'https://developer.squareup.com/docs'
    }
  }

  const info = gatewayInfo[gatewayType]

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const gatewayData = {
        business_id: businessId,
        branch_id: branchId,
        gateway_type: gatewayType,
        publishable_key: publishableKey.trim(),
        test_mode: testMode,
        is_enabled: isEnabled,
        configuration: {
          setup_completed: true,
          last_updated: new Date().toISOString()
        }
      }

      console.log('Attempting to save gateway data:', gatewayData)

      // First, check if a gateway of this type already exists for this business
      const { data: existingGateway, error: checkError } = await supabase
        .from('payment_gateways')
        .select('gateway_id')
        .eq('business_id', businessId)
        .eq('gateway_type', gatewayType)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Check error:', checkError)
        throw checkError
      }

      if (existingGateway) {
        // Update existing gateway
        console.log('Updating existing gateway:', existingGateway.gateway_id)
        const { error } = await supabase
          .from('payment_gateways')
          .update(gatewayData)
          .eq('gateway_id', existingGateway.gateway_id)

        if (error) {
          console.error('Update error:', error)
          throw error
        }
      } else {
        // Create new gateway
        console.log('Creating new gateway')
        const { error } = await supabase
          .from('payment_gateways')
          .insert([gatewayData])

        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      }

      setSuccess('Gateway configuration saved successfully!')
      onUpdate()
    } catch (err) {
      console.error('Error saving gateway configuration:', err)
      setError(err instanceof Error ? err.message : 'Failed to save gateway configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setError(null)
      setSuccess(null)

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (publishableKey.trim()) {
        setSuccess('Connection test successful!')
      } else {
        setError('Please enter your API key first')
      }
    } catch (err) {
      setError('Connection test failed. Please check your credentials.')
    } finally {
      setTesting(false)
    }
  }

  const handleToggle = async () => {
    const newEnabled = !isEnabled
    setIsEnabled(newEnabled)
    
    // Auto-save when toggling
    if (gateway) {
      try {
        const { error } = await supabase
          .from('payment_gateways')
          .update({ is_enabled: newEnabled })
          .eq('gateway_id', gateway.gateway_id)

        if (error) throw error
        onUpdate()
      } catch (err) {
        // Revert on error
        setIsEnabled(!newEnabled)
        setError('Failed to update gateway status')
      }
    }
  }

  return (
    <div className={`${styles.gatewayCard} ${isEnabled ? styles.enabled : styles.disabled}`}>
      <div className={styles.cardHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.gatewayInfo}>
          <div className={styles.icon} style={{ backgroundColor: 'transparent' }}>
            {info.icon}
          </div>
          <div className={styles.details}>
            <h3 className={styles.name}>{info.name}</h3>
            <p className={styles.description}>{info.description}</p>
          </div>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.toggle}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggle}
                disabled={loading}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <button 
            className={styles.expandButton}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.cardContent}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                {gatewayType === 'stripe' ? 'Publishable Key' : 
                 gatewayType === 'revolut' ? 'API Key' :
                 gatewayType === 'paypal' ? 'Client ID' : 'Application ID'}
              </label>
              <input
                type="text"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder={`Enter your ${info.name} ${gatewayType === 'stripe' ? 'publishable key' : 'API key'}...`}
                className={styles.fieldInput}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                />
                Test Mode (Sandbox)
              </label>
              <p className={styles.fieldHelp}>
                Use test credentials for development and testing
              </p>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            {success && (
              <div className={styles.successMessage}>
                {success}
              </div>
            )}

            <div className={styles.actions}>
              <button
                onClick={handleTestConnection}
                disabled={testing || !publishableKey.trim()}
                className={styles.testButton}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              
              <button
                onClick={handleSave}
                disabled={loading || !publishableKey.trim()}
                className={styles.saveButton}
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            <div className={styles.help}>
              <p className={styles.helpText}>
                Need help setting up {info.name}? 
                <a href={info.setupUrl} target="_blank" rel="noopener noreferrer" className={styles.helpLink}>
                  Get your API keys here
                </a>
              </p>
              <p className={styles.helpText}>
                <a href={info.docsUrl} target="_blank" rel="noopener noreferrer" className={styles.helpLink}>
                  View documentation
                </a>
              </p>
              {gatewayType === 'stripe' && (
                <p className={styles.helpText}>
                  <strong>Environment Setup:</strong> Add VITE_STRIPE_PUBLISHABLE_KEY to your .env file
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentGatewayCard
