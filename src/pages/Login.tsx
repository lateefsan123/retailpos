import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isMobile, isTablet } = useDeviceDetection();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  useEffect(() => {
    if (location.state && typeof location.state === 'object') {
      const { message, email: prefillEmail } = location.state as { message?: string; email?: string };

      if (message) {
        setErrors({ general: message });
      }

      if (prefillEmail) {
        setFormData(prev => ({
          ...prev,
          email: prefillEmail,
        }));
      }

      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

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

  const validateLoginForm = () => {
    let isValid = true;
    const newErrors: any = {};

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
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateResetForm = () => {
    let isValid = true;
    const newErrors: any = {};

    if (!formData.email.trim()) {
      newErrors.resetEmail = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.resetEmail = 'Please enter a valid email address';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      hideError(name);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Check for Caps Lock
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Check for Caps Lock on key up as well
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateLoginForm()) {
      setIsSubmitting(true);
      
      try {
        // Use full login functionality
        const result = await login(formData.email, formData.password);
        if (result.success) {
          // Redirect to appropriate select user page based on device
          if (isMobile || isTablet) {
            navigate('/select-user-mobile');
          } else {
            navigate('/select-user');
          }
        } else {
          // Provide more specific error messages
          if (result.error && result.error.includes('Invalid email or password')) {
            setErrors({ password: 'Incorrect password. Please check your password and try again.' });
          } else if (result.error && result.error.includes('pending approval')) {
            setErrors({ general: result.error });
          } else {
            setErrors({ general: result.error || 'Invalid email or password' });
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrors({ general: 'An error occurred during login. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateResetForm()) {
      setIsSubmitting(true);
      
      // Simulate password reset
      setTimeout(() => {
        setIsSubmitting(false);
        setShowResetSuccess(true);
      }, 2000);
    }
  };

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowForgotPassword(true);
    setErrors({});
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setShowResetSuccess(false);
    setShowSuccess(false);
    setErrors({});
    setFormData(prev => ({ ...prev, password: '' }));
  };


  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <i className={`fa-kit fa-test ${styles.faLogo}`}></i>
              <span className={styles.logoText}>TillPoint POS</span>
            </div>
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
            {/* Login Form */}
            {!showForgotPassword && !showSuccess && !showResetSuccess && (
              <>
                {/* Header */}
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Welcome Back</h2>
                  <p className={styles.formSubtitle}>Sign in to your TillPoint account</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className={styles.form}>
                  {errors.general && (
                    <div className={styles.errorMessage}>
                      {errors.general}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className={styles.label}>Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                      placeholder="Enter your email"
                    />
                    {errors.email && <span className={styles.error}>{errors.email}</span>}
                  </div>

                  <div>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <div className={styles.passwordContainer}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onKeyUp={handleKeyUp}
                        required
                        className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                        placeholder="Enter your password"
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
                    {capsLockOn && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#92400e'
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }}></i>
                        Caps Lock is ON
                      </div>
                    )}
                  </div>

                  <div className={styles.formOptions}>
                    <div className={styles.rememberMe}>
                      <input
                        id="remember-me"
                        name="rememberMe"
                        type="checkbox"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className={styles.checkbox}
                      />
                      <label htmlFor="remember-me" className={styles.checkboxLabel}>
                        Remember me
                      </label>
                    </div>

                    <div className={styles.forgotPassword}>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className={styles.forgotPasswordLink}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </div>

                  <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                </form>


                {/* Sign Up Link */}
                <div className={styles.signUpLink}>
                  <p>Don't have an account? <Link to="/signup" className={styles.signUpText}>Sign up here</Link></p>
                </div>
              </>
            )}

            {/* Forgot Password Form */}
            {showForgotPassword && !showResetSuccess && (
              <form onSubmit={handleResetSubmit} className={styles.form}>
                <div className={styles.formHeader}>
                  <h3 className={styles.formTitle}>Reset Password</h3>
                  <p className={styles.formSubtitle}>Enter your email address and we'll send you a link to reset your password</p>
                </div>

                <div>
                  <label htmlFor="reset-email" className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    id="reset-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`${styles.input} ${errors.resetEmail ? styles.inputError : ''}`}
                    placeholder="Enter your email"
                  />
                  {errors.resetEmail && <span className={styles.error}>{errors.resetEmail}</span>}
                </div>

                <div className={styles.buttonGroup}>
                  <button type="button" onClick={handleBackToLogin} className={styles.backButton}>
                    Back to Sign In
                  </button>
                  <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Login Success */}
            {showSuccess && (
              <div className={styles.successMessage}>
                <div className={styles.successIcon}>
                  <i className="fas fa-check"></i>
                </div>
                <h3 className={styles.successTitle}>Welcome Back!</h3>
                <p className={styles.successText}>You have successfully signed in to your account.</p>
                <button onClick={() => navigate('/select-user')} className={styles.submitButton}>
                  Go to Staff Login
                </button>
              </div>
            )}

            {/* Reset Success */}
            {showResetSuccess && (
              <div className={styles.successMessage}>
                <div className={styles.successIcon}>
                  <i className="fas fa-envelope"></i>
                </div>
                <h3 className={styles.successTitle}>Reset Link Sent!</h3>
                <p className={styles.successText}>
                  We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                </p>
                <button onClick={handleBackToLogin} className={styles.submitButton}>
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Image */}
        <div className={styles.imageContainer}>
        </div>
      </div>
    </div>
  );
};

export default Login;
