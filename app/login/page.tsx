"use client"

import { useState, useEffect } from "react"
import { signIn, getCurrentUser } from "aws-amplify/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppIcon } from '@/app/home/components/AppIcon'

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Redirect if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await getCurrentUser()
        // User is already authenticated, redirect to home
        window.location.href = "/home/surveys"
      } catch (error) {
        // User not authenticated, stay on login page
      }
    }
    
    checkAuthStatus()
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn({
        username: email,
        password: password
      })
      
      // For development environments (IP addresses/localhost), use different redirect strategy
      const isDevEnvironment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname));
      
      if (isDevEnvironment) {
        // Give time for session to establish, then use full page reload
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = "/home/surveys";
      } else {
        // Production - use standard routing
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push("/home/surveys");
      }
    } catch (err: any) {
      // Handle the case where user is already signed in
      if (err.name === 'UserAlreadyAuthenticatedException') {
        window.location.href = "/home/surveys";
        return;
      }
      
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-gradient-to-r from-yellow-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="w-8 h-8">
                <AppIcon color="hsl(var(--primary))" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Survii</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/signup">
                <Button variant="ghost" className="text-base font-medium">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-sm text-center text-gray-600">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:underline">
                Sign up
              </Link>
              {" "}or{" "}
              <Link href="/reset-password" className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:underline">
                Forgot Password?
              </Link>
            </div>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  )
}