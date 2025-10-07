import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, User, Briefcase, Mail, Phone, Lock, Building, MapPin, Clock, DollarSign } from 'lucide-react';
import styles from './SignupMobile.module.css';

const SignupMobile: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Account Setup
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2: Business Info
    businessName: '',
    businessType: '',
    businessDescription: '',
    businessAddress: '',
    businessPhone: '',
    currency: 'USD',
    // Step 3: Contact Details
    website: '',
    vatNumber: '',
    openTime: '09:00',
    closeTime: '18:00',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (error) setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        break;
      case 2:
        if (!formData.businessName || !formData.businessType || !formData.businessAddress) {
          setError('Please fill in all required business fields');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!validateStep(2)) {
        setIsSubmitting(false);
        return;
      }

      const username = formData.email.split('@')[0];

      const result = await register(
        username,
        formData.password,
        formData.businessName,
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phone,
        formData.businessType,
        formData.businessDescription,
        formData.businessAddress,
        formData.businessPhone,
        formData.currency,
        formData.website,
        formData.vatNumber,
        formData.openTime,
        formData.closeTime
      );

      if (result.success) {
        if (result.pendingApproval) {
          setCurrentStep(4); // Show success screen
        } else {
          navigate('/login', {
            state: {
              message: 'Account created successfully! Please sign in.',
              email: formData.email
            }
          });
        }
      } else {
        throw new Error('Failed to create account. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>
          <User size={28} />
        </div>
        <h2 className={styles.stepTitle}>Account Setup</h2>
        <p className={styles.stepSubtitle}>Create your personal account</p>
      </div>

      <div className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your first name"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your last name"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Email *</label>
          <div className={styles.inputWithIcon}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Phone (Optional)</label>
          <div className={styles.inputWithIcon}>
            <Phone size={18} className={styles.inputIcon} />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Password *</label>
          <div className={styles.inputWithIcon}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter password"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Confirm Password *</label>
          <div className={styles.inputWithIcon}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Confirm password"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>
          <Briefcase size={28} />
        </div>
        <h2 className={styles.stepTitle}>Business Information</h2>
        <p className={styles.stepSubtitle}>Tell us about your business</p>
      </div>

      <div className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Name *</label>
          <div className={styles.inputWithIcon}>
            <Building size={18} className={styles.inputIcon} />
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Your business name"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Type *</label>
          <select
            name="businessType"
            value={formData.businessType}
            onChange={handleInputChange}
            className={styles.input}
            required
          >
            <option value="">Select type</option>
            <option value="Retail">Retail</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Grocery">Grocery Store</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Salon">Salon/Spa</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Address *</label>
          <div className={styles.inputWithIcon}>
            <MapPin size={18} className={styles.inputIcon} />
            <input
              type="text"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="123 Main St, City, Country"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Business Phone *</label>
          <div className={styles.inputWithIcon}>
            <Phone size={18} className={styles.inputIcon} />
            <input
              type="tel"
              name="businessPhone"
              value={formData.businessPhone}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="+1 (555) 000-0000"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Description (Optional)</label>
          <textarea
            name="businessDescription"
            value={formData.businessDescription}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="Brief description of your business"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>
          <Clock size={28} />
        </div>
        <h2 className={styles.stepTitle}>Additional Details</h2>
        <p className={styles.stepSubtitle}>Business hours and preferences</p>
      </div>

      <div className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Currency *</label>
          <div className={styles.inputWithIcon}>
            <DollarSign size={18} className={styles.inputIcon} />
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className={styles.input}
              required
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="GHS">GHS - Ghanaian Cedi</option>
              <option value="KES">KES - Kenyan Shilling</option>
            </select>
          </div>
        </div>

        <div className={styles.timeRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Opening Time</label>
            <input
              type="time"
              name="openTime"
              value={formData.openTime}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Closing Time</label>
            <input
              type="time"
              name="closeTime"
              value={formData.closeTime}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Website (Optional)</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="https://yourbusiness.com"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>VAT/Tax Number (Optional)</label>
          <input
            type="text"
            name="vatNumber"
            value={formData.vatNumber}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="VAT123456789"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className={styles.successContainer}>
      <div className={styles.successIcon}>
        <i className="fa-solid fa-check"></i>
      </div>
      <h2 className={styles.successTitle}>Registration Submitted!</h2>
      <p className={styles.successText}>
        Your account is now pending admin approval. You will be able to log in once an administrator approves your registration.
      </p>
      <p className={styles.successSubtext}>
        Please check back later or contact support if you have any questions.
      </p>
      <button onClick={() => navigate('/login-mobile')} className={styles.btnPrimary}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={() => currentStep > 1 ? handleBack() : navigate('/login-mobile')}
          className={styles.backBtn}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>
          {currentStep === 4 ? 'Success!' : 'Sign Up'}
        </h1>
        <button onClick={() => navigate('/login-mobile')} className={styles.closeBtn}>
          ×
        </button>
      </div>

      {/* Progress Bar */}
      {currentStep < 4 && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(currentStep / 3) * 100}%` }} />
        </div>
      )}

      {/* Step Indicator */}
      {currentStep < 4 && (
        <div className={styles.stepIndicator}>
          <span className={styles.stepText}>Step {currentStep} of 3</span>
        </div>
      )}

      {/* Form Content */}
      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            <i className="fa-solid fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className={styles.buttonGroup}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={styles.btnSecondary}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Processing...
                  </>
                ) : currentStep === 3 ? (
                  'Create Account'
                ) : (
                  'Next'
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Login Link */}
      {currentStep < 4 && (
        <div className={styles.loginLink}>
          <p>Already have an account? <Link to="/login-mobile">Sign in</Link></p>
        </div>
      )}
    </div>
  );
};

export default SignupMobile;

