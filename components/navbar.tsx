"use client"

import { useState, useEffect, Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ImageIcon } from "lucide-react"
import { useSupabase } from "@/contexts/supabase-context"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AuthModal } from "@/components/auth/auth-modal"

// Create a client-side only component for search params
function NavbarSearchParamsHandler({ setAuthModalOpen }: { setAuthModalOpen: (open: boolean) => void }) {
  const searchParams = useSearchParams()
  const { user, isLoading, isInitialized } = useSupabase()

  // Check for verification code in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Ensure we're on the client
      const code = searchParams?.get("code")
      if (code && !user && isInitialized && !isLoading) {
        // If there's a code and user is not logged in, open the auth modal
        setAuthModalOpen(true)
      }
    }
  }, [searchParams, user, isInitialized, isLoading, setAuthModalOpen])

  return null
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading, isInitialized, signOut } = useSupabase()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      setUserEmail(user.email)
      // Close the auth modal when user is authenticated
      setAuthModalOpen(false)
    } else {
      setUserEmail(null)
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      // Reset any auth modal state in localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("justLoggedIn")
        localStorage.removeItem("authModalState")
      }
      toast({
        title: "Signed out successfully",
      })
      router.push("/")
      router.refresh()
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive",
      })
    }
  }

  const handleLogoClick = () => {
    if (user) {
      router.push("/")
    } else {
      setAuthModalOpen(true)
    }
  }

  // Don't render anything until we've initialized auth or if user state is undefined
  if (!isInitialized || isLoading || user === undefined) {
    return (
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="bg-blue-600 p-2 rounded-full">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">Nillion Gallery</span>
          </div>
          <div className="h-9 w-20 rounded-md bg-muted animate-pulse"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
        >
          <div className="bg-blue-600 p-2 rounded-full">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">Nillion Gallery</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 p-0">
                  <Avatar>
                    <AvatarFallback>{userEmail ? userEmail.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {userEmail ? (
                    <div className="flex flex-col">
                      <span>My Account</span>
                      <span className="text-xs font-normal text-muted-foreground truncate max-w-[200px]">
                        {userEmail}
                      </span>
                    </div>
                  ) : (
                    "My Account"
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Explicitly render the button when user is null
            <Button
              onClick={() => setAuthModalOpen(true)}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-10"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Wrap the search params handler in Suspense */}
      {typeof window !== "undefined" && (
        <Suspense fallback={null}>
          <NavbarSearchParamsHandler setAuthModalOpen={setAuthModalOpen} />
        </Suspense>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  )
}
