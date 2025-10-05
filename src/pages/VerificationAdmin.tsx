import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import VerificationAdminLayout from '../components/VerificationAdminLayout';

interface PendingRegistration {
  id: string;
  user_id: number;
  email: string;
  business_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  business_type: string;
  business_description: string;
  business_address: string;
  business_phone: string;
  currency: string;
  website: string;
  vat_number: string;
  open_time: string;
  close_time: string;
  created_at: string;
  status: string;
}

const VerificationAdmin: React.FC = () => {
  const { user } = useAuth();
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      setLoading(true);
      console.log('Fetching pending registrations...');
      
      // First, let's try to get all records from the table to see if it exists
      const { data: allData, error: allError } = await supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('All pending registrations:', { allData, allError });

      if (allError) {
        console.error('Error fetching all pending registrations:', allError);
        setError(`Database error: ${allError.message}`);
        return;
      }

      // Now filter for pending ones
      const pendingData = allData?.filter(reg => reg.status === 'pending') || [];
      console.log('Filtered pending registrations:', pendingData.length);
      
      setPendingRegistrations(pendingData);
      
      // If no pending registrations, check for inactive users as fallback
      if (pendingData.length === 0) {
        console.log('No pending registrations found, checking for inactive users...');
        const { data: inactiveUsersData, error: inactiveError } = await supabase
          .from('users')
          .select('user_id, username, email, full_name, active, created_at')
          .eq('active', false)
          .order('created_at', { ascending: false });
        
        console.log('Inactive users found:', { inactiveUsersData, inactiveError });
        setInactiveUsers(inactiveUsersData || []);
      } else {
        setInactiveUsers([]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration: PendingRegistration) => {
    try {
      setProcessing(registration.id);
      setError(null);
      setSuccess(null);

      // Update the user to be active and email verified
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          active: true,
          email_verified: true,
          email_verification_token: null,
          verification_token_expires: null
        })
        .eq('user_id', registration.user_id);

      if (userError) {
        console.error('Error activating user:', userError);
        setError('Failed to activate user');
        return;
      }

      // Update the pending registration
      const { error: pendingError } = await supabase
        .from('pending_registrations')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.user_id,
          status: 'approved'
        })
        .eq('id', registration.id);

      if (pendingError) {
        console.error('Error updating pending registration:', pendingError);
        setError('Failed to update registration status');
        return;
      }

      setSuccess(`Successfully approved registration for ${registration.first_name} ${registration.last_name}`);
      
      // Refresh the list
      await fetchPendingRegistrations();
    } catch (err) {
      console.error('Error approving registration:', err);
      setError('An error occurred while approving the registration');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (registration: PendingRegistration) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(registration.id);
      setError(null);
      setSuccess(null);

      // Update the pending registration
      const { error: pendingError } = await supabase
        .from('pending_registrations')
        .update({
          approved: false,
          approved_at: new Date().toISOString(),
          approved_by: user?.user_id,
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', registration.id);

      if (pendingError) {
        console.error('Error updating pending registration:', pendingError);
        setError('Failed to update registration status');
        return;
      }

      setSuccess(`Successfully rejected registration for ${registration.first_name} ${registration.last_name}`);
      
      // Refresh the list
      await fetchPendingRegistrations();
    } catch (err) {
      console.error('Error rejecting registration:', err);
      setError('An error occurred while rejecting the registration');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <VerificationAdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading pending registrations...</p>
          </div>
        </div>
      </VerificationAdminLayout>
    );
  }

  return (
    <VerificationAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Pending User Registrations</h1>
          <p className="mt-2 text-slate-600">
            Review and approve new user registrations
          </p>
          
          {/* Debug Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Debug Information</h4>
            <p className="text-sm text-blue-700">Total pending registrations: {pendingRegistrations.length}</p>
            <p className="text-sm text-blue-700">Total inactive users: {inactiveUsers.length}</p>
            <p className="text-sm text-blue-700">Loading: {loading ? 'Yes' : 'No'}</p>
            <p className="text-sm text-blue-700">Error: {error || 'None'}</p>
            <div className="mt-2 space-x-2">
              <button 
                onClick={fetchPendingRegistrations}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Refresh Data
              </button>
              <button 
                onClick={async () => {
                  console.log('Testing database connection...');
                  
                  // Test 1: Check pending_registrations table
                  const { data: pendingData, error: pendingError } = await supabase
                    .from('pending_registrations')
                    .select('*')
                    .limit(5);
                  console.log('Pending registrations:', { pendingData, pendingError });
                  
                  // Test 2: Check users with active = false
                  const { data: inactiveUsers, error: usersError } = await supabase
                    .from('users')
                    .select('user_id, username, email, active, created_at')
                    .eq('active', false)
                    .limit(5);
                  console.log('Inactive users:', { inactiveUsers, usersError });
                  
                  // Test 3: Check all users created in last 24 hours
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const { data: recentUsers, error: recentError } = await supabase
                    .from('users')
                    .select('user_id, username, email, active, created_at')
                    .gte('created_at', yesterday.toISOString())
                    .limit(5);
                  console.log('Recent users:', { recentUsers, recentError });
                  
                  alert(`Results:\n- Pending registrations: ${pendingData?.length || 0}\n- Inactive users: ${inactiveUsers?.length || 0}\n- Recent users: ${recentUsers?.length || 0}\n\nCheck console for full details.`);
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Test DB Connection
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Registration Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-3xl font-bold text-amber-600">{pendingRegistrations.length}</div>
                <div className="text-sm font-medium text-amber-700 mt-1">Pending Approval</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <div className="text-sm font-medium text-blue-700 mt-1">Approved Today</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-3xl font-bold text-slate-600">0</div>
                <div className="text-sm font-medium text-slate-700 mt-1">Rejected Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Registrations */}
        {pendingRegistrations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All caught up!</h3>
            <p className="text-slate-600">No pending registrations at this time.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRegistrations.map((registration) => (
              <div key={registration.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {registration.first_name} {registration.last_name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">{registration.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Pending Review
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        {formatDate(registration.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Account Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Account Details
                      </h4>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</dt>
                          <dd className="text-sm text-slate-900 mt-1">
                            {registration.first_name} {registration.last_name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.email}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.phone || 'Not provided'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Business Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Business Information
                      </h4>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Business Name</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.business_name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.business_type}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.business_address}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.business_phone || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currency</dt>
                          <dd className="text-sm text-slate-900 mt-1">{registration.currency}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Business Hours</dt>
                          <dd className="text-sm text-slate-900 mt-1">
                            {registration.open_time} - {registration.close_time}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {registration.business_description && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Business Description
                      </h4>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4">{registration.business_description}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-5 bg-slate-50 border-t border-slate-200">
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => handleReject(registration)}
                      disabled={processing === registration.id}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {processing === registration.id ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleApprove(registration)}
                      disabled={processing === registration.id}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {processing === registration.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VerificationAdminLayout>
  );
};

export default VerificationAdmin;
