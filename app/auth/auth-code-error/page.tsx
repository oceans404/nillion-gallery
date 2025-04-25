import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="mt-2 text-muted-foreground">There was an error processing your authentication request.</p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Try Again</Link>
        </Button>
      </div>
    </div>
  )
}
