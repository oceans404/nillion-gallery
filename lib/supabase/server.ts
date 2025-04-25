import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { handleServerError } from "@/lib/error-handler"

export function createClient() {
  try {
    // We need to recreate the client on each request because cookies might change
    const cookieStore = cookies()

    // Create a new client for this request
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // We're not setting cookies, just reading them
          },
          remove(name: string, options: any) {
            // We're not removing cookies, just reading them
          },
        },
        // Add fetch options to improve reliability
        global: {
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Add a timeout to prevent hanging requests
              signal: options?.signal || AbortSignal.timeout(10000), // 10 second timeout
              // Ensure we're not caching responses
              cache: "no-store",
            })
          },
        },
      },
    )

    return client
  } catch (error) {
    handleServerError(error, "creating Supabase server client")

    // Return a minimal mock client that won't throw errors
    // This allows the application to gracefully handle Supabase initialization failures
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as any
  }
}
