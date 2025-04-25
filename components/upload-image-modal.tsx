"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ImageUploader } from "@/components/image-uploader"

interface UploadImageModalProps {
  onUploadComplete?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function UploadImageModal({ onUploadComplete, open, onOpenChange, children }: UploadImageModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Use either the controlled props or internal state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  const handleUploadComplete = () => {
    setIsOpen(false)
    if (onUploadComplete) {
      onUploadComplete()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ImageUploader onUploadComplete={handleUploadComplete} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
