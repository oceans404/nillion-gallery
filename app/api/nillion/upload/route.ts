import { NextResponse } from "next/server"
import { SecretVaultWrapper } from "secretvaults"
import { orgConfig, SCHEMA_ID } from "@/lib/nillion-config"
import { handleServerError } from "@/lib/error-handler"

export async function POST(request: Request) {
  console.log("API: Uploading image to Nillion...")

  try {
    // Parse the request body
    const body = await request.json()
    const { image } = body

    if (!image) {
      return NextResponse.json({ success: false, error: "No image data provided" }, { status: 400 })
    }

    console.log("API: Image data received:", {
      ...image,
      encryptionKey: image.encryptionKey ? "***REDACTED***" : undefined,
      userEmail: image.userEmail ? "***REDACTED***" : undefined,
    })

    // Prepare the image data for Nillion
    // Make sure it has all required fields
    const imageData = {
      _id: image.id || crypto.randomUUID(), // Use _id for Nillion
      imageUrl: image.imageUrl,
      name: image.name,
      timestamp: image.timestamp || Date.now(),
      cid: image.cid || "",
      isEncrypted: image.isEncrypted || false,
      // Use %allot syntax for the encryption key to encrypt it across nodes
      encryptionKey: image.encryptionKey ? { "%allot": image.encryptionKey } : "",
      // Use %allot syntax for the userEmail to encrypt it across nodes
      userEmail: image.userEmail ? { "%allot": image.userEmail } : "",
      userId: image.userId || "",
    }

    console.log("API: Creating SecretVaultWrapper instance...")
    const collection = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials, SCHEMA_ID)

    console.log("API: Initializing SecretVaultWrapper...")
    await collection.init()
    console.log("API: SecretVaultWrapper initialized successfully")

    console.log("API: Writing data to nodes...")
    const dataWritten = await collection.writeToNodes([imageData])
    console.log("API: Data written successfully:", dataWritten)

    // Extract the created IDs
    const createdIds = dataWritten.flatMap((item) => item.data.created || [])
    console.log("API: Created IDs:", createdIds)

    return NextResponse.json({
      success: true,
      message: "Image uploaded to Nillion successfully",
      id: createdIds[0] || imageData._id,
      image: {
        ...imageData,
        id: imageData._id, // Return id instead of _id for frontend consistency
      },
    })
  } catch (error) {
    handleServerError(error, "upload to Nillion")

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
