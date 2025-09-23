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

const SelectUser: React.FC = () => {
  const navigate = useNavigate();
  const { user, switchUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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

  const handleUserSelect = (u: User) => {
    setSelectedUser(u);
    setShowPasswordView(true);
    setPassword('');
    setPasswordError('');
    setUsePinAuth(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password) return;

    setIsAuthenticating(true);
    setPasswordError('');

    try {
      const success = await switchUser(selectedUser.user_id, password, usePinAuth);

      if (success) {
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
                Select User
              </h2>
              <button
                onClick={() => {
                  if (showPasswordView) {
                    handleBackToUsers();
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
                <div>

                  {/* Selected user info */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        {selectedUser?.icon ? (
                          <img 
                            src={`/retailpos/images/icons/${selectedUser.icon}.png`} 
                            alt={selectedUser.icon}
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
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '24px' }}>
                          {selectedUser?.username}
                        </div>
                        <div style={{ fontSize: '16px' }}>
                          <span style={{ 
                            background: `${getRoleColor(selectedUser?.role || '')}20`,
                            color: getRoleColor(selectedUser?.role || ''),
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {selectedUser?.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password form */}
                  <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Authentication Method Toggle */}
                    {selectedUser?.pin && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '4px'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setUsePinAuth(false)
                              setPassword('')
                              setPasswordError('')
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: usePinAuth ? 'transparent' : 'rgba(255,255,255,0.2)',
                              border: 'none',
                              borderRadius: '6px',
                              color: usePinAuth ? '#9ca3af' : '#ffffff',
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
                              flex: 1,
                              padding: '8px 12px',
                              background: usePinAuth ? 'rgba(255,255,255,0.2)' : 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: usePinAuth ? '#ffffff' : '#9ca3af',
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

                    <div>
                      <label style={{ color: '#ffffff', marginBottom: 8, display: 'block', fontSize: '20px' }}>
                        {usePinAuth ? 'Enter PIN:' : 'Enter password:'}
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        style={{
                          width: '400px',
                          padding: 12,
                          background: '#1a202c',
                          border: '1px solid #4a5568',
                          borderRadius: 8,
                          color: '#ffffff',
                          fontSize: 18,
                          boxSizing: 'border-box',
                          textAlign: usePinAuth ? 'center' : 'left',
                          letterSpacing: usePinAuth ? '2px' : 'normal'
                        }}
                        placeholder={usePinAuth ? "Enter PIN" : "Enter your password"}
                        maxLength={usePinAuth ? 6 : undefined}
                        required
                        autoFocus
                      />
                      {passwordError && (
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
                          <p style={{ fontSize: 14, color: '#dc2626', margin: 0, fontWeight: 500 }}>{passwordError}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, paddingTop: 16 }}>
                      <button
                        type="button"
                        onClick={handleBackToUsers}
                        style={{
                          width: '120px',
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
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={isAuthenticating}
                        style={{
                          width: '150px',
                          padding: '12px 16px',
                          background: isAuthenticating ? '#6b7280' : '#7d8d86',
                          border: '2px solid #7d8d86',
                          borderRadius: 8,
                          color: isAuthenticating ? '#9ca3af' : '#000000',
                          fontSize: 18,
                          fontWeight: 'bold',
                          cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: isAuthenticating ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!isAuthenticating) {
                            (e.currentTarget as HTMLButtonElement).style.background = '#3e3f29';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#3e3f29';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isAuthenticating) {
                            (e.currentTarget as HTMLButtonElement).style.background = '#7d8d86';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#7d8d86';
                          }
                        }}
                      >
                        {isAuthenticating ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                            Authenticating...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </button>
                    </div>
                  </form>
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
              ) : (
                <div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
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
                          width: '100%',
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
  );
};

export default SelectUser;
