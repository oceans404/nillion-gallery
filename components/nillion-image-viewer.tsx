"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ImageOff,
  Lock,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react"
import Image from "next/image"
import { nillionService, type NillionImageItem } from "@/services/nillion-service"
import { useToast } from "@/hooks/use-toast"
import { EncryptedImage } from "./encrypted-image"
import { JsonViewerModal } from "./json-viewer-modal"
import { useSupabase } from "@/contexts/supabase-context"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NillionImageViewerProps {
  autoDecrypt?: boolean
  onHasEncryptedImages?: (hasEncrypted: boolean) => void
}

const ITEMS_PER_PAGE = 20

export function NillionImageViewer({ autoDecrypt = false, onHasEncryptedImages }: NillionImageViewerProps) {
  const [images, setImages] = useState<NillionImageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPermissionError, setIsPermissionError] = useState(false)
  const [authError, setAuthError] = useState(false)
  const { toast } = useToast()
  const { user, isLoading: isUserLoading, isInitialized, refreshUser } = useSupabase()
  const router = useRouter()

  // Add a ref to track the previous autoDecrypt value
  const prevAutoDecryptRef = useRef(autoDecrypt)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Filtering state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterField, setFilterField] = useState<"name" | "cid">("name")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  // Use a ref to track if we've already loaded images
  const imagesLoadedRef = useRef(false)
  // Use a ref to track if we're currently loading images
  const loadingInProgressRef = useRef(false)
  // Use a ref to track if we've already tried to refresh the user
  const refreshAttemptedRef = useRef(false)

  // Update the previous autoDecrypt ref
  useEffect(() => {
    prevAutoDecryptRef.current = autoDecrypt
  }, [autoDecrypt])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      // Reset to page 1 when search changes
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter and paginate images
  const filteredImages = useMemo(() => {
    if (!debouncedSearchTerm) return images

    return images.filter((image) => {
      if (filterField === "name") {
        return image.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      } else if (filterField === "cid") {
        return image.cid?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      }
      return false
    })
  }, [images, debouncedSearchTerm, filterField])

  // Calculate pagination
  const totalItems = filteredImages.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredImages.slice(startIndex, endIndex)
  }, [filteredImages, currentPage])

  const loadImages = async () => {
    // Guard against concurrent loads
    if (loadingInProgressRef.current) {
      console.log("Frontend: Image loading already in progress, skipping")
      return
    }

    // Set loading flag
    loadingInProgressRef.current = true

    setIsLoading(true)
    setError(null)
    setIsPermissionError(false)
    setAuthError(false)

    // If user is not initialized yet, wait
    if (!isInitialized) {
      console.log("Auth not initialized yet, waiting...")
      setIsLoading(false)
      loadingInProgressRef.current = false
      return
    }

    // If no user is found after initialization, show auth error
    if (!user) {
      console.log("No user found after initialization")

      // If we haven't tried refreshing the user yet, try once
      if (!refreshAttemptedRef.current && !isUserLoading) {
        console.log("Attempting to refresh user...")
        refreshAttemptedRef.current = true
        await refreshUser()

        // If we now have a user, continue loading images
        if (user) {
          console.log("User refreshed successfully, continuing to load images")
          loadingInProgressRef.current = false
          loadImages()
          return
        }
      }

      setAuthError(true)
      setError("Authentication required to view images")
      setIsLoading(false)
      loadingInProgressRef.current = false
      return
    }

    try {
      console.log("Frontend: About to call nillionService.getImages()...")
      const result = await nillionService.getImages()
      console.log("Frontend: API call completed, response:", result)

      // Check if we got an authentication error
      if (result.authError) {
        console.log("Frontend: Authentication error loading images")
        setAuthError(true)
        setError("Authentication required to view images")

        // If the API indicates we should redirect to login
        if (result.redirectToLogin) {
          toast({
            title: "Authentication required",
            description: "Please sign in to view your images",
            variant: "destructive",
          })
          router.push("/auth/login")
        }

        setIsLoading(false)
        loadingInProgressRef.current = false
        return
      }

      // Check if we got an error message
      if (result.error) {
        console.error("Frontend: Error loading images:", result.error)

        // Check if it's a permission error
        if (
          result.error.includes("Permission denied") ||
          result.error.includes("Access Denied") ||
          result.error.includes("ResourceAccessDeniedError")
        ) {
          setIsPermissionError(true)
          setError(
            "Permission denied: Your account doesn't have access to this schema. Please contact the administrator.",
          )
        } else if (result.error.includes("Server error")) {
          setError(
            "Could not connect to the image storage service. This might be a temporary issue. Please try again later.",
          )
        } else {
          setError(`Error loading images: ${result.error}`)
        }

        // Still set empty images array to avoid undefined errors
        setImages([])
        setIsLoading(false)
        loadingInProgressRef.current = false
        return
      }

      console.log("Frontend: Received images:", result.data)
      setImages(result.data || [])

      // Check if there are encrypted images and notify parent component
      const encryptedImagesCount = result.data.filter((image) => image.isEncrypted && image.encryptionKey).length
      if (onHasEncryptedImages) {
        onHasEncryptedImages(encryptedImagesCount > 0)
      }

      setIsLoading(false)

      // Mark that we've loaded images
      imagesLoadedRef.current = true
    } catch (error) {
      console.error("Frontend: Error loading images from Nillion:", error)
      setError("Could not load images from Nillion. This might be a temporary issue. Please try again later.")
      setImages([])
      setIsLoading(false)
    } finally {
      // Clear loading flag
      loadingInProgressRef.current = false
    }
  }

  useEffect(() => {
    // Reset refresh attempt flag when user changes
    if (user) {
      refreshAttemptedRef.current = false
    }

    // Only load images if we haven't already loaded them and we have a user
    if (!imagesLoadedRef.current && user && isInitialized && !isUserLoading) {
      console.log("User authenticated and initialized, loading images...")
      loadImages()
    } else if (!isInitialized) {
      // If auth isn't initialized, just show loading
      console.log("Auth not initialized, showing loading...")
      setIsLoading(true)
    } else if (!user && isInitialized && !isUserLoading) {
      // If auth is initialized but no user, show auth error
      console.log("Auth initialized but no user, showing auth error...")
      setAuthError(true)
      setError("Authentication required to view images")
      setIsLoading(false)
    } else if (imagesLoadedRef.current) {
      // If we've already loaded images, just stop loading
      console.log("Images already loaded, stopping loading...")
      setIsLoading(false)
    }
  }, [user, isInitialized, isUserLoading, router, onHasEncryptedImages])

  // Force re-render when autoDecrypt changes
  useEffect(() => {
    console.log("NillionImageViewer: autoDecrypt changed to", autoDecrypt)

    // If we have images loaded, force a re-render of the EncryptedImage components
    if (images.length > 0) {
      // This will cause the component to re-render with the new autoDecrypt value
      setImages([...images])
    }
  }, [autoDecrypt])

  const extractEncryptionKey = (fullKey: string) => {
    try {
      // If the key contains image type information, extract just the key
      if (fullKey && typeof fullKey === "string" && fullKey.includes("|")) {
        return fullKey.split("|")[1]
      }
      return fullKey
    } catch (error) {
      console.error("Error extracting encryption key:", error)
      return ""
    }
  }

  const handleRefreshSession = async () => {
    // Reset the loaded flag so we'll reload images
    imagesLoadedRef.current = false
    refreshAttemptedRef.current = false

    setIsLoading(true)
    try {
      await refreshUser()
      toast({
        title: "Session refreshed",
        description: "Trying to load your images again",
      })

      // Manually trigger image loading
      if (user) {
        const result = await nillionService.getImages()
        if (result.authError) {
          setAuthError(true)
          setError("Authentication required to view images")

          // If the API indicates we should redirect to login
          if (result.redirectToLogin) {
            router.push("/auth/login")
          }
        } else if (result.error) {
          setError(`Error loading images: ${result.error}`)
          setImages([])
        } else {
          setImages(result.data || [])

          // Check if there are encrypted images and notify parent component
          const encryptedImagesCount = result.data.filter((image) => image.isEncrypted && image.encryptionKey).length
          if (onHasEncryptedImages) {
            onHasEncryptedImages(encryptedImagesCount > 0)
          }

          setAuthError(false)
          setError(null)
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error refreshing session:", error)
      toast({
        title: "Failed to refresh session",
        description: "Please try signing in again",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setCurrentPage(1)
  }

  // If still initializing auth, show loading
  if (!isInitialized || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    )
  }

  // Handle authentication error
  if (authError) {
    return (
      <Card className="w-full p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <div>
            <h3 className="text-lg font-medium">Authentication Required</h3>
            <p className="text-muted-foreground mt-1">Please sign in to view your images</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/auth/login")}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshSession}
              className="mt-2 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // Handle permission error specifically
  if (isPermissionError) {
    return (
      <Card className="w-full p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <ShieldAlert className="h-16 w-16 text-amber-500" />
          <div>
            <h3 className="text-lg font-medium">Permission Error</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              This is likely due to an issue with the schema ID used to access SecretVault.
              <br />
              You can still upload images, but you may not be able to view them until this is resolved.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                imagesLoadedRef.current = false
                refreshAttemptedRef.current = false
                setIsPermissionError(false)
                handleRefreshSession()
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <div>
            <h3 className="text-lg font-medium">Error Loading Images</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                imagesLoadedRef.current = false
                refreshAttemptedRef.current = false
                handleRefreshSession()
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!images || images.length === 0) {
    return (
      <Card className="w-full p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <ImageOff className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">No images found</h3>
            <p className="text-muted-foreground mt-1">
              Your gallery is empty. Use the "Add Image" button to get started.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search by ${filterField}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-base sm:text-sm focus-visible:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterField} onValueChange={(value) => setFilterField(value as "name" | "cid")}>
            <SelectTrigger className="w-full sm:w-[140px] h-11 focus:ring-blue-500">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="cid">CID</SelectItem>
            </SelectContent>
          </Select>
          {debouncedSearchTerm && (
            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="h-11 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          {totalItems === 0
            ? "No images found"
            : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of ${totalItems} images`}
        </div>
        {totalPages > 1 && (
          <div>
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* No results message */}
      {filteredImages.length === 0 && debouncedSearchTerm && (
        <div className="text-center py-12">
          <ImageOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No matching images</h3>
          <p className="text-muted-foreground mt-1">Try a different search term</p>
          <Button
            variant="outline"
            className="mt-4 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleClearSearch}
          >
            Clear Search
          </Button>
        </div>
      )}

      {/* Image grid */}
      {paginatedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedImages.map((image) => (
            <Card key={image._id} className="overflow-hidden">
              <div className="relative aspect-video">
                {image.isEncrypted && image.encryptionKey ? (
                  <EncryptedImage
                    src={image.imageUrl}
                    alt={image.name}
                    encryptionKey={extractEncryptionKey(image.encryptionKey)}
                    className="object-cover w-full h-full"
                    autoDecrypt={autoDecrypt}
                  />
                ) : (
                  <Image
                    src={image.imageUrl || "/placeholder.svg"}
                    alt={image.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback for invalid images
                      ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                    }}
                  />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium break-words">{image.name}</p>
                  <div className="flex items-center gap-2">
                    {image.isEncrypted && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(image.timestamp).toLocaleString()}</p>
                {image.cid && <p className="text-xs text-muted-foreground mt-1 truncate">CID: {image.cid}</p>}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(image.imageUrl, "_blank")}
                    className="flex items-center gap-1 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on IPFS
                  </Button>
                  <JsonViewerModal data={image} title={`Record Details: ${image.name}`} />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center px-4">
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
