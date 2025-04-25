import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { handleServerError } from "@/lib/error-handler"

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // We're not adding cookies, just reading them
          },
          remove(name: string, options: any) {
            // We're not removing cookies, just reading them
          },
        },
        // Add fetch options to improve reliability
        global: {
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Add a timeout to prevent hanging requests
              signal: options?.signal || AbortSignal.timeout(10000), // 10 second timeout
              // Ensure we're not caching responses
              cache: "no-store",
            })
          },
        },
      },
    )

    // Try to get the session, but handle fetch errors gracefully
    let session = null
    try {
      console.log("Middleware: Checking for session...")
      // Check if session exists - required for Server Components
      const { data, error } = await supabase.auth.getSession()
      if (!error) {
        session = data.session
        console.log("Middleware: Session found:", session?.user?.id)
      } else {
        console.error("Middleware auth error:", error)
      }
    } catch (sessionError) {
      handleServerError(sessionError, "middleware getSession")
      // Continue without a session
    }

    // For auth pages, we don't need to check for a session
    if (request.nextUrl.pathname.startsWith("/auth")) {
      // If session exists and on auth pages, redirect to home
      if (session) {
        console.log("Middleware: User is authenticated, redirecting from auth page to home")
        return NextResponse.redirect(new URL("/", request.url))
      }
      // Otherwise, allow access to auth pages
      console.log("Middleware: Allowing access to auth page")
      return NextResponse.next()
    }

    // For API routes, we'll let them handle their own auth
    if (request.nextUrl.pathname.startsWith("/api/")) {
      console.log("Middleware: Allowing API route to handle its own auth")
      return NextResponse.next()
    }

    // Allow access to the home page for everyone
    if (request.nextUrl.pathname === "/") {
      console.log("Middleware: Allowing access to home page")
      return NextResponse.next()
    }

    // If no session and not on auth pages or home page, redirect to login
    if (!session && !request.nextUrl.pathname.startsWith("/auth")) {
      console.log("Middleware: No session found, redirecting to login")
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    console.log("Middleware: User is authenticated, allowing access to protected route")
    return NextResponse.next()
  } catch (error) {
    // Use our custom error handler
    handleServerError(error, "middleware")

    // If there's an error, redirect to login
    if (!request.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    return NextResponse.next()
  }
}

// Specify which routes the middleware should run on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
