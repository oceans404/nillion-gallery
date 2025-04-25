import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon, Mail, AlertCircle } from "lucide-react"

export default function VerificationSentPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="mx-auto w-full max-w-md shadow-lg border-blue-600/20">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent you a verification link to complete your signup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Verification email sent</p>
              <p className="text-sm text-blue-700 mt-1">
                Please check your email inbox and click the verification link to activate your account.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Don't see the email?</p>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Allow a few minutes for the email to arrive</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button asChild variant="outline" className="hover:bg-blue-50 hover:text-blue-600 border-blue-200">
            <Link href="/auth/login">Return to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
