"use client"

import { useState, useEffect, Suspense } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useSupabase } from "@/components/providers/supabase-provider"

// Create a client-side only component for search params
function AuthModalSearchParamsHandler({
  open,
  onOpenChange,
  setProcessingCode,
  setVerificationSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  setProcessingCode: (processing: boolean) => void
  setVerificationSuccess: (success: boolean) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useSupabase()

  // Close the modal if user is already authenticated
  useEffect(() => {
    if (user && open) {
      console.log("User already authenticated, closing auth modal")
      onOpenChange(false)
    }
  }, [user, open, onOpenChange])

  // Process verification code if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Ensure we're on the client
      const code = searchParams?.get("code")

      if (code && open && !window.codeProcessed) {
        const processVerificationCode = async () => {
          // Set a flag to prevent processing the same code multiple times
          window.codeProcessed = true
          setProcessingCode(true)

          try {
            console.log("Processing verification code...")
            const supabase = createClient()
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
              console.error("Error exchanging code for session:", error)
              toast({
                title: "Verification failed",
                description: "There was an error verifying your email. Please try signing in.",
                variant: "destructive",
              })
              setProcessingCode(false)
            } else {
              console.log("Email verification successful:", data)
              toast({
                title: "Email verified",
                description: "Your email has been verified. You can now sign in.",
              })

              setVerificationSuccess(true)
              setProcessingCode(false)

              // Close the modal and refresh the page without the code parameter
              setTimeout(() => {
                onOpenChange(false)
                // Remove the code from the URL
                const url = new URL(window.location.href)
                url.searchParams.delete("code")
                router.replace(url.pathname + url.search)
                // Refresh to update auth state
                window.location.reload()
              }, 1500)
            }
          } catch (error) {
            console.error("Error processing verification code:", error)
            toast({
              title: "Verification error",
              description: "An unexpected error occurred. Please try signing in manually.",
              variant: "destructive",
            })
            setProcessingCode(false)
          }
        }

        processVerificationCode()
      }
    }
  }, [open, searchParams, toast, router, onOpenChange, setProcessingCode, setVerificationSuccess])

  return null
}

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "login" | "signup"
}

// Add the window property for TypeScript
declare global {
  interface Window {
    codeProcessed?: boolean
  }
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab)
  const [verificationSent, setVerificationSent] = useState(false)
  const [processingCode, setProcessingCode] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)

  useEffect(() => {
    // Reset verification states when modal is closed
    if (!open) {
      setVerificationSent(false)
      setVerificationSuccess(false)
    }
  }, [open])

  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "signup")
    // Reset verification sent state when changing tabs
    setVerificationSent(false)
    setVerificationSuccess(false)
  }

  const handleSignupSuccess = () => {
    setVerificationSent(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Wrap the search params handler in Suspense */}
        {typeof window !== "undefined" && (
          <Suspense fallback={null}>
            <AuthModalSearchParamsHandler
              open={open}
              onOpenChange={onOpenChange}
              setProcessingCode={setProcessingCode}
              setVerificationSuccess={setVerificationSuccess}
            />
          </Suspense>
        )}

        {processingCode ? (
          <div className="p-6 space-y-4 text-center">
            <h2 className="text-2xl font-semibold">Verifying your email</h2>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <p className="text-muted-foreground">Please wait while we verify your email address...</p>
          </div>
        ) : verificationSuccess ? (
          <div className="p-6 space-y-4 text-center">
            <h2 className="text-2xl font-semibold text-center">Email Verified</h2>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start">
              <div className="mx-auto">
                <p className="text-green-800 font-medium">Your email has been verified successfully!</p>
                <p className="text-green-700 mt-1">You'll be redirected to the gallery in a moment...</p>
              </div>
            </div>
          </div>
        ) : verificationSent ? (
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-center">Check your email</h2>
            <p className="text-center text-muted-foreground">
              We've sent you a verification link to complete your signup
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Verification email sent</p>
                <p className="text-sm text-blue-700 mt-1">
                  Please check your email inbox and click the verification link to activate your account.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Don't see the email?</p>
                <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Allow a few minutes for the email to arrive</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-2 w-full rounded-none bg-gray-100 sticky top-0 z-10">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 py-3"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 py-3"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            <div className="p-4 sm:p-6">
              <TabsContent value="login" className="mt-0">
                <LoginForm inModal onSuccess={() => onOpenChange(false)} />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm inModal onSuccess={handleSignupSuccess} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
