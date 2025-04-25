import type React from "react"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12">{children}</div>
}
