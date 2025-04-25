"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import { NillionImageViewer } from "@/components/nillion-image-viewer"
import { PersonalizedGalleryHeader } from "@/components/personalized-gallery-header"
import { useSupabase } from "@/contexts/supabase-context"
import { GalleryHero } from "@/components/gallery-hero"
import { AuthModal } from "@/components/auth/auth-modal"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

// Update the SearchParamsHandler component to check for both verification code and error hash
function SearchParamsHandler({ setAuthModalOpen }: { setAuthModalOpen: (open: boolean) => void }) {
  const searchParams = useSearchParams()
  const { user } = useSupabase()
  const { toast } = useToast()

  // Check for verification code in URL and error hash
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for verification code
      const code = searchParams?.get("code")
      if (code && !user) {
        console.log("Verification code detected, opening auth modal")
        // If there's a code and user is not logged in, open the auth modal
        setAuthModalOpen(true)

        // Show a toast to guide the user
        toast({
          title: "Verification link detected",
          description: "Processing your email verification...",
        })
      }

      // Check for error hash
      if (window.location.hash === "#error") {
        console.log("Error hash detected, opening auth modal")
        setAuthModalOpen(true)

        // Show a toast to guide the user
        toast({
          title: "Authentication error",
          description: "Please sign in or create an account",
          variant: "destructive",
        })

        // Clear the hash to prevent the modal from reopening on refresh
        // Use history.replaceState to avoid adding a new entry to the browser history
        window.history.replaceState(null, "", window.location.pathname + window.location.search)
      }
    }
  }, [searchParams, user, setAuthModalOpen, toast])

  return null
}

export default function GalleryPage() {
  // Update the state management for showEncryptedImages
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  // Make sure the setShowEncryptedImages function is properly defined
  const [showEncryptedImages, setShowEncryptedImages] = useState(false)
  const [hasEncryptedImages, setHasEncryptedImages] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { user, isLoading } = useSupabase()

  // Check for error hash on initial load
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#error") {
      console.log("Error hash detected on initial load, opening auth modal")
      setAuthModalOpen(true)

      // Clear the hash to prevent the modal from reopening on refresh
      window.history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }, [])

  // Close the auth modal when user becomes authenticated
  useEffect(() => {
    if (user) {
      setAuthModalOpen(false)
    }
  }, [user])

  const handleUploadComplete = useCallback(() => {
    // Increment the refresh trigger to cause the viewer to reload
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Show welcome screen for unauthenticated users
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <GalleryHero />
        {/* Wrap the search params handler in Suspense */}
        {typeof window !== "undefined" && (
          <Suspense fallback={null}>
            <SearchParamsHandler setAuthModalOpen={setAuthModalOpen} />
          </Suspense>
        )}
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab="login" />
      </div>
    )
  }

  // Show gallery for authenticated users
  return (
    <div>
      <div className="mb-8">
        {/* Ensure the toggle function is passed correctly to PersonalizedGalleryHeader */}
        <PersonalizedGalleryHeader
          onUploadComplete={handleUploadComplete}
          showEncryptedImages={showEncryptedImages}
          onToggleEncryptedImages={(show) => {
            console.log("Setting showEncryptedImages to:", show)
            setShowEncryptedImages(show)
          }}
          hasEncryptedImages={hasEncryptedImages}
        />
      </div>
      {/* Make sure the autoDecrypt prop is correctly passed to NillionImageViewer */}
      <NillionImageViewer
        key={refreshTrigger}
        autoDecrypt={showEncryptedImages}
        onHasEncryptedImages={setHasEncryptedImages}
      />

      {/* Add the auth modal for authenticated users too, in case they need to reauthenticate */}
      {typeof window !== "undefined" && (
        <Suspense fallback={null}>
          <SearchParamsHandler setAuthModalOpen={setAuthModalOpen} />
        </Suspense>
      )}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab="login" />
    </div>
  )
}
