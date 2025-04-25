"use client"

import { useSupabase } from "@/contexts/supabase-context"
import { useState, useEffect } from "react"
import { UploadImageModal } from "./upload-image-modal"
import { Eye, EyeOff, PlusCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface PersonalizedGalleryHeaderProps {
  onUploadComplete?: () => void
  showEncryptedImages?: boolean
  onToggleEncryptedImages?: (show: boolean) => void
  hasEncryptedImages?: boolean
}

export function PersonalizedGalleryHeader({
  onUploadComplete,
  showEncryptedImages = false,
  onToggleEncryptedImages,
  hasEncryptedImages = false,
}: PersonalizedGalleryHeaderProps) {
  const { user, isLoading, isInitialized } = useSupabase()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setUserEmail(user.email)
      setUserId(user.id)
    } else {
      setUserEmail(null)
      setUserId(null)
    }
  }, [user])

  const handleUploadComplete = () => {
    setIsModalOpen(false)
    if (onUploadComplete) {
      onUploadComplete()
    }
  }

  const handleToggleEncryption = (checked: boolean) => {
    console.log("Toggle encryption visibility:", checked)
    if (onToggleEncryptedImages) {
      onToggleEncryptedImages(checked)
    }
  }

  // Don't render anything until we've initialized auth
  if (!isInitialized) {
    return (
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Gallery</h1>
          <div className="h-4 w-48 bg-muted animate-pulse rounded mb-2"></div>
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
      </div>
    )
  }

  // Show loading state after initialization
  if (isLoading) {
    return (
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Gallery</h1>
          <div className="h-4 w-48 bg-muted animate-pulse rounded mb-2"></div>
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-start gap-4 md:gap-0">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2">My Gallery</h1>
        <p className="text-muted-foreground">
          Browse your images. Encrypted image files were uploaded to IPFS with metadata and encryption keys stored in
          Nillion SecretVault.
        </p>
      </div>
      <div className="flex items-center justify-center md:justify-end gap-3 w-full">
        {hasEncryptedImages && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center bg-background border rounded-md px-3 py-2 shadow-sm">
                  <EyeOff className="h-4 w-4 text-muted-foreground mr-2" />
                  <Switch
                    id="show-encrypted"
                    checked={showEncryptedImages}
                    onCheckedChange={handleToggleEncryption}
                    className="mx-1 data-[state=checked]:bg-blue-600"
                    aria-label={showEncryptedImages ? "Hide encrypted images" : "Show encrypted images"}
                  />
                  <Eye className="h-4 w-4 text-muted-foreground ml-2" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showEncryptedImages ? "Hide encrypted images" : "Show encrypted images"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PlusCircle className="h-4 w-4" />
          Add Image
        </Button>
        <UploadImageModal open={isModalOpen} onOpenChange={setIsModalOpen} onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  )
}
