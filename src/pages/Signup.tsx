import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { hashPassword } from '../utils/auth';
import styles from './Signup.module.css';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<any>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: '',
    businessDescription: '',
    businessAddress: '',
    businessPhone: '',
    currency: 'USD',
    website: '',
    vatNumber: '',
    businessHours: '9:00 AM - 6:00 PM',
    businessLogo: null as File | null,
    userId: null as number | null
  });
  const [errors, setErrors] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const showError = (fieldId: string, message: string) => {
    setErrors((prev: any) => ({
      ...prev,
      [fieldId]: message
    }));
  };

  const hideError = (fieldId: string) => {
    setErrors((prev: any) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  const validateStep1 = () => {
    let isValid = true;
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateStep2 = () => {
    let isValid = true;
    const newErrors: any = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
      isValid = false;
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Please select a business type';
      isValid = false;
    }

    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = 'Business address is required';
      isValid = false;
    }

    if (!formData.businessPhone.trim()) {
      newErrors.businessPhone = 'Business phone is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      hideError(name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        businessLogo: file
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep1Data(formData);
      setCurrentStep(2);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setIsSubmitting(true);
      
      try {
        console.log('Creating business with data:', {
          name: formData.businessName,
          address: formData.businessAddress,
          phone_number: formData.businessPhone,
          vat_number: formData.vatNumber,
          receipt_footer: 'Thank you for shopping with us!'
        });

        // Check if business name already exists
        const { data: existingBusiness, error: businessCheckError } = await supabase
          .from('business_info')
          .select('business_id')
          .eq('name', formData.businessName)
          .single();

        if (existingBusiness) {
          throw new Error('A business with this name already exists. Please choose a different business name.');
        }

        // Create business first
        const businessResponse = await supabase
          .from('business_info')
          .insert({
            name: formData.businessName,
            business_name: formData.businessName,
            business_type: formData.businessType,
            description: formData.businessDescription,
            address: formData.businessAddress,
            phone_number: formData.businessPhone,
            vat_number: formData.vatNumber,
            website: formData.website,
            business_hours: formData.businessHours,
            currency: formData.currency,
            receipt_footer: 'Thank you for shopping with us!'
          })
          .select()
          .single();

        if (businessResponse.error) {
          console.error('Business creation error:', businessResponse.error);
          throw new Error(businessResponse.error.message);
        }

        const businessId = businessResponse.data.business_id;

        // Upload logo if provided
        let logoUrl = null;
        if (formData.businessLogo) {
          const fileExt = formData.businessLogo.name.split('.').pop();
          const fileName = `business-logos/${businessId}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, formData.businessLogo);

          if (uploadError) {
            console.warn('Logo upload failed:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('products')
              .getPublicUrl(fileName);
            logoUrl = publicUrl;

            // Update business with logo URL
            await supabase
              .from('business_info')
              .update({ logo_url: logoUrl })
              .eq('business_id', businessId);
          }
        }

        // Create user
        const userResponse = await supabase
          .from('users')
          .insert({
            username: formData.email, // Using email as username
            password_hash: hashPassword(formData.password),
            role: 'Admin',
            active: true,
            business_id: businessId,
            icon: 'lily'
          })
          .select()
          .single();

        if (userResponse.error) {
          throw new Error(userResponse.error.message);
        }

        const userId = userResponse.data.user_id;

        // Create default staff account for the business
        await supabase
          .from('users')
          .insert({
            username: 'admin',
            password_hash: hashPassword('admin123'),
            role: 'Admin',
            active: true,
            business_id: businessId,
            icon: 'ryu'
          });

        // Send verification email (optional)
        try {
          await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                business_id: businessId
              }
            }
          });
        } catch (authError) {
          console.warn('Auth signup failed:', authError);
          // Continue anyway since we created the user in our custom table
        }

        setIsSubmitting(false);
        setShowSuccess(true);
        
        // Store user ID for display in success message
        setFormData(prev => ({ ...prev, userId: userId }));
      } catch (error) {
        console.error('Signup error:', error);
        setIsSubmitting(false);
        setErrors({ general: error instanceof Error ? error.message : 'Failed to create account' });
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setErrors({});
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const handleConfirmPasswordToggle = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.logo}>TillPoint</h1>
          </div>
          <div className={styles.headerRight}>
            <a href="/" className={styles.backLink}>← Back to Home</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Side - Form */}
        <div className={styles.formContainer}>
          <div className={styles.formWrapper}>
            {/* Progress Indicator */}
            <div className={styles.progressSection}>
              <div className={styles.progressIndicator}>
                <div className={`${styles.stepIndicator} ${currentStep >= 1 ? styles.active : ''}`}>
                  {currentStep > 1 ? <i className="fas fa-check"></i> : '1'}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: currentStep === 1 ? '50%' : '100%' }}
                  ></div>
                </div>
                <div className={`${styles.stepIndicator} ${currentStep >= 2 ? styles.active : ''}`}>
                  {currentStep > 2 ? <i className="fas fa-check"></i> : '2'}
                </div>
              </div>
              <h2 className={styles.stepTitle}>
                {currentStep === 1 ? 'Personal Information' : 'Business Information'}
              </h2>
              <p className={styles.stepSubtitle}>
                {currentStep === 1 
                  ? "Step 1 of 2 - Let's start with your details" 
                  : "Step 2 of 2 - Tell us about your business"}
              </p>
            </div>

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div>
                    <label htmlFor="firstName" className={styles.label}>First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    />
                    {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    />
                    {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  />
                  {errors.email && <span className={styles.error}>{errors.email}</span>}
                </div>

                <div>
                  <label htmlFor="phone" className={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>

                <div>
                  <label htmlFor="password" className={styles.label}>Password *</label>
                  <div className={styles.passwordContainer}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={8}
                      className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    />
                    <button
                      type="button"
                      onClick={handlePasswordToggle}
                      className={styles.passwordToggle}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.password && <span className={styles.error}>{errors.password}</span>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={styles.label}>Confirm Password *</label>
                  <div className={styles.passwordContainer}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                    />
                    <button
                      type="button"
                      onClick={handleConfirmPasswordToggle}
                      className={styles.passwordToggle}
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className={styles.submitButton}>
                  Continue to Business Information
                </button>

                <div className={styles.loginLink}>
                  Already have an account? 
                  <a href="/retailpos/staff-login" className={styles.link}>Sign In</a>
                </div>
              </form>
            )}

            {/* Step 2: Business Information */}
            {currentStep === 2 && !showSuccess && (
              <form onSubmit={handleStep2Submit} className={styles.form}>
                {errors.general && (
                  <div className={styles.errorMessage}>
                    {errors.general}
                  </div>
                )}
                <div>
                  <label htmlFor="businessName" className={styles.label}>Business Name *</label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                    className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
                  />
                  {errors.businessName && <span className={styles.error}>{errors.businessName}</span>}
                </div>

                <div>
                  <label htmlFor="businessType" className={styles.label}>Business Type *</label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    required
                    className={`${styles.input} ${errors.businessType ? styles.inputError : ''}`}
                  >
                    <option value="">Select business type</option>
                    <option value="retail">Retail Store</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="service">Service Business</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.businessType && <span className={styles.error}>{errors.businessType}</span>}
                </div>

                <div>
                  <label htmlFor="businessDescription" className={styles.label}>Business Description</label>
                  <textarea
                    id="businessDescription"
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleInputChange}
                    rows={3}
                    className={styles.input}
                    placeholder="Brief description of your business..."
                  />
                </div>

                <div>
                  <label htmlFor="businessAddress" className={styles.label}>Business Address *</label>
                  <textarea
                    id="businessAddress"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className={`${styles.input} ${errors.businessAddress ? styles.inputError : ''}`}
                    placeholder="Street address, city, state, postal code"
                  />
                  {errors.businessAddress && <span className={styles.error}>{errors.businessAddress}</span>}
                </div>

                <div className={styles.formGrid}>
                  <div>
                    <label htmlFor="businessPhone" className={styles.label}>Business Phone *</label>
                    <input
                      type="tel"
                      id="businessPhone"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleInputChange}
                      required
                      className={`${styles.input} ${errors.businessPhone ? styles.inputError : ''}`}
                    />
                    {errors.businessPhone && <span className={styles.error}>{errors.businessPhone}</span>}
                  </div>
                  <div>
                    <label htmlFor="currency" className={styles.label}>Currency *</label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      required
                      className={styles.input}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="CHF">CHF - Swiss Franc</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="BRL">BRL - Brazilian Real</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div>
                    <label htmlFor="website" className={styles.label}>Website</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="vatNumber" className={styles.label}>VAT/Tax Number</label>
                    <input
                      type="text"
                      id="vatNumber"
                      name="vatNumber"
                      value={formData.vatNumber}
                      onChange={handleInputChange}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessHours" className={styles.label}>Business Hours</label>
                  <input
                    type="text"
                    id="businessHours"
                    name="businessHours"
                    value={formData.businessHours}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>

                <div>
                  <label htmlFor="businessLogo" className={styles.label}>Business Logo</label>
                  <div className={styles.fileUpload}>
                    <div className={styles.fileUploadContent}>
                      <i className="fas fa-cloud-upload-alt"></i>
                      <div className={styles.fileUploadText}>
                        <label htmlFor="businessLogo" className={styles.fileUploadLabel}>
                          Upload a file
                        </label>
                        <span>or drag and drop</span>
                      </div>
                      <p className={styles.fileUploadHint}>PNG, JPG, GIF up to 5MB</p>
                    </div>
                    <input
                      id="businessLogo"
                      name="businessLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                    />
                  </div>
                  {logoPreview && (
                    <div className={styles.logoPreview}>
                      <img src={logoPreview} alt="Logo preview" className={styles.logoImage} />
                    </div>
                  )}
                </div>

                <div className={styles.buttonGroup}>
                  <button type="button" onClick={handleBack} className={styles.backButton}>
                    Back
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Success Message */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <div className={styles.successIcon}>
                  <i className="fas fa-check"></i>
                </div>
                <h3 className={styles.successTitle}>Account Created Successfully!</h3>
                <p className={styles.successText}>
                  We've sent a verification email to your address. Please check your inbox and click the verification link to activate your account.
                </p>
                
                {formData.userId && (
                  <div className={styles.adminInfo}>
                    <div className={styles.adminCard}>
                      <h4 className={styles.adminTitle}>Your Admin Number</h4>
                      <div className={styles.adminNumber}>{formData.userId}</div>
                      <p className={styles.adminNote}>
                        Save this number! You'll need it to access the POS system as staff.
                      </p>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className={styles.submitButton}
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Image */}
        <div className={styles.imageContainer}>
          <div className={styles.imageOverlay}></div>
          <div className={styles.imageContent}>
            <div className={styles.imageText}>
              <div className={styles.imageIcon}>
                <i className="fas fa-store"></i>
              </div>
              <h2 className={styles.imageTitle}>Welcome to TillPoint</h2>
              <p className={styles.imageSubtitle}>
                Join thousands of businesses streamlining their operations with our modern POS system.
              </p>
                
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
