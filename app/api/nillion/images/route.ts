import { NextResponse } from "next/server"
import { SecretVaultWrapper } from "secretvaults"
import { orgConfig, SCHEMA_ID, isNillionConfigValid } from "@/lib/nillion-config"
import { handleServerError } from "@/lib/error-handler"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  console.log("API: Fetching images from Nillion... Request received at", new Date().toISOString())

  try {
    // First, check if Nillion config is valid
    if (!isNillionConfigValid()) {
      console.warn("API: Nillion configuration is invalid or missing")
      return NextResponse.json({
        success: true,
        data: [],
        message: "Nillion is not properly configured. Please contact the administrator.",
      })
    }

    // Get the current user from Supabase
    console.log("API: Getting current user from Supabase...")
    const supabase = createClient()

    try {
      // Add a timeout to the auth request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      console.log("API: Calling supabase.auth.getSession()...")
      const { data, error } = await supabase.auth.getSession({
        // @ts-ignore - Add signal to the request options
        options: { signal: controller.signal },
      })

      clearTimeout(timeoutId)
      console.log("API: supabase.auth.getSession() completed", error ? "with error" : "successfully")

      if (error) {
        console.error("API: Supabase auth error:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Authentication error: " + error.message,
            redirectToLogin: true,
          },
          { status: 401 },
        )
      }

      // Check if we have a session
      if (!data.session) {
        console.log("API: No active session found")
        return NextResponse.json(
          {
            success: false,
            error: "No active session found. Please sign in again.",
            redirectToLogin: true,
          },
          { status: 401 },
        )
      }

      // Check if we have a user
      if (!data.session.user) {
        console.log("API: No authenticated user found in session")
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required",
            redirectToLogin: true,
          },
          { status: 401 },
        )
      }

      const userId = data.session.user.id
      console.log(`API: Authenticated user: ${userId}`)

      try {
        // Create SecretVaultWrapper instance
        console.log("API: Creating SecretVaultWrapper instance...")
        const collection = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials, SCHEMA_ID)

        console.log("API: Initializing SecretVaultWrapper...")
        await collection.init()
        console.log("API: SecretVaultWrapper initialized successfully")

        try {
          // Only fetch data for the specific user
          console.log(`API: Reading data from nodes for userId: ${userId}...`)
          const dataRead = await collection.readFromNodes({ userId })

          // Detailed logging of the response
          console.log("API: Raw response type:", typeof dataRead)
          console.log("API: Is array?", Array.isArray(dataRead))

          if (dataRead) {
            console.log("API: Total records for user:", dataRead.length)
            // Log the first item if available
            if (dataRead.length > 0) {
              console.log("API: First record keys:", Object.keys(dataRead[0]))
            }
          } else {
            console.log("API: dataRead is null or undefined")
          }

          // Return the data as JSON
          return NextResponse.json({
            success: true,
            data: Array.isArray(dataRead) ? dataRead : [],
          })
        } catch (readError) {
          handleServerError(readError, "read from Nillion with userId filter")

          // Check if it's a permission error
          const errorMessage = readError instanceof Error ? readError.message : String(readError)
          const isPermissionError =
            errorMessage.includes("ResourceAccessDeniedError") ||
            errorMessage.includes("Access Denied") ||
            errorMessage.includes("404")

          // Return a more specific error message for permission errors
          if (isPermissionError) {
            console.error("API: Permission denied error:", errorMessage)
            return NextResponse.json(
              {
                success: false,
                error:
                  "Permission denied: Your account doesn't have access to this schema. Please contact the administrator.",
                debug: errorMessage,
              },
              { status: 403 },
            )
          }

          // Return a generic error for other issues
          return NextResponse.json(
            {
              success: false,
              error: "Error reading data from SecretVault: " + errorMessage,
              debug: errorMessage,
            },
            { status: 500 },
          )
        }
      } catch (nillionError) {
        handleServerError(nillionError, "initialize Nillion connection")

        // Check if it's a permission error
        const errorMessage = nillionError instanceof Error ? nillionError.message : String(nillionError)
        const isPermissionError =
          errorMessage.includes("ResourceAccessDeniedError") ||
          errorMessage.includes("Access Denied") ||
          errorMessage.includes("404")

        // Return a more specific error message for permission errors
        if (isPermissionError) {
          console.error("API: Permission denied error during initialization:", errorMessage)
          return NextResponse.json(
            {
              success: false,
              error:
                "Permission denied: Your account doesn't have access to this schema. Please contact the administrator.",
              debug: errorMessage,
            },
            { status: 403 },
          )
        }

        // Return a generic error for other issues
        return NextResponse.json(
          {
            success: false,
            error: "Error connecting to Nillion: " + errorMessage,
            debug: errorMessage,
          },
          { status: 500 },
        )
      }
    } catch (authError) {
      handleServerError(authError, "get user from Supabase")

      // Check if it's a fetch error
      const errorMessage = authError instanceof Error ? authError.message : String(authError)
      const isFetchError = errorMessage.includes("fetch") || errorMessage.includes("network")

      return NextResponse.json(
        {
          success: false,
          error: "Authentication error: " + errorMessage,
          isFetchError: isFetchError,
          redirectToLogin: true,
          suggestion: isFetchError ? "There might be a network connectivity issue. Please try again later." : undefined,
        },
        { status: 401 },
      )
    }
  } catch (error) {
    handleServerError(error, "initialize Nillion connection")

    // Return a generic error
    return NextResponse.json(
      {
        success: false,
        error: "Error connecting to Nillion: " + (error instanceof Error ? error.message : String(error)),
        debug: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 },
    )
  }
}
