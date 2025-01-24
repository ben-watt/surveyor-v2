"use client"

import { useState } from "react"
import { signUp, confirmSignUp, type ConfirmSignUpInput } from "aws-amplify/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState("")
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          },
          autoSignIn: true
        }
      })
      setShowConfirmation(true)
    } catch (err: any) {
      setError(err.message || "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await confirmSignUp({
        username: email,
        confirmationCode
      })
      router.push("/surveys") // Redirect to dashboard after successful confirmation
    } catch (err: any) {
      setError(err.message || "Failed to confirm sign up")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{showConfirmation ? "Confirm Sign Up" : "Sign Up"}</CardTitle>
          <CardDescription>
            {showConfirmation 
              ? "Enter the confirmation code sent to your email"
              : "Create your account to get started"
            }
          </CardDescription>
        </CardHeader>
        {!showConfirmation ? (
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
              <div className="text-sm text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleConfirmSignUp}>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Confirmation Code
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter code"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Confirming..." : "Confirm Sign Up"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
} 