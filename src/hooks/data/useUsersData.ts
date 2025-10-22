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

const fetchUsers = async (businessId: number, branchId: number | null): Promise<User[]> => {
  console.log('fetchUsers called with:', { businessId, branchId })
  
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
    console.error('Error fetching users:', error)
    throw error
  }

  console.log('Users fetched successfully:', data?.length || 0, 'users')

  // Get branch information separately to avoid join issues
  const usersWithBranches = await Promise.all((data || []).map(async (user) => {
    if (user.branch_id) {
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('branch_name')
          .eq('branch_id', user.branch_id)
          .single()
        
        return {
          ...user,
          branch_name: branchData?.branch_name || 'Branch Not Found'
        }
      } catch (branchError) {
        console.warn(`Could not fetch branch for user ${user.user_id}:`, branchError)
        return {
          ...user,
          branch_name: 'Branch Not Found'
        }
      }
    }
    
    return {
      ...user,
      branch_name: 'No Branch Assigned'
    }
  }))

  return usersWithBranches
}

export const useUsersData = (businessId: number | null, branchId: number | null) => {
  console.log('useUsersData called with:', { businessId, branchId, enabled: !!businessId })
  
  return useQuery({
    queryKey: ['users', businessId, branchId],
    queryFn: () => fetchUsers(businessId!, branchId),
    enabled: !!businessId,
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
  })
}
