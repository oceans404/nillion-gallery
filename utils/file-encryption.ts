/**
 * File Encryption Utility
 *
 * A comprehensive utility for encrypting and decrypting files using the Web Crypto API.
 * This module provides functions for generating encryption keys, encrypting files,
 * and decrypting files with AES-GCM encryption.
 */

// ======== Types ========

/**
 * Options for encrypting a file
 */
export interface EncryptOptions {
  /**
   * The encryption key to use (hex string)
   * If not provided, a new key will be generated
   */
  key?: string
}

/**
 * Options for decrypting a file
 */
export interface DecryptOptions {
  /**
   * The encryption key to use (hex string)
   */
  key: string
}

/**
 * Result of an encryption operation
 */
export interface EncryptionResult {
  /**
   * The encrypted data as a base64 string
   * If the input was a data URL, this will be a data URL
   */
  encryptedData: string
  /**
   * The encryption key as a hex string
   */
  key: string
  /**
   * The original mime type of the file
   */
  mimeType: string
}

/**
 * Result of a decryption operation
 */
export interface DecryptionResult {
  /**
   * The decrypted data as a base64 string
   * If the input was a data URL, this will be a data URL
   */
  decryptedData: string
  /**
   * The mime type of the decrypted file
   */
  mimeType: string
}

// ======== Helper Functions ========

/**
 * Convert a string to a Uint8Array
 */
const stringToBuffer = (str: string): Uint8Array => {
  return new TextEncoder().encode(str)
}

/**
 * Convert a Uint8Array to a string
 */
const bufferToString = (buffer: ArrayBuffer): string => {
  return new TextDecoder().decode(buffer)
}

/**
 * Convert a hex string to a Uint8Array
 */
const hexStringToBuffer = (hexString: string): Uint8Array => {
  const pairs = hexString.match(/[\da-f]{2}/gi) || []
  const integers = pairs.map((s) => Number.parseInt(s, 16))
  return new Uint8Array(integers)
}

/**
 * Convert a Uint8Array to a hex string
 */
const bufferToHexString = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Convert a base64 string to an ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  if (!base64 || typeof base64 !== "string") {
    console.error("Invalid base64 string provided to base64ToArrayBuffer")
    return new ArrayBuffer(0)
  }

  // Remove data URL prefix if present
  const base64String = base64.includes("base64,") ? base64.split("base64,")[1] : base64

  try {
    const binaryString = atob(base64String)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  } catch (error) {
    console.error("Error converting base64 to ArrayBuffer:", error)
    throw new Error("Invalid base64 encoding")
  }
}

/**
 * Convert an ArrayBuffer to a base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Extract the mime type from a data URL
 */
const getMimeTypeFromDataUrl = (dataUrl: string): string => {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return "application/octet-stream" // Default mime type
  }

  const match = dataUrl.match(/data:([^;]+);/)
  return match ? match[1] : "application/octet-stream"
}

/**
 * Convert a File object to a base64 data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a base64 data URL to a Blob
 */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl)
  return await response.blob()
}

// ======== Core Encryption Functions ========

/**
 * Generate a random encryption key
 * @returns A hex string representation of the key
 */
export const generateEncryptionKey = (): string => {
  // Generate a random 256-bit key (32 bytes)
  const key = crypto.getRandomValues(new Uint8Array(32))
  // Convert to hex string for storage
  return bufferToHexString(key)
}

/**
 * Encrypt a file with AES-GCM
 *
 * @param file The file to encrypt
 * @param options Encryption options
 * @returns Promise resolving to the encryption result
 *
 * @example
 * // Encrypt a file with a new key
 * const file = new File([...], 'example.jpg', { type: 'image/jpeg' });
 * const result = await encryptFile(file);
 * console.log('Encrypted data:', result.encryptedData);
 * console.log('Encryption key:', result.key);
 *
 * @example
 * // Encrypt a file with an existing key
 * const file = new File([...], 'example.jpg', { type: 'image/jpeg' });
 * const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
 * const result = await encryptFile(file, { key });
 */
