export interface ImageItem {
  id: string
  imageUrl: string
  name: string
  timestamp: number
  cid?: string
  isEncrypted?: boolean
  encryptionKey?: string
}

export interface PaginatedResponse {
  images: ImageItem[]
  total: number
  page: number
  totalPages: number
}

/**
 * Service for managing image uploads to Pinata IPFS
 */
export const imageService = {
  /**
   * Upload an image to Pinata without storing in localStorage
   */
  uploadToPinata: async (
    imageData: string,
    name: string,
    isEncrypted = false,
    encryptionKey?: string,
  ): Promise<ImageItem> => {
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData)
      const blob = await base64Response.blob()

      // Create a file from the blob with the provided name
      const fileExtension = blob.type.split("/")[1] || "png"
      const sanitizedName = name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase()
      const filename = `${sanitizedName}_${Date.now()}.${fileExtension}`
      const file = new File([blob], filename, { type: blob.type })

      // Upload to Pinata
      const formData = new FormData()
      formData.append("file", file)
      formData.append("network", "public")

      // Add metadata with the image name
      const pinataMetadata = JSON.stringify({
        name: name.trim(),
        keyvalues: {
          name: name.trim(),
          timestamp: Date.now().toString(),
          isEncrypted: isEncrypted.toString(),
        },
      })
      formData.append("pinataMetadata", pinataMetadata)

      const JWT = process.env.NEXT_PUBLIC_PINATA_JWT
      if (!JWT) {
        throw new Error("Pinata JWT not found")
      }

      const pinataResponse = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JWT}`,
        },
        body: formData,
      })

      if (!pinataResponse.ok) {
        throw new Error(`Pinata upload failed: ${pinataResponse.statusText}`)
      }

      const pinataData = await pinataResponse.json()
      const cid = pinataData.data?.cid

      if (!cid) {
        throw new Error("Failed to get CID from Pinata")
      }

      // Construct gateway URL
      const gatewayDomain = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud"
      const imageUrl = `https://${gatewayDomain}/ipfs/${cid}`

      // Create new image item
      const newImage: ImageItem = {
        id: crypto.randomUUID(),
        imageUrl,
        name: name.trim(),
        timestamp: Date.now(),
        cid,
        isEncrypted,
        encryptionKey: isEncrypted ? encryptionKey : undefined,
      }

      return newImage
    } catch (error) {
      console.error("Error uploading to Pinata:", error)
      throw new Error("Failed to upload to Pinata: " + (error instanceof Error ? error.message : String(error)))
    }
  },

  getPaginatedImages: async (page = 1, limit = 20, search = "", schemaId = "default"): Promise<PaginatedResponse> => {
    try {
      // Fetch all images (replace with your actual API endpoint)
      const response = await fetch(`/api/nillion/images?schemaId=${schemaId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`)
      }
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch images")
      }

      let images: ImageItem[] = data.data.map((item: any) => ({
        id: item._id,
        imageUrl: item.imageUrl,
        name: item.name,
        timestamp: item.timestamp,
        cid: item.cid,
        isEncrypted: item.isEncrypted,
        encryptionKey: item.encryptionKey,
      }))

      // Filter images based on search term
      if (search) {
        images = images.filter((image) => image.name.toLowerCase().includes(search.toLowerCase()))
      }

      const total = images.length
      const totalPages = Math.ceil(total / limit)
      const startIndex = (page - 1) * limit
      const endIndex = page * limit
      const paginatedImages = images.slice(startIndex, endIndex)

      return {
        images: paginatedImages,
        total,
        page,
        totalPages,
      }
    } catch (error) {
      console.error("Error fetching paginated images:", error)
      throw error
    }
  },

  deleteImage: async (id: string, schemaId: string): Promise<boolean> => {
    try {
      // Placeholder for delete logic - replace with your actual API endpoint
      console.log(`Deleting image with ID: ${id} from schema: ${schemaId}`)
      // const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      // if (!response.ok) {
      //   throw new Error(`Failed to delete image: ${response.statusText}`);
      // }
      // const data = await response.json();
      // return data.success;
      return true
    } catch (error) {
      console.error("Error deleting image:", error)
      return false
    }
  },
}
