import { LoginForm } from "@/components/auth/login-form"
import { GalleryHero } from "@/components/gallery-hero"

export default function LoginPage() {
  return (
    <div className="w-full max-w-6xl px-4 flex flex-col items-center">
      <GalleryHero />
      <div className="w-full max-w-md mt-8">
        <LoginForm />
      </div>
    </div>
  )
}
