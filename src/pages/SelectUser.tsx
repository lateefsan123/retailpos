import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface User {
  user_id: number;
  username: string;
  role: string;
  active: boolean;
  icon?: string;
  business_id: number;
  last_used?: string;
  pin?: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
  address: string;
  phone: string;
  manager_id?: number;
  shop_image: string;
  business_id: number;
  active: boolean;
  created_at: string;
}


const SelectUser: React.FC = () => {
  const navigate = useNavigate();
  const { user, switchUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showPasswordView, setShowPasswordView] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [usePinAuth, setUsePinAuth] = useState(false);

  useEffect(() => {
    if (user?.business_id) {
      fetchUsers();
      fetchBranches();
    }
  }, [user?.business_id]);

  useEffect(() => {
    // Show PIN prompt on component mount if user has a PIN
    if (user?.pin && !pinVerified) {
      setShowPinPrompt(true);
    }
  }, [user?.pin, pinVerified]);

  const fetchUsers = async () => {
    if (!user?.business_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users') // if your table is shop_staff, change this to 'shop_staff'
        .select('*')
        .eq('business_id', user.business_id)
        .eq('active', true)
        .order('user_id', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!user?.business_id) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', user.business_id)
        .eq('active', true)
        .order('branch_id', { ascending: false });

      if (error) {
        console.error('Error fetching branches:', error);
        return;
      }

      setBranches(data || []);
      // Show branch selection if multiple branches exist
      if (data && data.length > 1) {
        setShowBranchSelection(true);
      } else if (data && data.length === 1) {
        setSelectedBranch(data[0]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleUserSelect = (u: User) => {
    setSelectedUser(u);
    setShowPasswordView(true);
    setPassword('');
    setPasswordError('');
    setUsePinAuth(false);
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowBranchSelection(false);
  };

  const handleNextBranch = () => {
    setSlideDirection('right');
    setCurrentBranchIndex((prev) => (prev + 1) % branches.length);
  };

  const handlePrevBranch = () => {
    setSlideDirection('left');
    setCurrentBranchIndex((prev) => (prev - 1 + branches.length) % branches.length);
  };

  const handleSelectCurrentBranch = () => {
    if (branches[currentBranchIndex]) {
      handleBranchSelect(branches[currentBranchIndex]);
    }
  };


  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password || !selectedBranch) return;

    setIsAuthenticating(true);
    setPasswordError('');

    try {
      const success = await switchUser(selectedUser.user_id, password, usePinAuth);

      if (success) {
        // Store selected branch in localStorage
        localStorage.setItem('selected_branch_id', selectedBranch.branch_id.toString());
        localStorage.setItem('selected_branch_name', selectedBranch.branch_name);
        navigate('/dashboard');
      } else {
        throw new Error(usePinAuth ? 'Invalid PIN' : 'Invalid password');
      }
    } catch (error) {
      console.log('Password error:', error);
      setPasswordError(usePinAuth ? 'Invalid PIN. Please try again.' : 'Invalid password. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBackToUsers = () => {
    setShowPasswordView(false);
    setSelectedUser(null);
    setPassword('');
    setPasswordError('');
    setIsAuthenticating(false);
    setUsePinAuth(false);
    
    // If there are multiple branches, go back to branch selection
    if (branches.length > 1) {
      setShowBranchSelection(true);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '#dc2626';
      case 'owner':
        return '#7c3aed';
      case 'manager':
        return '#ea580c';
      case 'cashier':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never';
    const date = new Date(lastUsed);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };




  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) {
      setPinError('Please enter your PIN');
      return;
    }

    // Check if the entered PIN matches the current user's PIN
    if (user?.pin && user.pin === pinInput) {
      setShowPinPrompt(false);
      setPinVerified(true);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Invalid PIN. Please try again.');
    }
  };


  return (
    <>
      <style>
        {`
          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateX(50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      <div
        style={{
          position: 'fixed',
          inset: '0',
          backgroundColor: '#0b0d10',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 9999,
        }}
      >
      {/* Outer card to create depth behind the monitor */}
      <div
        style={{
          background: 'transparent',
          width: '100%',
          maxWidth: '1200px',
          padding: '20px',
        }}
      >
        {/* Monitor Bezel */}
        <div
          style={{
            background: '#000000',
            borderRadius: '12px',
            border: '4px solid #4a5568',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            padding: '16px',
          }}
        >
          {/* Screen */}
          <div
            style={{
              background: '#000000',
              borderRadius: '8px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              height: '700px',
            }}
          >

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #4a5568',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#eab308' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#7d8d86' }} />
              </div>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  margin: 0,
                }}
              >
                {showBranchSelection ? 'Select Branch' : 'Select User'}
              </h2>
              <button
                onClick={() => {
                  if (showPasswordView) {
                    handleBackToUsers();
                  } else if (showBranchSelection) {
                    navigate('/login');
                  } else {
                    navigate('/login');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease',
                  fontSize: '32px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div>
              {showPinPrompt ? (
                <div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      padding: 24,
                      marginBottom: 24,
                      textAlign: 'center',
                    }}
                  >
                  <div style={{ marginBottom: 16 }}>
                      <i className="fa-solid fa-lock" style={{ fontSize: '48px', color: '#7d8d86', marginBottom: '16px' }} />
                      <h3 style={{ color: '#ffffff', fontSize: '24px', margin: '0 0 8px 0' }}>
                        PIN Required
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0 }}>
                        Enter your PIN to access the user system
                      </p>
                    </div>

                    <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: '300px', margin: '0 auto' }}>
                      <div>
                        <input
                          type="password"
                          value={pinInput}
                          onChange={(e) => {
                            setPinInput(e.target.value);
                            if (pinError) setPinError('');
                          }}
                          style={{
                            width: '200px',
                            padding: 12,
                            background: '#1a202c',
                            border: '1px solid #4a5568',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 18,
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            letterSpacing: '2px',
                          }}
                          placeholder="Enter PIN"
                          maxLength={6}
                          required
                          autoFocus
                        />
                        {pinError && (
                          <div
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              padding: '8px 12px',
                              marginTop: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <i className="fa-solid fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: 14 }} />
                            <p style={{ fontSize: 14, color: '#dc2626', margin: 0, fontWeight: 500 }}>{pinError}</p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/login');
                          }}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#4a5568',
                            border: '1px solid #4a5568',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 18,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#6b7280';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#4a5568';
                          }}
                        >
                          Back to Login
                        </button>

                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#7d8d86',
                            border: '2px solid #7d8d86',
                            borderRadius: 8,
                            color: '#000000',
                            fontSize: 18,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#3e3f29';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#3e3f29';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#7d8d86';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#7d8d86';
                          }}
                        >
                          Verify PIN
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : showPasswordView ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '100%',
                  backgroundImage: 'url(images/mcbackground3.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#0b0d10', // fallback color
                  position: 'relative'
                }}>
                  {/* Dark overlay for better contrast */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.4)',
                    pointerEvents: 'none'
                  }} />
                  {/* Center: Password Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flex: 1,
                    gap: '32px',
                    padding: '40px 0',
                    position: 'relative',
                    zIndex: 1
                  }}>
                  {/* User Avatar */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      border: '3px solid rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(15px)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                        {selectedUser?.icon ? (
                          <img 
                            src={`/retailpos/images/icons/${selectedUser.icon}.png`} 
                            alt={selectedUser.icon}
                            style={{
                            width: '120px',
                            height: '120px',
                              objectFit: 'cover',
                              borderRadius: '50%'
                            }}
                          />
                        ) : (
                        <svg
                          viewBox="0 0 24 24"
                          style={{
                            width: '80px',
                            height: '80px',
                            color: 'rgba(255,255,255,0.85)'
                          }}
                          fill="currentColor"
                        >
                          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                        </svg>
                        )}
                      </div>
                  </div>

                  {/* Username */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#ffffff', 
                      fontSize: '32px', 
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                    }}>
                      {selectedUser?.username}
                    </div>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontSize: '16px',
                      marginTop: '8px',
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                    }}>
                      {selectedUser?.role}
                    </div>
                    
                  </div>

                  {/* Windows-style Password Form */}
                  <form onSubmit={handlePasswordSubmit} style={{ width: '100%', maxWidth: '400px' }}>
                    {/* Authentication Method Toggle */}
                    {selectedUser?.pin && (
                      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '4px',
                          backdropFilter: 'blur(10px)'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setUsePinAuth(false)
                              setPassword('')
                              setPasswordError('')
                            }}
                            style={{
                              padding: '8px 16px',
                              background: usePinAuth ? 'transparent' : 'rgba(255,255,255,0.2)',
                              border: 'none',
                              borderRadius: '6px',
                              color: usePinAuth ? 'rgba(255,255,255,0.7)' : '#ffffff',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUsePinAuth(true)
                              setPassword('')
                              setPasswordError('')
                            }}
                            style={{
                              padding: '8px 16px',
                              background: usePinAuth ? 'rgba(255,255,255,0.2)' : 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: usePinAuth ? '#ffffff' : 'rgba(255,255,255,0.7)',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            PIN
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Windows-style Password Input */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder={usePinAuth ? "Enter PIN" : "Password"}
                        maxLength={usePinAuth ? 6 : undefined}
                        required
                        autoFocus
                        style={{
                          width: '100%',
                          height: '48px',
                          borderRadius: '24px',
                          paddingLeft: '20px',
                          paddingRight: '56px',
                          color: '#ffffff',
                          fontSize: '16px',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(15px)',
                          border: '2px solid rgba(255,255,255,0.4)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                          outline: 'none',
                          textAlign: usePinAuth ? 'center' : 'left',
                          letterSpacing: usePinAuth ? '2px' : 'normal',
                          boxSizing: 'border-box',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}
                        onFocus={(e) => {
                          e.target.style.border = '2px solid rgba(255,255,255,0.8)';
                          e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.border = '2px solid rgba(255,255,255,0.4)';
                          e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isAuthenticating}
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '4px',
                          height: '40px',
                          width: '40px',
                          borderRadius: '50%',
                          background: isAuthenticating ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.95)',
                          border: '2px solid rgba(255,255,255,0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                          opacity: isAuthenticating ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isAuthenticating) {
                            e.currentTarget.style.background = '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isAuthenticating) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                          }
                        }}
                      >
                        {isAuthenticating ? (
                          <i className="fa-solid fa-spinner fa-spin" style={{ color: '#0f2d6e', fontSize: '16px' }} />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: '20px',
                              height: '20px',
                              color: '#0f2d6e'
                            }}
                            fill="currentColor"
                          >
                            <path d="M13 5l7 7-7 7v-4H4v-6h9V5z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Error Message */}
                      {passwordError && (
                        <div
                          style={{
                          background: 'rgba(220, 38, 38, 0.1)',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                          gap: '8px',
                          backdropFilter: 'blur(10px)'
                          }}
                        >
                        <i className="fa-solid fa-exclamation-triangle" style={{ color: '#fca5a5', fontSize: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }} />
                        <p style={{ fontSize: '14px', color: '#fca5a5', margin: 0, fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{passwordError}</p>
                        </div>
                      )}

                    {/* Helper Text */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: '12px'
                    }}>
                      <button
                        type="button"
                        onClick={handleBackToUsers}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          transition: 'color 0.2s ease',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                        }}
                      >
                        ← Back to users
                      </button>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#ffffff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                      }}>
                        Press Enter to sign in
                      </div>
                    </div>
                  </form>
                  </div>

                  {/* Bottom: User Switcher Panel */}
                  <div style={{
                    padding: '24px',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxWidth: '300px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}>
                      {users
                        .filter(u => u.user_id !== selectedUser?.user_id) // Exclude current selected user
                        .map((u) => (
                          <button
                            key={u.user_id}
                            onClick={() => {
                              setSelectedUser(u);
                              setPassword('');
                              setPasswordError('');
                              setUsePinAuth(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              backdropFilter: 'blur(10px)',
                              color: 'rgba(255,255,255,0.9)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: '140px',
                              fontSize: '13px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                            }}
                          >
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.15)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              {u.icon ? (
                                <img 
                                  src={`/retailpos/images/icons/${u.icon}.png`} 
                                  alt={u.icon}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                  }}
                                />
                              ) : (
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>○</div>
                              )}
                            </div>
                            <span style={{ 
                              fontWeight: '400',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                            }}>
                              {u.username}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Very Bottom: System Icons */}
                  <div style={{
                    position: 'absolute',
                    right: '24px',
                    bottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    color: 'rgba(255,255,255,0.8)',
                    zIndex: 1
                  }}>
                    <button
                      title="Accessibility"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: 'rgba(255,255,255,0.9)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="currentColor">
                        <path d="M11 2h2v4h-2zM4 9h16v2H4zM6 12l4 .5V22H8v-7.5L6 14v-2zm12 0v2l-2 .5V22h-2v-9.5l4-.5z" />
                      </svg>
                    </button>
                      <button
                        onClick={() => navigate('/login')}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          backdropFilter: 'blur(10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: 'rgba(255,255,255,0.9)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#991b1b';
                          e.currentTarget.style.border = '1px solid #991b1b';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.3)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                        }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }} fill="currentColor">
                        <path d="M11 2h2v10h-2z" />
                        <path d="M7.05 4.05a8.5 8.5 0 1 0 9.9 0l-1.41 1.41a6.5 6.5 0 1 1-7.08 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 40,
                    color: '#9ca3af',
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 12, fontSize: '24px' }} />
                  <span style={{ fontSize: '18px' }}>Loading users...</span>
                </div>
              ) : showBranchSelection ? (
                /* Branch Selection Screen */
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  gap: '32px',
                  padding: '40px 20px'
                }}>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: '600',
                    textAlign: 'center',
                    marginBottom: '24px'
                  }}>
                    Choose Your Branch
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '40px',
                    maxWidth: '800px',
                    width: '100%',
                    margin: '0 auto'
                  }}>
                    {/* Left Arrow */}
                    <button
                      onClick={handlePrevBranch}
                      style={{
                        background: 'rgba(26, 26, 26, 0.3)',
                        border: '1px solid #4a5568',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.2)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 26, 26, 0.3)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a5568';
                      }}
                    >
                      <i className='fa-solid fa-chevron-left' style={{ fontSize: '24px' }}></i>
                    </button>

                    {/* Current Branch Card */}
                    {branches[currentBranchIndex] && (
                      <div
                        key={branches[currentBranchIndex].branch_id}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          minHeight: '300px',
                          width: '280px',
                          animation: slideDirection === 'right' ? 'slideInFromRight 0.3s ease-in-out' : 
                                   slideDirection === 'left' ? 'slideInFromLeft 0.3s ease-in-out' : 
                                   'none'
                        }}
                        onClick={handleSelectCurrentBranch}
                      >
                        <div 
                          style={{
                            width: '200px',
                            height: '200px',
                            backgroundImage: `url(images/shop/${branches[currentBranchIndex].shop_image}.png)`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundColor: 'white',
                            borderRadius: '20px',
                            transition: 'all 0.3s ease-in-out'
                          }}
                        />
                        <div style={{
                          color: '#ffffff',
                          fontSize: '16px',
                          fontWeight: '500',
                          textAlign: 'center',
                          transition: 'all 0.3s ease-in-out',
                          marginTop: '8px'
                        }}>
                          {branches[currentBranchIndex].branch_name}
                        </div>
                      </div>
                    )}

                    {/* Right Arrow */}
                    <button
                      onClick={handleNextBranch}
                      style={{
                        background: 'rgba(26, 26, 26, 0.3)',
                        border: '1px solid #4a5568',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.2)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 26, 26, 0.3)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a5568';
                      }}
                    >
                      <i className='fa-solid fa-chevron-right' style={{ fontSize: '24px' }}></i>
                    </button>
                  </div>
                  
                  {/* Branch Counter */}
                  <div style={{
                    color: '#9ca3af',
                    fontSize: '16px',
                    textAlign: 'center',
                    marginTop: '24px'
                  }}>
                    {currentBranchIndex + 1} of {branches.length}
                  </div>
                </div>
              ) : (
                /* User Selection Screen */
                <div>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                  }}>
                    {users.map((u) => (
                      <button
                        key={u.user_id}
                        style={{
                          background: 'rgba(26, 26, 26, 0.3)',
                          border: '1px solid #4a5568',
                          borderBottom: '3px solid #7d8d86',
                          borderRadius: '8px',
                          padding: 24,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'left',
                          position: 'relative',
                          minHeight: '160px',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(125,141,134,0.1)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#7d8d86';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow =
                            '0 0 20px rgba(125,141,134,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 26, 26, 0.3)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a5568';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                        }}
                        onClick={() => handleUserSelect(u)}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#1a202c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              border: '2px solid #4a5568'
                            }}>
                              {u.icon ? (
                                <img 
                                  src={`/retailpos/images/icons/${u.icon}.png`} 
                                  alt={u.icon}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                  }}
                                />
                              ) : (
                                <div style={{ fontSize: 24, color: '#4a5568' }}>○</div>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: 24, fontWeight: 500, color: '#ffffff' }}>{u.username}</span>
                                {u.pin && (
                                  <div style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    PIN
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            <div>
                              <span style={{ 
                                background: `${getRoleColor(u.role)}20`,
                                color: getRoleColor(u.role),
                                padding: '6px 16px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '500',
                                textTransform: 'capitalize',
                                display: 'inline-block'
                              }}>
                                {u.role}
                              </span>
                            </div>
                            <div style={{ fontSize: 14, color: '#9ca3af', lineHeight: '1.4' }}>
                              Last login: {formatLastUsed(u.last_used)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monitor Stand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          {/* Stand Neck */}
          <div
            style={{
              width: 60,
              height: 60,
              background: 'linear-gradient(145deg, #4a5568, #2d3748)',
              borderRadius: '0 0 15px 15px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
              border: '2px solid #4a5568',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          {/* Stand Base */}
          <div
            style={{
              width: 300,
              height: 30,
              background: 'linear-gradient(145deg, #2d3748, #1a202c)',
              borderRadius: 50,
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              border: '1px solid #4a5568',
            }}
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default SelectUser;
