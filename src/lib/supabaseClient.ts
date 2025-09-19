import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Log Supabase REST calls to trace metadata queries
const instrumentedFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : undefined
  const resolvedUrl = request?.url ?? (typeof input === 'string' ? input : input instanceof URL ? input.toString() : '')
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()

  if (resolvedUrl.includes('/rest/v1')) {
    try {
      const { pathname } = new URL(resolvedUrl)
      console.info('[supabase]', method, pathname)
      if (pathname.includes('pg_timezone_names')) {
        console.trace('Timezone list requested from Supabase')
      }
    } catch {
      console.info('[supabase]', method, resolvedUrl)
    }
  }

  return fetch(input, init)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: instrumentedFetch,
  },
})
