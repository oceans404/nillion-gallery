"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-blue-600 p-4 rounded-full mb-6">
        <ImageIcon className="h-12 w-12 text-white" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  )
}
