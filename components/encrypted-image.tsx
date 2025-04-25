"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { decryptImage } from "@/utils/encryption"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"

interface EncryptedImageProps {
  src: string
  alt: string
  encryptionKey: string
  className?: string
  autoDecrypt?: boolean
}

export function EncryptedImage({ src, alt, encryptionKey, className = "", autoDecrypt = false }: EncryptedImageProps) {
  // Track if decryption has been attempted
  const [decryptionAttempted, setDecryptionAttempted] = useState(false)
  const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showImage, setShowImage] = useState(autoDecrypt)

  // Track if the user manually requested decryption
  const manuallyDecrypted = useRef(false)

  // Define the decryption function as a useCallback to avoid recreating it on each render
  const decryptImageData = useCallback(
    async (isManual = false) => {
      if (isDecrypting || decryptedSrc) return

      // If this is a manual decryption, set the flag
      if (isManual) {
        manuallyDecrypted.current = true
      }

      setIsDecrypting(true)
      setError(null)
      console.log("Starting decryption process...")

      try {
        // Fetch the encrypted image
        console.log("Fetching encrypted image:", src)
        const response = await fetch(src)
        if (!response.ok) {
          throw new Error("Failed to fetch encrypted image")
        }

        // Convert to base64
        const blob = await response.blob()
        const reader = new FileReader()

        reader.onloadend = async () => {
          try {
            // Get the base64 data
            const base64Data = reader.result as string

            if (!base64Data || typeof base64Data !== "string") {
              throw new Error("Invalid image data received")
            }

            console.log("Decrypting image data...")
            // Decrypt the image
            const decrypted = await decryptImage(base64Data, encryptionKey)
            console.log("Decryption successful")

            // Set the decrypted source
            setDecryptedSrc(decrypted)

            // Show the image if it was manually decrypted or autoDecrypt is true
            if (manuallyDecrypted.current || autoDecrypt) {
              console.log("Setting image visible. Manual:", manuallyDecrypted.current, "Auto:", autoDecrypt)
              setShowImage(true)
            }
          } catch (err) {
            console.error("Decryption error details:", err)
            setError("Failed to decrypt image. The encryption key may be incorrect.")
          } finally {
            setIsDecrypting(false)
            setDecryptionAttempted(true)
          }
        }

        reader.onerror = () => {
          setError("Failed to read image data")
          setIsDecrypting(false)
          setDecryptionAttempted(true)
        }

        reader.readAsDataURL(blob)
      } catch (err) {
        console.error("Fetch error:", err)
        setError("Failed to fetch image")
        setIsDecrypting(false)
        setDecryptionAttempted(true)
      }
    },
    [src, encryptionKey, isDecrypting, decryptedSrc, autoDecrypt],
  )

  // Update visibility when autoDecrypt changes
  useEffect(() => {
    console.log("EncryptedImage: autoDecrypt changed to", autoDecrypt, "for image", alt)

    // If autoDecrypt is true and we haven't attempted decryption yet, decrypt the image
    if (autoDecrypt && !decryptionAttempted && !isDecrypting) {
      console.log("Auto-decrypt triggered for", alt)
      decryptImageData(false) // Not manual
    }

    // If we have a decrypted image, update visibility based on autoDecrypt
    if (decryptedSrc) {
      setShowImage(autoDecrypt || manuallyDecrypted.current)
    }
  }, [autoDecrypt, decryptionAttempted, isDecrypting, decryptedSrc, decryptImageData, alt])

  // Handle manual decrypt button click
  const handleDecryptClick = () => {
    console.log("Decrypt button clicked")

    // If we already have the decrypted image, just show it
    if (decryptedSrc) {
      console.log("Image already decrypted, showing it")
      manuallyDecrypted.current = true
      setShowImage(true)
      return
    }

    // Otherwise start the decryption process (manual)
    decryptImageData(true)
  }

  // Use a regular img tag instead of Next.js Image component for decrypted images
  return (
    <div className="relative">
      {showImage && decryptedSrc ? (
        <div className="relative w-full h-full">
          {/* Use a regular img tag for data URLs */}
          <img
            src={decryptedSrc || "/placeholder.svg"}
            alt={alt}
            className={`w-full h-full object-cover ${className}`}
          />
          {!autoDecrypt && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 opacity-80 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowImage(false)}
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Hide
            </Button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className={`bg-muted flex items-center justify-center ${className} w-full h-full`}>
            <div className="text-center p-4">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                This image is encrypted with an encryption key stored in Nillion SecretVault
              </p>

              {error && <p className="text-xs text-destructive mb-3">{error}</p>}

              <Button
                size="sm"
                onClick={handleDecryptClick}
                disabled={isDecrypting}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 hover:text-gray-800"
              >
                {isDecrypting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Decrypt & View
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
