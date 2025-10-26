import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './SelectUserMobile.module.css';

interface User {
  user_id: number;
  username: string;
  role: string;
  active: boolean;
  icon?: string;
  business_id: number | null;
  last_used?: string;
  pin?: string;
  branch_id?: number;
  branch_name?: string;
  branch_display_name?: string;
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
  display_name?: string;
  display_label?: string;
}

const GENERIC_BRANCH_NAMES = new Set(['branch', 'main branch']);

const buildBranchDisplayName = (
  branch?: { branch_name?: string | null; display_name?: string | null; address?: string | null },
  fallbackIndex?: number
) => {
  if (!branch) {
    return typeof fallbackIndex === 'number' ? `Branch ${fallbackIndex + 1}` : 'Branch';
  }

  const addressLine = branch.address
    ?.split(',')
    .map((part) => part.trim())
    .find(Boolean);

  const displayName = branch.display_name?.trim();
  if (displayName && !GENERIC_BRANCH_NAMES.has(displayName.toLowerCase())) {
    if (addressLine && !displayName.toLowerCase().includes(addressLine.toLowerCase())) {
      return `${displayName} · ${addressLine}`;
    }
    return displayName;
  }

  const rawName = branch.branch_name?.trim();
  if (rawName) {
    const lowerRawName = rawName.toLowerCase();
    if (!GENERIC_BRANCH_NAMES.has(lowerRawName)) {
      if (addressLine && !rawName.toLowerCase().includes(addressLine.toLowerCase())) {
        return `${rawName} · ${addressLine}`;
      }
      return rawName;
    }
  }

  if (addressLine && addressLine.length > 0) {
    const fallbackName =
      rawName && rawName.toLowerCase() === 'main branch'
        ? 'Main Branch'
        : typeof fallbackIndex === 'number'
          ? `Branch ${fallbackIndex + 1}`
          : addressLine;

    if (!fallbackName.toLowerCase().includes(addressLine.toLowerCase())) {
      return `${fallbackName} · ${addressLine}`;
    }
    return fallbackName;
  }

  if (rawName && rawName.length > 0) {
    if (rawName.toLowerCase() === 'main branch' && typeof fallbackIndex === 'number') {
      return `Branch ${fallbackIndex + 1}`;
    }
    return rawName;
  }

  if (typeof fallbackIndex === 'number') {
    return `Branch ${fallbackIndex + 1}`;
  }

  return 'Branch';
};

const getBranchLabel = (branch?: Branch | null) => {
  if (!branch) {
    return 'Branch';
  }

  return branch.display_label || branch.display_name || branch.branch_name || 'Branch';
};

