import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

interface User {
  user_id: number
  username: string
  password_hash: string
  role: string
  active: boolean
  icon?: string
  business_id: number
  branch_id?: number
  branch_name?: string
  created_at?: string
  updated_at?: string
}

const fetchUsersSimple = async (businessId: number, branchId: number | null): Promise<User[]> => {
  console.log('fetchUsersSimple called with:', { businessId, branchId })
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
  })

  const queryPromise = (async () => {
    let query = supabase
      .from('users')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    // Add branch filtering if branch is selected
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching users (simple):', error)
      throw error
    }

    console.log('Users fetched successfully (simple):', data?.length || 0, 'users')

    // Just return users without branch information for now
    const usersWithDefaultBranch = (data || []).map(user => ({
      ...user,
      branch_name: user.branch_id ? `Branch ${user.branch_id}` : 'No Branch Assigned'
    }))

    return usersWithDefaultBranch
  })()

  return Promise.race([queryPromise, timeoutPromise])
}

export const useUsersDataSimple = (businessId: number | null, branchId: number | null) => {
  console.log('useUsersDataSimple called with:', { businessId, branchId, enabled: !!businessId })
  
  return useQuery({
    queryKey: ['users-simple', businessId, branchId],
    queryFn: () => {
      console.log('Query function called with businessId:', businessId)
      return fetchUsersSimple(businessId!, branchId)
    },
    enabled: !!businessId && businessId > 0,
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
