"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase, createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, ImageIcon, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginFormProps {
  inModal?: boolean
  onSuccess?: () => void
}

export function LoginForm({ inModal = false, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [client, setClient] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Initialize the client on the client side only
  useEffect(() => {
    // Use the singleton client or create one if it doesn't exist yet
    setClient(supabase || createClient())
  }, [])

  // Clear error message when email or password changes
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null)
    }
  }, [email, password, errorMessage])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!client) {
      toast({
        title: "Error",
        description: "Authentication client not initialized",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Attempting to sign in with:", { email })
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })

      console.log("Sign in response:", { data, error })

      if (error) {
        console.error("Authentication error:", error)

        // Handle specific error types
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("The email or password you entered is incorrect. Please try again.")
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Please verify your email address before signing in.")
        } else if (error.message.includes("rate limit")) {
          setErrorMessage("Too many sign-in attempts. Please try again later.")
        } else {
          setErrorMessage(error.message || "An error occurred during sign in. Please try again.")
        }
        setIsLoading(false)
        return
      }

      // If we don't have a user or session, something went wrong
      if (!data.user || !data.session) {
        console.error("No user or session returned:", data)
        setErrorMessage("Failed to sign in. Please try again.")
        setIsLoading(false)
        return
      }

      // Success path
      console.log("Login successful for user:", data.user.id)
      toast({
        title: "Login successful",
        description: "Welcome back to Nillion Gallery",
      })

      // Store a flag in localStorage to indicate we just logged in
      localStorage.setItem("justLoggedIn", "true")

      // If in modal, call onSuccess callback
      if (inModal && onSuccess) {
        onSuccess()
      } else {
        // Otherwise, handle page navigation
        setIsRedirecting(true)
        // Add a longer delay to ensure the session is fully established
        await new Promise((resolve) => setTimeout(resolve, 1000))
        router.push("/")
        router.refresh()
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error)
      setErrorMessage("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // Show a loading state when redirecting
  if (isRedirecting && !inModal) {
    return (
      <Card className="w-full shadow-lg border-primary/20">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-600 p-2 rounded-full">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-2xl">Log in</CardTitle>
          </div>
          <CardDescription>Signing you in...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-muted-foreground">Redirecting to your gallery</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formContent = (
    <form onSubmit={handleSignIn} className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive" className="text-sm py-3">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`border-input/60 ${errorMessage ? "border-destructive" : ""}`}
          aria-invalid={errorMessage ? "true" : "false"}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-blue-600">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={`border-input/60 ${errorMessage ? "border-destructive" : ""}`}
          aria-invalid={errorMessage ? "true" : "false"}
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={isLoading || !client || !email || !password}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Signing in...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Sign In
          </span>
        )}
      </Button>
    </form>
  )

  // If in modal, just return the form content
  if (inModal) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Welcome Back</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your private gallery</p>
        </div>
        {formContent}
      </div>
    )
  }

  // Otherwise, return the full card layout for the page
  return (
    <Card className="w-full shadow-lg border-blue-600/20">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-blue-600 p-2 rounded-full">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
        </div>
        <CardDescription>Enter your credentials to access your private gallery</CardDescription>
      </CardHeader>

      <CardContent>{formContent}</CardContent>

      <CardFooter className="flex justify-center pt-4">
        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
