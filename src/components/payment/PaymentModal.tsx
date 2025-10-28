// Payment Modal Component
// Main payment interface for click & collect orders

import React, { useState, useEffect } from 'react'
import { PaymentGateway, PaymentIntent, PaymentResult } from '../../types/multitenant'
import { usePaymentGateways, usePaymentIntent, usePaymentProcessing, useOrderCalculation } from '../../hooks/usePaymentGateways'
import StripeCheckout from './StripeCheckout'
import styles from './PaymentModal.module.css'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderItems: any[]
  customerId: number
  businessId: number
  branchId?: number
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderItems,
  customerId,
  businessId,
  branchId
}) => {
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [step, setStep] = useState<'gateway' | 'payment' | 'success' | 'error'>('gateway')

  const { gateways, loading: gatewaysLoading } = usePaymentGateways(businessId)
  const { createPaymentIntent, loading: intentLoading } = usePaymentIntent()
  const { processPayment, processing } = usePaymentProcessing()
  const { total, formattedTotal, itemCount } = useOrderCalculation(orderItems)

  useEffect(() => {
    if (isOpen) {
      setStep('gateway')
      setSelectedGateway(null)
      setPaymentIntent(null)
    }
  }, [isOpen])

  const handleGatewaySelect = async (gatewayType: string) => {
    try {
      setSelectedGateway(gatewayType)
      
      const intent: PaymentIntent = {
        amount: total,
        currency: 'EUR',
        customer_id: customerId,
        order_items: orderItems.map(item => item.list_item_id),
        gateway_type: gatewayType,
        business_id: businessId,
        branch_id: branchId
      }

      const result = await createPaymentIntent(intent)
      if (result) {
        setPaymentIntent(intent)
        setStep('payment')
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      setStep('error')
    }
  }

  const handlePaymentSuccess = async (result: PaymentResult) => {
    if (result.success && paymentIntent) {
      const success = await processPayment(
        paymentIntent.gateway_type,
        result.payment_intent_id || '',
        paymentIntent.amount,
        customerId,
        businessId
      )

      if (success) {
        setStep('success')
      } else {
        setStep('error')
      }
    } else {
      setStep('error')
    }
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error)
    setStep('error')
  }

  const handleClose = () => {
    setStep('gateway')
    setSelectedGateway(null)
    setPaymentIntent(null)
    onClose()
  }

  const handleRetry = () => {
    setStep('gateway')
    setSelectedGateway(null)
    setPaymentIntent(null)
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Complete Your Click & Collect Order</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.modalContent}>
          {step === 'gateway' && (
            <div className={styles.gatewaySelection}>
              <div className={styles.orderSummary}>
                <h3 className={styles.summaryTitle}>Order Summary</h3>
                <div className={styles.summaryItems}>
                  {orderItems.map((item, index) => (
                    <div key={index} className={styles.summaryItem}>
                      <span className={styles.itemName}>
                        {item.products?.name || item.text}
                        {item.quantity > 1 && ` x${item.quantity}`}
                      </span>
                      <span className={styles.itemPrice}>
                        €{((item.calculated_price || item.products?.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.summaryTotal}>
                  <span>Total ({itemCount} items):</span>
                  <span className={styles.totalAmount}>{formattedTotal}</span>
                </div>
              </div>

              <div className={styles.paymentMethods}>
                <h3 className={styles.methodsTitle}>Choose Payment Method</h3>
                
                {gatewaysLoading ? (
                  <div className={styles.loading}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading payment methods...</p>
                  </div>
                ) : gateways.length === 0 ? (
                  <div className={styles.noMethods}>
                    <div className={styles.noMethodsIcon}>💳</div>
                    <p>No payment methods available</p>
                    <p className={styles.noMethodsSubtext}>
                      Please contact the store to enable online payments
                    </p>
                  </div>
                ) : (
                  <div className={styles.gatewayList}>
                    {gateways.map((gateway) => (
                      <button
                        key={gateway.gateway_id}
                        onClick={() => handleGatewaySelect(gateway.gateway_type)}
                        className={styles.gatewayButton}
                        disabled={intentLoading}
                      >
                        <div className={styles.gatewayInfo}>
                        <div className={`${styles.gatewayIcon} ${styles[gateway.gateway_type]}`}>
                          {gateway.gateway_type === 'stripe' && <i className="fab fa-stripe"></i>}
                          {gateway.gateway_type === 'revolut' && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2319 512" style={{ width: '20px', height: '20px', fill: 'currentColor' }}>
                              <path d="M2317.8 213.9l0-78.8-94.1 0 0-102.7-91 0 0 374.5c0 34.4 8.7 60.6 25.7 77.9 17.1 17.3 43.7 26.1 79 26.1l80.3 0 0-78.8-58.8 0c-12.8 0-22-2.8-27.3-8.4-4.9-5.1-8-17.9-8-32.7l0-177.2 94.1 0zM1056.8 135.1l-94.1 273.8-94.1-273.8-95.6 0 135.8 372.6 107.7 0 135.8-372.6zM1580.9 0l91 0 0 507.7-91 0zm403.5 321.8c0 23.6-3.6 44.1-10.6 61-7 16.8-17 29.7-29.8 38.3s-28.5 12.9-46.6 12.9c-26 0-45.7-8.6-58.3-25.4-12.8-17-19.3-42.9-19.3-76.7l0-196.7-91 0 0 206.8c0 32.2 4 59.5 12 81.2 7.9 21.7 18.9 39.4 32.5 52.5 13.6 13.1 29.4 22.6 47.1 28.1 17.6 5.5 36.5 8.3 56.3 8.3 28.5 0 52-5.2 70-15.3 16.4-9.3 30.1-20.2 40.9-32.4l8.2 43.4 79.9 0 0-372.6-91 0 0 186.6zm-542.6-167c-28.7-15.9-62.7-24-101.2-24-38 0-71.9 8.1-100.8 23.9-28.9 15.9-51.7 38.4-67.6 66.9-15.9 28.4-23.9 62.1-23.9 100.1 0 37.5 8.1 71 23.9 99.4 15.9 28.4 38.7 50.9 67.6 66.9 28.9 15.9 62.8 23.9 100.8 23.9 38.5 0 72.5-8.1 101.2-24 28.7-15.9 51.3-38.4 67.2-66.9 15.9-28.4 24-61.9 24-99.4 0-38-8.1-71.7-24-100.1-15.9-28.5-38.5-51-67.2-66.9zM1393.7 421c-14.7 9.5-32.5 14.4-53.1 14.4-20.1 0-37.9-4.8-52.8-14.4-14.9-9.6-26.6-23.1-34.8-40.1-8.2-17.1-12.4-37-12.4-59.1 0-22.6 4.2-42.6 12.4-59.4 8.2-16.8 19.9-30.3 34.8-40.1 14.9-9.8 32.7-14.8 52.8-14.8 20.6 0 38.4 5 53.1 14.7 14.7 9.8 26.3 23.3 34.5 40.1 8.2 16.9 12.4 36.9 12.4 59.4 0 22.1-4.2 42-12.4 59.1-8.2 17.1-19.8 30.6-34.5 40.1zM0 125.3l94.6 0 0 382.4-94.6 0zm391.1 21.9C391.1 66 325.1 0 243.8 0L0 0 0 81.7 232.2 81.7c36.8 0 67.2 28.9 67.9 64.4 .3 17.8-6.3 34.5-18.8 47.2s-29.1 19.7-46.8 19.7l-90.5 0c-3.2 0-5.8 2.6-5.8 5.8l0 72.6c0 1.2 .4 2.4 1.1 3.4l153.5 212.9 112.4 0-153.9-213.5c77.5-3.9 139.8-69 139.8-147zm290.8 5.4c-27.2-14.5-59.6-21.8-96.1-21.8-36.6 0-69.3 8.1-97.3 24-28 15.9-50 38.4-65.4 66.9-15.4 28.4-23.2 62.3-23.2 100.8 0 37.5 7.9 71 23.6 99.4 15.7 28.5 38.3 50.9 67.3 66.5 28.9 15.7 63.5 23.6 103 23.6 31.3 0 59.4-5.9 83.5-17.4 24.1-11.6 43.8-27.4 58.6-46.9 14-18.6 23.4-39.6 28-62.5l.5-2.4-90.5 0-.4 1.5c-5 17.1-14.6 30.5-28.7 40.1-15.1 10.2-33.7 15.4-55.2 15.4-18.2 0-34.7-3.9-49-11.6-14.2-7.7-25.3-18.6-32.9-32.6-7.7-14-12.1-30.9-13-50l0-3 273.3 0 .3-1.7c1-5.2 1.6-10.6 1.8-16.1 .2-5.3 .4-10.6 .4-15.9-.5-36.1-8.6-67.9-24-94.4-15.5-26.6-37.1-47.4-64.4-61.8zm-33.2 70.2c15.5 13.1 25.2 31.7 28.8 55.3l-179.9 0c2.1-15.3 7.1-28.6 15.1-39.5 8.4-11.4 19.1-20.4 31.9-26.7 12.8-6.3 26.9-9.5 41.8-9.5 25.2 0 46.2 6.8 62.3 20.4z"/>
                            </svg>
                          )}
                          {gateway.gateway_type === 'paypal' && <i className="fab fa-paypal"></i>}
                          {gateway.gateway_type === 'square' && <i className="fas fa-square"></i>}
                        </div>
                          <div className={styles.gatewayDetails}>
                            <span className={styles.gatewayName}>
                              {gateway.gateway_type === 'stripe' && 'Stripe'}
                              {gateway.gateway_type === 'revolut' && 'Revolut'}
                              {gateway.gateway_type === 'paypal' && 'PayPal'}
                              {gateway.gateway_type === 'square' && 'Square'}
                            </span>
                            <span className={styles.gatewayDescription}>
                              {gateway.gateway_type === 'stripe' && 'Credit & Debit Cards'}
                              {gateway.gateway_type === 'revolut' && 'Lower fees for Europe'}
                              {gateway.gateway_type === 'paypal' && 'PayPal & Credit Cards'}
                              {gateway.gateway_type === 'square' && 'Complete payment solution'}
                            </span>
                          </div>
                        </div>
                        <div className={styles.gatewayArrow}>→</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'payment' && paymentIntent && (
            <div className={styles.paymentStep}>
              {selectedGateway === 'stripe' && (
                <StripeCheckout
                  paymentIntent={paymentIntent}
                  amount={total}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={() => setStep('gateway')}
                />
              )}
              
              {selectedGateway === 'revolut' && (
                <div className={styles.comingSoon}>
                  <div className={styles.comingSoonIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2319 512" style={{ width: '48px', height: '48px', fill: 'currentColor' }}>
                      <path d="M2317.8 213.9l0-78.8-94.1 0 0-102.7-91 0 0 374.5c0 34.4 8.7 60.6 25.7 77.9 17.1 17.3 43.7 26.1 79 26.1l80.3 0 0-78.8-58.8 0c-12.8 0-22-2.8-27.3-8.4-4.9-5.1-8-17.9-8-32.7l0-177.2 94.1 0zM1056.8 135.1l-94.1 273.8-94.1-273.8-95.6 0 135.8 372.6 107.7 0 135.8-372.6zM1580.9 0l91 0 0 507.7-91 0zm403.5 321.8c0 23.6-3.6 44.1-10.6 61-7 16.8-17 29.7-29.8 38.3s-28.5 12.9-46.6 12.9c-26 0-45.7-8.6-58.3-25.4-12.8-17-19.3-42.9-19.3-76.7l0-196.7-91 0 0 206.8c0 32.2 4 59.5 12 81.2 7.9 21.7 18.9 39.4 32.5 52.5 13.6 13.1 29.4 22.6 47.1 28.1 17.6 5.5 36.5 8.3 56.3 8.3 28.5 0 52-5.2 70-15.3 16.4-9.3 30.1-20.2 40.9-32.4l8.2 43.4 79.9 0 0-372.6-91 0 0 186.6zm-542.6-167c-28.7-15.9-62.7-24-101.2-24-38 0-71.9 8.1-100.8 23.9-28.9 15.9-51.7 38.4-67.6 66.9-15.9 28.4-23.9 62.1-23.9 100.1 0 37.5 8.1 71 23.9 99.4 15.9 28.4 38.7 50.9 67.6 66.9 28.9 15.9 62.8 23.9 100.8 23.9 38.5 0 72.5-8.1 101.2-24 28.7-15.9 51.3-38.4 67.2-66.9 15.9-28.4 24-61.9 24-99.4 0-38-8.1-71.7-24-100.1-15.9-28.5-38.5-51-67.2-66.9zM1393.7 421c-14.7 9.5-32.5 14.4-53.1 14.4-20.1 0-37.9-4.8-52.8-14.4-14.9-9.6-26.6-23.1-34.8-40.1-8.2-17.1-12.4-37-12.4-59.1 0-22.6 4.2-42.6 12.4-59.4 8.2-16.8 19.9-30.3 34.8-40.1 14.9-9.8 32.7-14.8 52.8-14.8 20.6 0 38.4 5 53.1 14.7 14.7 9.8 26.3 23.3 34.5 40.1 8.2 16.9 12.4 36.9 12.4 59.4 0 22.1-4.2 42-12.4 59.1-8.2 17.1-19.8 30.6-34.5 40.1zM0 125.3l94.6 0 0 382.4-94.6 0zm391.1 21.9C391.1 66 325.1 0 243.8 0L0 0 0 81.7 232.2 81.7c36.8 0 67.2 28.9 67.9 64.4 .3 17.8-6.3 34.5-18.8 47.2s-29.1 19.7-46.8 19.7l-90.5 0c-3.2 0-5.8 2.6-5.8 5.8l0 72.6c0 1.2 .4 2.4 1.1 3.4l153.5 212.9 112.4 0-153.9-213.5c77.5-3.9 139.8-69 139.8-147zm290.8 5.4c-27.2-14.5-59.6-21.8-96.1-21.8-36.6 0-69.3 8.1-97.3 24-28 15.9-50 38.4-65.4 66.9-15.4 28.4-23.2 62.3-23.2 100.8 0 37.5 7.9 71 23.6 99.4 15.7 28.5 38.3 50.9 67.3 66.5 28.9 15.7 63.5 23.6 103 23.6 31.3 0 59.4-5.9 83.5-17.4 24.1-11.6 43.8-27.4 58.6-46.9 14-18.6 23.4-39.6 28-62.5l.5-2.4-90.5 0-.4 1.5c-5 17.1-14.6 30.5-28.7 40.1-15.1 10.2-33.7 15.4-55.2 15.4-18.2 0-34.7-3.9-49-11.6-14.2-7.7-25.3-18.6-32.9-32.6-7.7-14-12.1-30.9-13-50l0-3 273.3 0 .3-1.7c1-5.2 1.6-10.6 1.8-16.1 .2-5.3 .4-10.6 .4-15.9-.5-36.1-8.6-67.9-24-94.4-15.5-26.6-37.1-47.4-64.4-61.8zm-33.2 70.2c15.5 13.1 25.2 31.7 28.8 55.3l-179.9 0c2.1-15.3 7.1-28.6 15.1-39.5 8.4-11.4 19.1-20.4 31.9-26.7 12.8-6.3 26.9-9.5 41.8-9.5 25.2 0 46.2 6.8 62.3 20.4z"/>
                    </svg>
                  </div>
                  <h3>Revolut Payment</h3>
                  <p>Revolut integration coming soon!</p>
                  <button onClick={() => setStep('gateway')} className={styles.backButton}>
                    Choose Different Method
                  </button>
                </div>
              )}
              
              {selectedGateway === 'paypal' && (
                <div className={styles.comingSoon}>
                  <div className={styles.comingSoonIcon}>
                    <i className="fab fa-paypal"></i>
                  </div>
                  <h3>PayPal Payment</h3>
                  <p>PayPal integration coming soon!</p>
                  <button onClick={() => setStep('gateway')} className={styles.backButton}>
                    Choose Different Method
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className={styles.successStep}>
              <div className={styles.successIcon}>✅</div>
              <h3 className={styles.successTitle}>Click & Collect Order Confirmed!</h3>
              <p className={styles.successMessage}>
                Your click & collect order has been placed and payment has been processed.
                You will receive a confirmation email shortly. Please visit the store to collect your items.
              </p>
              <div className={styles.successDetails}>
                <p>Order total: {formattedTotal}</p>
                <p>Payment method: {selectedGateway}</p>
              </div>
              <button onClick={handleClose} className={styles.successButton}>
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className={styles.errorStep}>
              <div className={styles.errorIcon}>❌</div>
              <h3 className={styles.errorTitle}>Payment Failed</h3>
              <p className={styles.errorMessage}>
                There was an error processing your payment. Please try again or contact support.
              </p>
              <div className={styles.errorActions}>
                <button onClick={handleRetry} className={styles.retryButton}>
                  Try Again
                </button>
                <button onClick={handleClose} className={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentModal
