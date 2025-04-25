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
import { UserPlus, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SignUpFormProps {
  inModal?: boolean
  onSuccess?: () => void
}

export function SignUpForm({ inModal = false, onSuccess }: SignUpFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [client, setClient] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Initialize the client on the client side only
  useEffect(() => {
    // Use the singleton client or create one if it doesn't exist yet
    setClient(supabase || createClient())
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

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
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      // Always call onSuccess when signup is successful
      if (inModal && onSuccess) {
        onSuccess()
      } else {
        // Otherwise, handle page navigation
        router.push("/auth/verification-sent")
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again with a different email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-input/60"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="border-input/60"
        />
        <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
      </div>
      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || !client}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Creating account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Sign Up
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
          <h2 className="text-2xl font-semibold">Create an Account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Join Nillion Gallery to securely store and manage your private images
          </p>
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
          <CardTitle className="text-2xl">Create an Account</CardTitle>
        </div>
        <CardDescription>Join Nillion Gallery to securely store and manage your private images</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
      <CardFooter className="flex flex-col space-y-4 pt-4">
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
