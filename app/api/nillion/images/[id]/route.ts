import { NextResponse } from "next/server"
import { SecretVaultWrapper } from "secretvaults"
import { orgConfig, SCHEMA_ID } from "@/lib/nillion-config"
import { handleServerError } from "@/lib/error-handler"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  console.log(`API: Fetching image ${id} from Nillion...`)

  try {
    // Get the current user from Supabase
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("API: No authenticated user found")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      )
    }

    const userId = user.id
    console.log(`API: Fetching image for user: ${userId}`)

    console.log("API: Creating SecretVaultWrapper instance...")
    const collection = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials, SCHEMA_ID)

    console.log("API: Initializing SecretVaultWrapper...")
    await collection.init()
    console.log("API: SecretVaultWrapper initialized successfully")

    console.log(`API: Reading image ${id} from nodes...`)
    // First, get the image by ID
    const results = await collection.readFromNodes({ _id: id })

    // Log the response
    console.log(`API: 📚 getImageById response for ${id}:`, results)

    if (!results || results.length === 0) {
      return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 })
    }

    // Check if the image belongs to the current user
    const image = results[0]
    if (image.userId !== userId) {
      console.log(`API: Image ${id} does not belong to user ${userId}`)
      return NextResponse.json(
        {
          success: false,
          error: "You don't have permission to access this image",
        },
        { status: 403 },
      )
    }

    // Return the image if it belongs to the user
    return NextResponse.json({ success: true, data: image })
  } catch (error) {
    handleServerError(error, `get image ${id}`)

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
