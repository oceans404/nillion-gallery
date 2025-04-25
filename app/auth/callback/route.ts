import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { handleServerError } from "@/lib/error-handler"

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/"

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      handleServerError(error, "auth callback")
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    // Add a small delay to ensure the session is fully established
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    handleServerError(error, "auth callback")
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
}
