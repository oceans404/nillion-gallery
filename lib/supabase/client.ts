import { createBrowserClient } from "@supabase/ssr"

// Create a singleton instance
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // For server-side rendering during build, return a mock client
    // This prevents errors during static generation
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        refreshSession: async () => ({ data: { session: null }, error: null }),
      },
    } as any
  }

  // Return existing instance if available
  if (supabaseClient) {
    return supabaseClient
  }

  // Create new instance if one doesn't exist
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return supabaseClient
}

// Export a singleton instance for direct imports
export const supabase = typeof window !== "undefined" ? createClient() : null
