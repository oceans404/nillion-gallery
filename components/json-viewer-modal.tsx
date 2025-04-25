"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileJson } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface JsonViewerModalProps {
  data: any
  title?: string
}

export function JsonViewerModal({ data, title = "Record Details" }: JsonViewerModalProps) {
  const [open, setOpen] = useState(false)

  // Format the JSON with indentation for better readability
  const formattedJson = JSON.stringify(data, null, 2)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1 border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        onClick={() => setOpen(true)}
      >
        <FileJson className="h-4 w-4" />
        View Metadata
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Full JSON record stored in Nillion SecretVault</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-4">
            <div className="bg-muted rounded-md p-4">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">{formattedJson}</pre>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              Copy JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
