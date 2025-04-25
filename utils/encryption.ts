// Simple implementation to avoid any complex operations that might cause errors
export const generateEncryptionKey = (): string => {
  // Generate a random 256-bit key (32 bytes)
  const key = crypto.getRandomValues(new Uint8Array(32))
  // Convert to hex string for storage
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export const encryptImage = async (imageData: string, key: string): Promise<string> => {
  try {
    let prefix = ""
    let base64Data = imageData

    // Check if this is a data URL and extract the prefix
    if (imageData.includes("base64,")) {
      const parts = imageData.split("base64,")
      prefix = parts[0] + "base64,"
      base64Data = parts[1]
    }

    // Convert hex key string to Uint8Array
    const keyData = new Uint8Array((key.match(/.{1,2}/g) || []).map((byte) => Number.parseInt(byte, 16)))

    // Import the key for use with AES-GCM
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
    ])

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, bytes)

    // Combine IV and encrypted data
    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength)
    encryptedArray.set(iv, 0)
    encryptedArray.set(new Uint8Array(encryptedData), iv.length)

    // Convert to base64
    let binary = ""
    const bytes2 = new Uint8Array(encryptedArray)
    for (let i = 0; i < bytes2.byteLength; i++) {
      binary += String.fromCharCode(bytes2[i])
    }
    const base64 = btoa(binary)

    // Return with the original prefix if it existed
    return `${prefix}${base64}`
  } catch (error) {
    console.error("Image encryption error:", error)
    throw new Error("Failed to encrypt image: " + (error instanceof Error ? error.message : String(error)))
  }
}

export const decryptImage = async (encryptedData: string, key: string): Promise<string> => {
  try {
    if (!encryptedData) {
      throw new Error("No encrypted data provided")
    }

    // Extract image type and data
    let prefix = ""
    let base64Data = encryptedData

    // Check if this is a data URL and extract the prefix
    if (encryptedData.includes("base64,")) {
      const parts = encryptedData.split("base64,")
      prefix = parts[0] + "base64,"
      base64Data = parts[1]
    }

    // Ensure we have valid base64 data
    if (!base64Data || base64Data.trim() === "") {
      throw new Error("Invalid base64 data")
    }

    // Convert hex key string to Uint8Array
    const keyData = new Uint8Array((key.match(/.{1,2}/g) || []).map((byte) => Number.parseInt(byte, 16)))

    // Import the key for use with AES-GCM
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM", length: 256 }, false, [
      "decrypt",
    ])

    // Convert base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Check if we have enough data for IV and content
    if (bytes.length <= 12) {
      throw new Error("Encrypted data is too short")
    }

    // Extract IV and encrypted data
    const iv = bytes.slice(0, 12)
    const encryptedContent = bytes.slice(12)

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encryptedContent)

    // Convert back to base64
    let binary = ""
    const decryptedBytes = new Uint8Array(decryptedData)
    for (let i = 0; i < decryptedBytes.byteLength; i++) {
      binary += String.fromCharCode(decryptedBytes[i])
    }
    const base64 = btoa(binary)

    // Return with the original prefix
    return `${prefix}${base64}`
  } catch (error) {
    console.error("Image decryption error:", error)
    throw new Error("Failed to decrypt image: " + (error instanceof Error ? error.message : String(error)))
  }
}
