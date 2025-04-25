export interface NillionImageItem {
  _id: string
  imageUrl: string
  name: string
  timestamp: number
  cid?: string
  isEncrypted?: boolean
  encryptionKey?: string
  userId?: string
  userEmail?: string
}

export interface ImagesResponse {
  data: NillionImageItem[]
  authError: boolean
  error?: string
  redirectToLogin?: boolean
  isFetchError?: boolean
  suggestion?: string
  message?: string
}

// Add a simple cache to prevent excessive API calls
let cachedImages: NillionImageItem[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 10000 // 10 seconds

export const nillionService = {
  /**
   * Get all images from Nillion via API
   */
  getImages: async (): Promise<ImagesResponse> => {
    try {
      // Check if we have a recent cache
      const now = Date.now()
      if (cachedImages && now - lastFetchTime < CACHE_DURATION) {
        console.log("Frontend: Using cached images data")
        return { data: cachedImages, authError: false }
      }

      console.log("Frontend: Fetching images from API...")

      // Add a cache-busting parameter to prevent caching issues
      const timestamp = new Date().getTime()

      // Log the exact URL we're fetching
      const url = `/api/nillion/images?_=${timestamp}`
      console.log("Frontend: Fetching from URL:", url)

      const response = await fetch(url, {
        // Add headers to prevent caching
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      console.log(`Frontend: API response status: ${response.status}`)

      // Check for authentication error
      if (response.status === 401) {
        console.log("Frontend: Authentication required (401)")

        // Try to parse the response to check if we should redirect
        try {
          // Clone the response before reading it
          const clonedResponse = response.clone()
          const errorData = await clonedResponse.json()
          return {
            data: [],
            authError: true,
            redirectToLogin: errorData.redirectToLogin || false,
            error: errorData.error || "Authentication required",
          }
        } catch (parseError) {
          // If we can't parse the response, just return a generic auth error
          return { data: [], authError: true }
        }
      }

      // If we get a 404 or other error status, return an empty array
      if (response.status === 404) {
        console.log("Frontend: No images found (404)")
        return {
          data: [],
          authError: false,
          error: "Resource not found. The image storage may not be properly configured.",
        }
      }

      // For 500 errors, try to get the response as JSON first, then as text if that fails
      if (response.status === 500) {
        // Clone the response before attempting to read it
        const responseClone = response.clone()

        try {
          const errorData = await response.json()
          console.error("Frontend: Server error (500):", errorData)

          // Check if it's a permission error
          if (
            (errorData.error &&
              (errorData.error.includes("ResourceAccessDeniedError") || errorData.error.includes("Access Denied"))) ||
            (errorData.message &&
              (errorData.message.includes("ResourceAccessDeniedError") || errorData.message.includes("Access Denied")))
          ) {
            return {
              data: [],
              authError: false,
              error:
                "Permission denied: Your account doesn't have access to this schema. Please contact the administrator.",
              message:
                "The schema ID used for SecretVault may be incorrect or your account doesn't have permission to access it.",
            }
          }

          return {
            data: [],
            authError: false,
            error: errorData.error || `Server error: ${JSON.stringify(errorData).substring(0, 100)}...`,
          }
        } catch (jsonError) {
          // If JSON parsing fails, try to get the text
          try {
            const errorText = await responseClone.text()
            console.error("Frontend: Server error text:", errorText)

            // Check if it's a permission error
            if (errorText.includes("ResourceAccessDeniedError") || errorText.includes("Access Denied")) {
              return {
                data: [],
                authError: false,
                error:
                  "Permission denied: Your account doesn't have access to this schema. Please contact the administrator.",
              }
            }

            return {
              data: [],
              authError: false,
              error: `Server error: ${errorText.substring(0, 100)}...`,
            }
          } catch (textError) {
            console.error("Frontend: Failed to get error text:", textError)
            return {
              data: [],
              authError: false,
              error: "Server error (500)",
            }
          }
        }
      }

      // Check for other error statuses
      if (!response.ok) {
        // Clone the response before attempting to read it
        const responseClone = response.clone()

        // Try to parse error as JSON if possible
        try {
          const errorData = await response.json()
          console.error("Frontend: API error:", errorData)
          return {
            data: [],
            authError: false,
            error: errorData.error || `API error: ${response.status}`,
          }
        } catch (parseError) {
          // If JSON parsing fails, use the status text
          try {
            const errorText = await responseClone.text()
            console.error("Frontend: API error text:", errorText)
            return {
              data: [],
              authError: false,
              error: `API error: ${response.status} - ${errorText.substring(0, 100)}`,
            }
          } catch (textError) {
            console.error("Frontend: Failed to get error text:", textError)
            return {
              data: [],
              authError: false,
              error: `API error: ${response.status} ${response.statusText}`,
            }
          }
        }
      }

      // Try to parse the response as JSON
      try {
        // Clone the response before reading it
        const responseClone = response.clone()

        try {
          const data = await response.json()
          console.log("Frontend: API response:", data)

          // Even if success is false, if we have a message, show it instead of treating as an error
          if (!data.success && !data.message) {
            return {
              data: [],
              authError: false,
              error: data.error || "API returned unsuccessful response",
            }
          }

          // Update cache
          cachedImages = data.data || []
          lastFetchTime = now

          // If there's a message but we still got data, include it in the response
          if (data.message) {
            console.log("Frontend: API message:", data.message)
            return {
              data: data.data || [],
              authError: false,
              message: data.message,
            }
          }

          return { data: data.data || [], authError: false }
        } catch (jsonError) {
          // If JSON parsing fails, try to get the text
          try {
            const responseText = await responseClone.text()
            console.error("Frontend: Raw response:", responseText.substring(0, 200))
            return {
              data: [],
              authError: false,
              error: "Failed to parse server response as JSON",
            }
          } catch (textError) {
            console.error("Frontend: Failed to get response text:", textError)
            return {
              data: [],
              authError: false,
              error: "Failed to parse server response",
            }
          }
        }
      } catch (error) {
        console.error("Frontend: Failed to process response:", error)
        return {
          data: [],
          authError: false,
          error: "Failed to process server response",
        }
      }
    } catch (error) {
      console.error("Frontend: ❌ Failed to fetch images from API:", error)
      // Instead of throwing the error, return an empty array
      return {
        data: [],
        authError: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },

  /**
   * Clear the image cache
   */
  clearCache: () => {
    cachedImages = null
    lastFetchTime = 0
  },

  /**
   * Get an image by ID from Nillion via API
   */
  getImageById: async (id: string): Promise<NillionImageItem | null> => {
    if (!id) {
      console.error("Frontend: Invalid image ID provided")
      return null
    }

    try {
      console.log(`Frontend: Fetching image ${id} from API...`)

      // Add a cache-busting parameter to prevent caching issues
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/nillion/images/${id}?_=${timestamp}`, {
        // Add headers to prevent caching
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (response.status === 401) {
        console.log(`Frontend: Authentication required (401)`)
        return null
      }

      if (response.status === 403) {
        console.log(`Frontend: Permission denied (403)`)
        return null
      }

      if (response.status === 404) {
        console.log(`Frontend: Image ${id} not found`)
        return null
      }

      if (!response.ok) {
        // Clone the response before reading it
        const responseClone = response.clone()

        try {
          const errorData = await response.json()
          console.error("Frontend: API error:", errorData)
          throw new Error(errorData.error || "Failed to fetch image from API")
        } catch (parseError) {
          try {
            const errorText = await responseClone.text()
            console.error("Frontend: API error text:", errorText)
            throw new Error(`Failed to fetch image from API: ${errorText.substring(0, 100)}`)
          } catch (textError) {
            throw new Error(`Failed to fetch image from API: ${response.status} ${response.statusText}`)
          }
        }
      }

      // Clone the response before reading it
      const responseClone = response.clone()

      try {
        const data = await response.json()
        console.log(`Frontend: API response for image ${id}:`, data)

        if (!data.success) {
          throw new Error(data.error || "API returned unsuccessful response")
        }

        return data.data || null
      } catch (jsonError) {
        try {
          const responseText = await responseClone.text()
          console.error("Frontend: Failed to parse JSON response:", responseText.substring(0, 200))
          throw new Error("Failed to parse server response as JSON")
        } catch (textError) {
          throw new Error("Failed to parse server response")
        }
      }
    } catch (error) {
      console.error(`Frontend: ❌ Failed to fetch image ${id} from API:`, error)
      return null
    }
  },
}