const SelectUserMobile: React.FC = () => {
  const navigate = useNavigate();
  const { user, switchUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchDisplayMap, setBranchDisplayMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // PIN state removed
  const [usePinAuth, setUsePinAuth] = useState(false);

  useEffect(() => {
    if (user?.business_id) {
      fetchUsers();
      fetchBranches();
    }
  }, [user?.business_id]);

  useEffect(() => {
    if (!Object.keys(branchDisplayMap).length) return;

    setUsers((prevUsers) =>
      prevUsers.map((userRecord) => {
        if (!userRecord.branch_id) {
          return userRecord;
        }

        const mappedName = branchDisplayMap[userRecord.branch_id];
        if (!mappedName || userRecord.branch_display_name === mappedName) {
          return userRecord;
        }

        return {
          ...userRecord,
          branch_display_name: mappedName,
        };
      })
    );
  }, [branchDisplayMap]);

  // PIN prompt completely disabled

  const fetchUsers = async () => {
    if (!user?.business_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', user.business_id)
        .eq('active', true)
        .order('user_id', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Get branch information for users
      const usersWithBranches = await Promise.all((data || []).map(async (user) => {
        if (user.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('branch_id, branch_name, address, display_name')
            .eq('branch_id', user.branch_id)
            .single();

          const displayName =
            branchDisplayMap[user.branch_id] ?? buildBranchDisplayName(branchData);

          return {
            ...user,
            branch_name: branchData?.branch_name || 'Branch Not Found',
            branch_display_name: displayName
          };
        }
        
        return {
          ...user,
          branch_name: 'No Branch Assigned',
          branch_display_name: 'No Branch Assigned'
        };
      }));

      setUsers(usersWithBranches);
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

      const totalBranches = data?.length ?? 0;
      const formattedBranches = (data || []).map((branch, index) => {
        const displayLabel = buildBranchDisplayName(
          branch,
          totalBranches > 1 ? index : undefined
        );
        return {
          ...branch,
          display_label: displayLabel,
        };
      });

      setBranches(formattedBranches);

      const displayMap = formattedBranches.reduce<Record<number, string>>((acc, branch) => {
        acc[branch.branch_id] =
          branch.display_label || branch.display_name || branch.branch_name;
        return acc;
      }, {});
      setBranchDisplayMap(displayMap);

      // Show branch selection if multiple branches exist
      if (formattedBranches.length > 1) {
        setShowBranchSelection(true);
        setSelectedBranch(null);
      } else if (formattedBranches.length === 1) {
        setSelectedBranch(formattedBranches[0]);
        setShowBranchSelection(false);
      } else {
        setSelectedBranch(null);
        setShowBranchSelection(false);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleUserSelect = (u: User) => {
    setSelectedUser(u);
    // Skip PIN prompt entirely - go straight to password entry
    setPassword('');
    setPasswordError('');
    setUsePinAuth(false);
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowBranchSelection(false);
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
        localStorage.setItem('selected_branch_display_name', getBranchLabel(selectedBranch));
        navigate('/dashboard-mobile');
      } else {
        // Authentication failed - show error without throwing
        if (usePinAuth) {
          setPasswordError('Incorrect PIN. Please check your PIN and try again.');
        } else {
          setPasswordError('Incorrect password. Please check your password and try again.');
        }
      }
    } catch (error) {
      console.log('Password error:', error);
      // Provide more specific error messages
      if (usePinAuth) {
        setPasswordError('Incorrect PIN. Please check your PIN and try again.');
      } else {
        setPasswordError('Incorrect password. Please check your password and try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBackToUsers = () => {
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // PIN functionality removed

  // PIN functionality removed

  // Branch Selection Screen
  if (showBranchSelection && branches.length > 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Select Branch</h1>
          <button
            onClick={() => navigate('/login-mobile')}
            className={styles.closeBtn}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.branchList}>
          {branches.map((branch) => (
            <button
              key={branch.branch_id}
              onClick={() => handleBranchSelect(branch)}
              className={styles.branchCard}
            >
              <div className={styles.branchImage}>
                <img
                  src={`/images/shop/${branch.shop_image}.png`}
                  alt={getBranchLabel(branch)}
                />
              </div>
              <div className={styles.branchInfo}>
                <h3 className={styles.branchName}>{getBranchLabel(branch)}</h3>
                <p className={styles.branchAddress}>{branch.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Password Entry Screen
  if (selectedUser) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBackToUsers} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1 className={styles.title}>Sign In</h1>
          <button
            onClick={() => navigate('/login-mobile')}
            className={styles.closeBtn}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.passwordContainer}>
          <div className={styles.userAvatar}>
            {selectedUser.icon ? (
              <img
                src={`/images/icons/${selectedUser.icon}.png`}
                alt={selectedUser.username}
              />
            ) : (
              <i className="fa-solid fa-user"></i>
            )}
          </div>

          <h2 className={styles.username}>{selectedUser.username}</h2>
          <p className={styles.userRole}>{selectedUser.role}</p>

          {selectedUser.pin && (
            <div className={styles.authToggle}>
              <button
                type="button"
                onClick={() => {
                  setUsePinAuth(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className={`${styles.toggleBtn} ${!usePinAuth ? styles.active : ''}`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsePinAuth(true);
                  setPassword('');
                  setPasswordError('');
                }}
                className={`${styles.toggleBtn} ${usePinAuth ? styles.active : ''}`}
              >
                PIN
              </button>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
            <div className={styles.inputGroup}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={usePinAuth ? 'Enter PIN' : 'Enter Password'}
                maxLength={usePinAuth ? 6 : undefined}
                required
                autoFocus
                className={styles.passwordInput}
              />
              <button
                type="submit"
                disabled={isAuthenticating}
                className={styles.submitBtn}
              >
                {isAuthenticating ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-arrow-right"></i>
                )}
              </button>
            </div>

            {passwordError && (
              <div className={styles.error}>
                <i className="fa-solid fa-exclamation-triangle"></i>
                {passwordError}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // User Selection Screen (Loading or List)
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Select User</h1>
        <button
          onClick={() => navigate('/login-mobile')}
          className={styles.closeBtn}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className={styles.userList}>
          {users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => handleUserSelect(u)}
              className={styles.userCard}
            >
              <div className={styles.userIcon}>
                {u.icon ? (
                  <img src={`/images/icons/${u.icon}.png`} alt={u.username} />
                ) : (
                  <i className="fa-solid fa-user"></i>
                )}
              </div>

              <div className={styles.userInfo}>
                <div className={styles.userTop}>
                  <h3 className={styles.userName}>{u.username}</h3>
                  {u.pin && <span className={styles.pinBadge}>PIN</span>}
                </div>
                <div className={styles.roleBadge} style={{ backgroundColor: `${getRoleColor(u.role)}20`, color: getRoleColor(u.role) }}>
                  {u.role}
                </div>
                <div className={styles.userBranch}>
                  <i className="fa-solid fa-building"></i>
                  {u.branch_display_name || u.branch_name || 'No Branch'}
                </div>
                <div className={styles.userLastUsed}>
                  Last login: {formatLastUsed(u.last_used)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectUserMobile;

