"use client"

import { useState, useRef, type ChangeEvent, type FormEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, ImageIcon, X, Lock } from "lucide-react"
import NextImage from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { imageService } from "@/services/image-service"
import { useToast } from "@/hooks/use-toast"
import { encryptImage, generateEncryptionKey } from "@/utils/encryption"
import { useSupabase } from "@/contexts/supabase-context"
import { nillionService } from "@/services/nillion-service"

const DEFAULT_SCHEMA_ID = "default"

interface ImageUploaderProps {
  onUploadComplete?: () => void
}

export function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageName, setImageName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<string>("")
  const [schemaId, setSchemaId] = useState(DEFAULT_SCHEMA_ID)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useSupabase()

  // Get schema ID from URL or use default in a useEffect to avoid SSR issues
  useEffect(() => {
    if (searchParams) {
      const urlSchemaId = searchParams.get("schemaId") || DEFAULT_SCHEMA_ID
      setSchemaId(urlSchemaId)
    }
  }, [searchParams])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null

    if (file && !file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    setImage(file)

    // Set the image name from the file name if available
    if (file) {
      // Extract name without extension
      const fileName = file.name.split(".").slice(0, -1).join(".")
      if (fileName && !imageName) {
        setImageName(fileName)
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!image || !imageName.trim() || !imagePreview) {
      toast({
        title: "Missing information",
        description: "Please select an image and enter a name",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      console.log("[START] Image upload process to Nillion")
      let finalImageData = imagePreview
      let key = ""

      try {
        console.log("[INFO] Generating encryption key")
        key = generateEncryptionKey()
        setEncryptionKey(key)

        console.log("[INFO] Generated encryption key:", key.substring(0, 8) + "...")
        console.log("[INFO] Original image data length:", imagePreview.length)

        console.log("[INFO] Encrypting image data")
        finalImageData = await encryptImage(imagePreview, key)

        console.log("[INFO] Encrypted image data length:", finalImageData.length)

        // Store the original image type with the encryption key
        // This will help with decryption later
        const imageType = image.type || "image/png"
        key = `${imageType}|${key}`

        // Show the encryption key to the user
        toast({
          title: "Image Encrypted",
          description: "Your image has been encrypted before upload",
        })
      } catch (encryptError) {
        console.error("[ERROR] Encryption error:", encryptError)
        toast({
          title: "Encryption Failed",
          description: encryptError instanceof Error ? encryptError.message : "Could not encrypt the image",
          variant: "destructive",
        })
        setIsUploading(false)
        return
      }

      // Upload to Pinata first
      console.log("[INFO] Uploading image to Pinata")
      const uploadedImage = await imageService.uploadToPinata(finalImageData, imageName, true, key)
      console.log("[SUCCESS] Image uploaded to Pinata:", uploadedImage)

      // Add user information to the image data
      const imageWithUserInfo = {
        ...uploadedImage,
        userId: user?.id || "",
        userEmail: user?.email || "",
      }

      // Then upload to Nillion
      console.log("[INFO] Uploading image metadata to Nillion")
      const response = await fetch("/api/nillion/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageWithUserInfo }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const nillionResponse = await response.json()
      console.log("[SUCCESS] Image metadata uploaded to Nillion:", nillionResponse)

      toast({
        title: "Success!",
        description: "Image uploaded to Pinata and stored in Nillion",
      })

      // Reset form after successful upload
      setImage(null)
      setImagePreview(null)
      setImageName("")
      setEncryptionKey("")

      // Clear the Nillion service cache to refresh the gallery
      nillionService.clearCache()

      // Call the onUploadComplete callback if provided
      if (onUploadComplete) {
        onUploadComplete()
      }

      console.log("[END] Image upload process")
    } catch (error) {
      console.error("[ERROR] Upload error:", error)
      console.log(
        "[ERROR] Error details:",
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      )

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-600 p-2 rounded-full">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-medium">Nillion Encrypted Storage</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span>
              Images are automatically encrypted before being uploaded to IPFS. The encryption keys are securely stored
              in Nillion's SecretVault.
            </span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="image-upload">Image</Label>
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div className="relative w-full aspect-video">
                  <NextImage
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    fill
                    className="object-contain rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 md:h-8 md:w-8 sm:h-7 sm:w-7"
                    onClick={removeImage}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-md w-full aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={triggerFileInput}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      triggerFileInput()
                    }
                  }}
                  aria-label="Select an image"
                >
                  <ImageIcon className="h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-500 text-center px-4">Tap to select an image</p>
                </div>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                ref={fileInputRef}
                capture="environment"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-name">Image Name</Label>
            <Input
              id="image-name"
              placeholder="Enter a name for your image"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              required
              className="text-base md:text-sm"
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            className="w-full py-6 md:py-2 text-base md:text-sm bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isUploading || !image || !imageName.trim()}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Encrypting & Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <Upload className="h-4 w-4" />
                Upload Encrypted Image
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
