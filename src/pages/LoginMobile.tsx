import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import styles from './LoginMobile.module.css';

const LoginMobile: React.FC = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateLoginForm()) {
      setIsSubmitting(true);
      
      const result = await login(formData.email, formData.password);
      if (result.success) {
        if (formData.email === 'lateefsanusi67@gmail.com') {
          navigate('/verification-admin');
        } else {
          if (isMobile || isTablet) {
            navigate('/select-user-mobile');
          } else {
            navigate('/select-user');
          }
        }
      } else {
        let message = result.message;

        if (!message) {
          if (result.needsEmailVerification) {
            const friendlyEmail = formData.email.trim();
            message = result.verificationEmailSent
              ? `Please verify your email before signing in. We just sent a new confirmation link to ${friendlyEmail}.`
              : 'Please verify your email before signing in. Check your inbox (and spam folder) for the confirmation email.';
          } else {
            message = 'Invalid email or password';
          }
        }

        setErrors({ general: message });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <i className="fa-kit fa-test fa-2x" style={{ color: '#1a1a1a' }}></i>
          <span className={styles.logoText}>TillPoint POS</span>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <h2 className={styles.title}>Welcome Back</h2>
            <p className={styles.subtitle}>Sign in to your TillPoint account</p>
          </div>

          <form onSubmit={handleLoginSubmit} className={styles.form}>
            {errors.general && (
              <div className={styles.errorMessage}>
                <i className="fa-solid fa-exclamation-triangle"></i>
                {errors.general}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <div className={styles.inputWithIcon}>
                <Mail size={18} className={styles.inputIcon} />
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
              </div>
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.inputWithIcon}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className={styles.error}>{errors.password}</span>}
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
        </div>
      </div>

      {/* Sign Up Link */}
      <div className={styles.signUpLink}>
        <p>Don't have an account? <Link to="/signup-mobile">Sign up here</Link></p>
      </div>
    </div>
  );
};

export default LoginMobile;
