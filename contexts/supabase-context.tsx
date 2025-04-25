"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase, createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type SupabaseContextType = {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  isLoading: true,
  isInitialized: false,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [client, setClient] = useState<any>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Initialize the client on the client side only
  useEffect(() => {
    // Use the singleton client or create one if it doesn't exist yet
    setClient(supabase || createClient())
  }, [])

  const refreshUser = async () => {
    if (!client) return

    try {
      console.log("Refreshing user session...")
      setIsLoading(true)

      // First try to refresh the session with a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        const { error: refreshError } = await client.auth.refreshSession()

        clearTimeout(timeoutId)

        if (refreshError) {
          console.warn("Session refresh: No active session to refresh", refreshError)
        } else {
          console.log("Session refreshed successfully")
        }
      } catch (refreshError) {
        clearTimeout(timeoutId)
        console.error("Error refreshing session:", refreshError)
      }

      // Then get the user with a timeout
      const userController = new AbortController()
      const userTimeoutId = setTimeout(() => userController.abort(), 5000) // 5 second timeout

      try {
        console.log("Getting user data...")
        const { data, error } = await client.auth.getUser()

        clearTimeout(userTimeoutId)

        if (error) {
          console.error("Error getting user:", error)
          setUser(null)
          return
        }

        console.log("User data retrieved successfully:", data.user?.id)
        setUser(data.user)
      } catch (userError) {
        clearTimeout(userTimeoutId)
        console.error("Error getting user:", userError)
        setUser(null)
      }
    } catch (error) {
      console.error("Unexpected error refreshing user:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    if (!client) return

    try {
      setIsLoading(true)
      await client.auth.signOut()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!client) return

    // Check if we just logged in (from localStorage flag)
    const justLoggedIn = localStorage.getItem("justLoggedIn") === "true"
    if (justLoggedIn) {
      console.log("Just logged in flag detected, refreshing user immediately")
      localStorage.removeItem("justLoggedIn")
      refreshUser()
      return
    }

    // Initial user fetch
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...")
        // First check for a session with a timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        try {
          const { data: sessionData, error: sessionError } = await client.auth.getSession()

          clearTimeout(timeoutId)

          // If there's a session error, log it but continue
          if (sessionError) {
            console.error("Error getting session:", sessionError)
            setUser(null)
            setIsLoading(false)
            setIsInitialized(true)
            return
          }

          // If no session, this is expected behavior (not logged in)
          if (!sessionData.session) {
            console.log("Auth initialization: No active session (user not logged in)")
            setUser(null)
            setIsLoading(false)
            setIsInitialized(true)
            return
          }

          console.log("Session found, getting user data...")
          // If we have a session, get the user with a timeout
          const userController = new AbortController()
          const userTimeoutId = setTimeout(() => userController.abort(), 5000) // 5 second timeout

          try {
            const { data, error } = await client.auth.getUser()

            clearTimeout(userTimeoutId)

            if (error) {
              // This would be unexpected if we have a session
              console.error("Error getting user with active session:", error)
              setUser(null)
            } else {
              console.log("User data retrieved successfully:", data.user?.id)
              setUser(data.user)
            }
          } catch (userError) {
            clearTimeout(userTimeoutId)
            console.error("Error getting user:", userError)
            setUser(null)
          }
        } catch (sessionError) {
          clearTimeout(timeoutId)

          // If it's an abort error (timeout), retry a few times
          if (sessionError instanceof DOMException && sessionError.name === "AbortError" && retryCount < 3) {
            console.warn(`Session fetch timed out, retrying (${retryCount + 1}/3)...`)
            setRetryCount(retryCount + 1)
            // Don't set initialized yet, we'll retry
            setIsLoading(false)
            return
          }

          console.error("Error getting session:", sessionError)
          setUser(null)
        }
      } catch (error) {
        console.error("Unexpected error during auth initialization:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    // Only initialize if we haven't already or if we're retrying
    if (!isInitialized || retryCount > 0) {
      initializeAuth()
    }

    // Set up auth state change listener
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)
      setUser(session?.user || null)
      setIsLoading(false)
      setIsInitialized(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [client, isInitialized, retryCount])

  return (
    <SupabaseContext.Provider value={{ user, isLoading, isInitialized, signOut, refreshUser }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => useContext(SupabaseContext)