export const encryptFile = async (file: File, options: EncryptOptions = {}): Promise<EncryptionResult> => {
  try {
    // Convert file to data URL
    const dataUrl = await fileToDataUrl(file)

    // Use the provided key or generate a new one
    const key = options.key || generateEncryptionKey()

    // Encrypt the data URL
    const encryptedData = await encryptData(dataUrl, { key })

    return {
      encryptedData,
      key,
      mimeType: file.type,
    }
  } catch (error) {
    console.error("File encryption error:", error)
    throw new Error("Failed to encrypt file: " + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * Encrypt data (as a string or data URL)
 *
 * @param data The data to encrypt (can be a data URL or any string)
 * @param options Encryption options
 * @returns Promise resolving to the encrypted data
 *
 * @example
 * // Encrypt a data URL
 * const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
 * const result = await encryptData(dataUrl);
 * console.log('Encrypted data:', result);
 * console.log('Encryption key:', result.key);
 */
export const encryptData = async (data: string, options: EncryptOptions = {}): Promise<string> => {
  try {
    let prefix = ""
    let base64Data = data

    // Check if this is a data URL and extract the prefix
    if (data.includes("base64,")) {
      ;[prefix, base64Data] = data.split("base64,")
      prefix = prefix + "base64,"
    }

    // Use the provided key or generate a new one
    const key = options.key || generateEncryptionKey()

    // Convert hex key string to Uint8Array
    const keyData = hexStringToBuffer(key)

    // Import the key for use with AES-GCM
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
    ])

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the data
    const dataBuffer = base64ToArrayBuffer(base64Data)
    const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, dataBuffer)

    // Combine IV and encrypted data
    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength)
    encryptedArray.set(iv, 0)
    encryptedArray.set(new Uint8Array(encryptedData), iv.length)

    // Convert to base64 and include the original prefix if it existed
    return `${prefix}${arrayBufferToBase64(encryptedArray.buffer)}`
  } catch (error) {
    console.error("Data encryption error:", error)
    throw new Error("Failed to encrypt data: " + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * Decrypt a file with AES-GCM
 *
 * @param encryptedBlob The encrypted file as a Blob
 * @param options Decryption options
 * @returns Promise resolving to the decryption result
 *
 * @example
 * // Decrypt a file
 * const encryptedBlob = new Blob([...]);
 * const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
 * const result = await decryptFile(encryptedBlob, { key });
 * console.log('Decrypted data:', result.decryptedData);
 */
export const decryptFile = async (encryptedBlob: Blob, options: DecryptOptions): Promise<DecryptionResult> => {
  try {
    // Convert blob to data URL
    const dataUrl = await fileToDataUrl(new File([encryptedBlob], "encrypted", { type: encryptedBlob.type }))

    // Decrypt the data URL
    const decryptedData = await decryptData(dataUrl, options)

    // Extract mime type from the decrypted data URL
    const mimeType = getMimeTypeFromDataUrl(decryptedData)

    return {
      decryptedData,
      mimeType,
    }
  } catch (error) {
    console.error("File decryption error:", error)
    throw new Error("Failed to decrypt file: " + (error instanceof Error ? error.message : String(error)))
  }
}

/**
 * Decrypt data (as a string or data URL)
 *
 * @param encryptedData The encrypted data (can be a data URL or any string)
 * @param options Decryption options
 * @returns Promise resolving to the decrypted data
 *
 * @example
 * // Decrypt a data URL
 * const encryptedData = 'data:image/jpeg;base64,IV+EncryptedContent...';
 * const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
 * const decryptedData = await decryptData(encryptedData, { key });
 */
export const decryptData = async (encryptedData: string, options: DecryptOptions): Promise<string> => {
  try {
    if (!encryptedData) {
      throw new Error("No encrypted data provided")
    }

    // Extract image type and data
    let prefix, base64Data

    if (encryptedData.includes("base64,")) {
      ;[prefix, base64Data] = encryptedData.split("base64,")
      prefix = prefix + "base64,"
    } else {
      // If there's no prefix, assume it's just base64 data
      prefix = "data:application/octet-stream;base64,"
      base64Data = encryptedData
    }

    // Ensure we have valid base64 data
    if (!base64Data || base64Data.trim() === "") {
      throw new Error("Invalid base64 data")
    }

    // Convert hex key string to Uint8Array
    const keyData = hexStringToBuffer(options.key)

    // Import the key for use with AES-GCM
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM", length: 256 }, false, [
      "decrypt",
    ])

    // Convert base64 to ArrayBuffer
    const encryptedBuffer = base64ToArrayBuffer(base64Data)
    const encryptedArray = new Uint8Array(encryptedBuffer)

    // Check if we have enough data for IV and content
    if (encryptedArray.length <= 12) {
      throw new Error("Encrypted data is too short")
    }

    // Extract IV and encrypted data
    const iv = encryptedArray.slice(0, 12)
    const encryptedContent = encryptedArray.slice(12)

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encryptedContent)

    // Convert back to base64 and include the original prefix
    const result = `${prefix}${arrayBufferToBase64(decryptedData)}`

    return result
  } catch (error) {
    console.error("Data decryption error:", error)
    throw new Error(
      "Failed to decrypt data. The key may be incorrect: " + (error instanceof Error ? error.message : String(error)),
    )
  }
}

