import { SignUpForm } from "@/components/auth/signup-form"
import { GalleryHero } from "@/components/gallery-hero"

export default function SignUpPage() {
  return (
    <div className="w-full max-w-6xl px-4 flex flex-col items-center">
      <GalleryHero />
      <div className="w-full max-w-md mt-8">
        <SignUpForm />
      </div>
    </div>
  )
}
