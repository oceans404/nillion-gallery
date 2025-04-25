import { Shield, Lock, ImageIcon } from "lucide-react"
import Link from "next/link"

export function GalleryHero() {
  return (
    <div className="text-center mb-8 max-w-4xl px-4 mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-blue-600 p-4 rounded-full mb-4">
          <ImageIcon className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Nillion Gallery</h1>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground mb-8">
        Your private, encrypted image gallery powered by Nillion SecretVault
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
        <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600 p-2 rounded-full">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium">End-to-End Encryption</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Images are encrypted before being uploaded to IPFS so that no one can see them but you.
          </p>
        </div>

        <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600 p-2 rounded-full">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium">Secure Metadata Storage</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Encryption keys and image metadata are securely stored in{" "}
            <Link
              href="https://docs.nillion.com/build/secret-vault"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Nillion SecretVault
            </Link>
            .
          </p>
        </div>

        <div className="bg-card rounded-lg p-5 md:p-6 shadow-sm border">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-600 p-2 rounded-full">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium">Decentralized Image Storage</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Encrypted images are stored on IPFS, a distributed file system, ensuring high availability and censorship
            resistance.
          </p>
        </div>
      </div>
    </div>
  )
}
