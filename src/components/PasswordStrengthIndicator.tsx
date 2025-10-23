import React from 'react';
import { validatePassword } from '../utils/auth';

interface PasswordStrengthIndicatorProps {
  password: string;
  showValidation?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showValidation = true 
}) => {
  const validation = validatePassword(password);
  
  if (!showValidation || !password) {
    return null;
  }

  const getStrengthColor = () => {
    if (validation.isValid) return '#10b981'; // green
    if (password.length >= 6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStrengthText = () => {
    if (validation.isValid) return 'Strong';
    if (password.length >= 6) return 'Medium';
    return 'Weak';
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Password Strength Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          flex: 1,
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: validation.isValid ? '100%' : password.length >= 6 ? '60%' : '30%',
            backgroundColor: getStrengthColor(),
            transition: 'all 0.3s ease'
          }} />
        </div>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '500',
          color: getStrengthColor()
        }}>
          {getStrengthText()}
        </span>
      </div>

      {/* Validation Requirements */}
      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        <div style={{ marginBottom: '4px', fontWeight: '500' }}>Password must contain:</div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '2px',
          fontSize: '11px'
        }}>
          <div style={{ 
            color: password.length >= 8 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{password.length >= 8 ? '✓' : '✗'}</span>
            At least 8 characters
          </div>
          <div style={{ 
            color: /[a-z]/.test(password) ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{/[a-z]/.test(password) ? '✓' : '✗'}</span>
            One lowercase letter
          </div>
          <div style={{ 
            color: /[A-Z]/.test(password) ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{/[A-Z]/.test(password) ? '✓' : '✗'}</span>
            One uppercase letter
          </div>
          <div style={{ 
            color: /\d/.test(password) ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{/\d/.test(password) ? '✓' : '✗'}</span>
            One number
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