/**
 * Create a File object from decrypted data
 *
 * @param decryptedData The decrypted data (usually a data URL)
 * @param fileName The name to give the file
 * @returns Promise resolving to a File object
 *
 * @example
 * // Create a file from decrypted data
 * const decryptedData = 'data:image/jpeg;base64,...';
 * const file = await createFileFromDecryptedData(decryptedData, 'decrypted-image.jpg');
 */
export const createFileFromDecryptedData = async (decryptedData: string, fileName: string): Promise<File> => {
  const blob = await dataUrlToBlob(decryptedData)
  return new File([blob], fileName, { type: blob.type })
}

/**
 * Encrypt a file and return both the encrypted file and the key
 * This is a convenience function that combines multiple steps
 *
 * @param file The file to encrypt
 * @returns Promise resolving to an object with the encrypted file and key
 *
 * @example
 * // Encrypt a file and get both the encrypted file and key
 * const file = new File([...], 'example.jpg', { type: 'image/jpeg' });
 * const { encryptedFile, key } = await encryptFileWithKey(file);
 */
export const encryptFileWithKey = async (
  file: File,
): Promise<{
  encryptedFile: File
  key: string
}> => {
  const { encryptedData, key, mimeType } = await encryptFile(file)

  // Convert the encrypted data URL back to a File
  const blob = await dataUrlToBlob(encryptedData)
  const encryptedFile = new File([blob], `encrypted-${file.name}`, { type: mimeType })

  return { encryptedFile, key }
}

/**
 * Decrypt a file with a key and return the decrypted file
 * This is a convenience function that combines multiple steps
 *
 * @param encryptedFile The encrypted file
 * @param key The encryption key (hex string)
 * @param fileName Optional name for the decrypted file
 * @returns Promise resolving to the decrypted file
 *
 * @example
 * // Decrypt a file with a key
 * const encryptedFile = new File([...], 'encrypted.jpg');
 * const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
 * const decryptedFile = await decryptFileWithKey(encryptedFile, key, 'decrypted.jpg');
 */
export const decryptFileWithKey = async (encryptedFile: File, key: string, fileName?: string): Promise<File> => {
  const { decryptedData, mimeType } = await decryptFile(encryptedFile, { key })

  // Use the provided fileName or generate one based on the original
  const outputFileName = fileName || `decrypted-${encryptedFile.name.replace("encrypted-", "")}`

  // Convert the decrypted data URL back to a File
  const blob = await dataUrlToBlob(decryptedData)
  return new File([blob], outputFileName, { type: mimeType })
}
