import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hashPassword } from '../utils/auth'

interface BusinessInfo {
  name: string
  businessType: string
  description: string
  address: string
  phoneNumber: string
  email: string
  website: string
  vatNumber: string
  businessHours: string
  currency: string
  timezone: string
  logoFile?: File
}

interface UserInfo {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phoneNumber: string
}

interface ProfessionalSignupFormProps {
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

const ProfessionalSignupForm: React.FC<ProfessionalSignupFormProps> = ({ onSuccess, onError }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  })

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    businessType: 'Retail Store',
    description: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    vatNumber: '',
    businessHours: '9:00 AM - 6:00 PM',
    currency: 'USD',
    timezone: 'UTC'
  })

  const businessTypes = [
    'Retail Store',
    'Restaurant',
    'Service Business',
    'E-commerce',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Other'
  ]

  const currencies = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL'
  ]

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'
  ]

  const handleUserInfoChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        onError('Logo file size must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        onError('Please upload an image file')
        return
      }

      setBusinessInfo(prev => ({ ...prev, logoFile: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateStep1 = (): boolean => {
    if (!userInfo.firstName.trim()) {
      onError('First name is required')
      return false
    }
    if (!userInfo.lastName.trim()) {
      onError('Last name is required')
      return false
    }
    if (!userInfo.email.trim()) {
      onError('Email is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInfo.email)) {
      onError('Please enter a valid email address')
      return false
    }
    if (!userInfo.password) {
      onError('Password is required')
      return false
    }
    if (userInfo.password.length < 8) {
      onError('Password must be at least 8 characters long')
      return false
    }
    if (userInfo.password !== userInfo.confirmPassword) {
      onError('Passwords do not match')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!businessInfo.name.trim()) {
      onError('Business name is required')
      return false
    }
    if (!businessInfo.address.trim()) {
      onError('Business address is required')
      return false
    }
    if (!businessInfo.phoneNumber.trim()) {
      onError('Business phone number is required')
      return false
    }
    return true
  }

  const uploadLogo = async (businessId: number): Promise<string | null> => {
    if (!businessInfo.logoFile) return null

    try {
      const fileExt = businessInfo.logoFile.name.split('.').pop()
      const fileName = `business-${businessId}-logo.${fileExt}`
      const filePath = `business-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, businessInfo.logoFile)

      if (uploadError) {
        console.error('Error uploading logo:', uploadError)
        return null
      }

      const { data } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      return null
    }
  }

  const generateVerificationToken = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  const sendVerificationEmail = async (email: string, token: string, businessName: string) => {
    // In a real implementation, you would integrate with an email service
    // For now, we'll just log the verification link
    const verificationLink = `${window.location.origin}/verify-email?token=${token}`
    console.log('Verification email would be sent to:', email)
    console.log('Verification link:', verificationLink)
    
    // You can integrate with services like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Resend
    // - Or use Supabase's built-in email service
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      return
    }

    setIsSubmitting(true)
    onError('')

    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', userInfo.email)
        .single()

      if (existingUser) {
        onError('An account with this email already exists')
        setIsSubmitting(false)
        return
      }

      // Create business first
      const { data: businessData, error: businessError } = await supabase
        .from('business_info')
        .insert({
          name: businessInfo.name,
          business_type: businessInfo.businessType,
          description: businessInfo.description || null,
          address: businessInfo.address,
          phone_number: businessInfo.phoneNumber,
          vat_number: businessInfo.vatNumber || null,
          website: businessInfo.website || null,
          business_hours: businessInfo.businessHours,
          currency: businessInfo.currency,
          timezone: businessInfo.timezone,
          receipt_footer: 'Thank you for your business!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('business_id')
        .single()

      if (businessError || !businessData) {
        console.error('Error creating business:', businessError)
        onError('Failed to create business. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Upload logo if provided
      let logoUrl = null
      if (businessInfo.logoFile) {
        logoUrl = await uploadLogo(businessData.business_id)
        if (logoUrl) {
          // Update business with logo URL
          await supabase
            .from('business_info')
            .update({ logo_url: logoUrl })
            .eq('business_id', businessData.business_id)
        }
      }

      // Generate verification token
      const verificationToken = generateVerificationToken()
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user account (not verified yet)
      const hashedPassword = hashPassword(userInfo.password)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: userInfo.email, // Use email as username
          email: userInfo.email,
          password_hash: hashedPassword,
          role: 'Owner',
          active: false, // Not active until email is verified
          business_id: businessData.business_id,
          email_verified: false,
          email_verification_token: verificationToken,
          verification_token_expires: tokenExpires.toISOString(),
          created_at: new Date().toISOString()
        })
        .select('user_id')
        .single()

      if (userError || !userData) {
        console.error('Error creating user:', userError)
        onError('Failed to create user account. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Store verification token
      await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: userData.user_id,
          token: verificationToken,
          expires_at: tokenExpires.toISOString()
        })

      // Send verification email
      await sendVerificationEmail(userInfo.email, verificationToken, businessInfo.name)

      onSuccess(`Registration successful! Please check your email (${userInfo.email}) to verify your account and complete the setup.`)

    } catch (error) {
      console.error('Registration error:', error)
      onError('Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ color: '#1a1a1a', marginBottom: '10px' }}>Create Your Business Account</h2>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Step {currentStep} of 2: {currentStep === 1 ? 'Personal Information' : 'Business Information'}
        </p>
      </div>

      {currentStep === 1 && (
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a1a1a' }}>Personal Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                First Name *
              </label>
              <input
                type="text"
                value={userInfo.firstName}
                onChange={(e) => handleUserInfoChange('firstName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Last Name *
              </label>
              <input
                type="text"
                value={userInfo.lastName}
                onChange={(e) => handleUserInfoChange('lastName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => handleUserInfoChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter your email address"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={userInfo.phoneNumber}
              onChange={(e) => handleUserInfoChange('phoneNumber', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter your phone number"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Password *
              </label>
              <input
                type="password"
                value={userInfo.password}
                onChange={(e) => handleUserInfoChange('password', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Create a password"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={userInfo.confirmPassword}
                onChange={(e) => handleUserInfoChange('confirmPassword', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <button
            onClick={nextStep}
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Continue to Business Information
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a1a1a' }}>Business Information</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Business Name *
            </label>
            <input
              type="text"
              value={businessInfo.name}
              onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter your business name"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Business Type *
              </label>
              <select
                value={businessInfo.businessType}
                onChange={(e) => handleBusinessInfoChange('businessType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Currency
              </label>
              <select
                value={businessInfo.currency}
                onChange={(e) => handleBusinessInfoChange('currency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Business Description
            </label>
            <textarea
              value={businessInfo.description}
              onChange={(e) => handleBusinessInfoChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Describe your business"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Business Address *
            </label>
            <textarea
              value={businessInfo.address}
              onChange={(e) => handleBusinessInfoChange('address', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Enter your business address"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={businessInfo.phoneNumber}
                onChange={(e) => handleBusinessInfoChange('phoneNumber', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Business phone number"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Website
              </label>
              <input
                type="url"
                value={businessInfo.website}
                onChange={(e) => handleBusinessInfoChange('website', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                VAT/Tax Number
              </label>
              <input
                type="text"
                value={businessInfo.vatNumber}
                onChange={(e) => handleBusinessInfoChange('vatNumber', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="VAT or tax identification number"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
                Business Hours
              </label>
              <input
                type="text"
                value={businessInfo.businessHours}
                onChange={(e) => handleBusinessInfoChange('businessHours', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="e.g., 9:00 AM - 6:00 PM"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1a1a1a' }}>
              Business Logo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}
                />
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Upload a logo for your business (optional, max 5MB)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={prevStep}
              style={{
                flex: 1,
                background: '#f3f4f6',
                color: '#1a1a1a',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                flex: 2,
                background: isSubmitting ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Business Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfessionalSignupForm
