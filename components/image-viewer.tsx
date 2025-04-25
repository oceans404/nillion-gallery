"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, ImageOff, Lock, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { imageService, type PaginatedResponse } from "@/services/image-service"
import { useToast } from "@/hooks/use-toast"
import { EncryptedImage } from "./encrypted-image"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { JsonViewerModal } from "./json-viewer-modal"

const ITEMS_PER_PAGE = 20
const DEFAULT_SCHEMA_ID = "default"

export function ImageViewer() {
  const [imagesData, setImagesData] = useState<PaginatedResponse>({
    images: [],
    total: 0,
    page: 1,
    totalPages: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [schemaId, setSchemaId] = useState(DEFAULT_SCHEMA_ID)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current page from URL or default to 1
  const currentPage = Number.parseInt(searchParams.get("page") || "1")

  // Load images when page, search, or schema changes
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true)
      try {
        const data = await imageService.getPaginatedImages(currentPage, ITEMS_PER_PAGE, debouncedSearch, schemaId)
        setImagesData(data)
      } catch (error) {
        console.error("Error loading images:", error)
        toast({
          title: "Error loading images",
          description: "Please try refreshing the page",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [currentPage, debouncedSearch, schemaId, toast])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      // Reset to page 1 when search changes
      if (currentPage !== 1) {
        router.push(`/view?page=1&schemaId=${schemaId}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""}`)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, currentPage, schemaId, router])

  // Update search term and schema ID from URL on initial load
  useEffect(() => {
    const urlSearch = searchParams.get("search") || ""
    if (urlSearch && urlSearch !== searchTerm) {
      setSearchTerm(urlSearch)
    }

    const urlSchemaId = searchParams.get("schemaId") || DEFAULT_SCHEMA_ID
    if (urlSchemaId !== schemaId) {
      setSchemaId(urlSchemaId)
    }
  }, [searchParams, searchTerm, schemaId])

  const deleteImage = async (id: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      const success = await imageService.deleteImage(id, schemaId)
      if (success) {
        // Refresh the current page
        const data = await imageService.getPaginatedImages(currentPage, ITEMS_PER_PAGE, debouncedSearch, schemaId)
        setImagesData(data)

        toast({
          title: "Image deleted",
          description: "The image has been removed from your gallery",
        })
      } else {
        toast({
          title: "Delete failed",
          description: "Could not delete the image. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const extractEncryptionKey = (fullKey: string) => {
    // If the key contains image type information, extract just the key
    if (fullKey.includes("|")) {
      return fullKey.split("|")[1]
    }
    return fullKey
  }

  const handleNextPage = () => {
    if (currentPage < imagesData.totalPages) {
      router.push(
        `/view?page=${currentPage + 1}&schemaId=${schemaId}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
      )
      window.scrollTo(0, 0)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      router.push(
        `/view?page=${currentPage - 1}&schemaId=${schemaId}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
      )
      window.scrollTo(0, 0)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearch(searchTerm)
    router.push(`/view?page=1&schemaId=${schemaId}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (imagesData.total === 0 && !debouncedSearch) {
    return (
      <Card className="w-full p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <ImageOff className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">No images found</h3>
            <p className="text-muted-foreground mt-1">Your gallery is empty. Upload some images to get started.</p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/">Upload an Image</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search images by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </form>

      {/* Results info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div>
          {imagesData.total === 0
            ? "No images found"
            : `Showing ${(imagesData.page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(imagesData.page * ITEMS_PER_PAGE, imagesData.total)} of ${imagesData.total} images`}
        </div>
        {imagesData.totalPages > 1 && (
          <div>
            Page {imagesData.page} of {imagesData.totalPages}
          </div>
        )}
      </div>

      {imagesData.images.length === 0 ? (
        <div className="text-center py-12">
          <ImageOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No matching images</h3>
          <p className="text-muted-foreground mt-1">Try a different search term</p>
          {debouncedSearch && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchTerm("")
                setDebouncedSearch("")
                router.push(`/view?page=1&schemaId=${schemaId}`)
              }}
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imagesData.images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative aspect-video">
                  {image.isEncrypted && image.encryptionKey ? (
                    <EncryptedImage
                      src={image.imageUrl}
                      alt={image.name}
                      encryptionKey={extractEncryptionKey(image.encryptionKey)}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Image src={image.imageUrl || "/placeholder.svg"} alt={image.name} fill className="object-cover" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium break-words">{image.name}</p>
                    {image.isEncrypted && (
                      <div className="flex items-center gap-1">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
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
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on IPFS
                    </Button>
                    <JsonViewerModal data={image} title={`Record Details: ${image.name}`} />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteImage(image.id)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination controls */}
          {imagesData.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={imagesData.page === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center px-4">
                <span className="text-sm">
                  Page {imagesData.page} of {imagesData.totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={imagesData.page === imagesData.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
