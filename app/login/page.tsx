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

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('Login: Checking if user is already authenticated')
        await getCurrentUser()
        console.log('Login: User already authenticated, redirecting to /home/surveys')
        window.location.href = "/home/surveys"
      } catch (error) {
        console.log('Login: User not authenticated, staying on login page')
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
      console.log('Login: Starting sign in process', { 
        email, 
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown' 
      })
      
      const result = await signIn({
        username: email,
        password: password
      })
      
      console.log('Login: signIn completed', { 
        result,
        nextStep: result.nextStep?.signInStep 
      })
      
      // For IP addresses, add longer delay and force page reload
      const isIPAddress = typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      
      if (isIPAddress) {
        console.log('Login: IP address detected, using extended delay approach');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Login: Attempting navigation to /home/surveys');
        try {
          // Try router push first
          router.push("/home/surveys");
          // If that doesn't work after a delay, force page reload
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('Login: Router push failed, forcing page reload');
              window.location.href = "/home/surveys";
            }
          }, 2000);
        } catch (navError) {
          console.error('Login: Router push failed, using window.location', navError);
          window.location.href = "/home/surveys";
        }
      } else {
        // Add a small delay to let the session establish
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('Login: Redirecting to /home/surveys')
        router.push("/home/surveys")
      }
    } catch (err: any) {
      console.error('Login: signIn failed', { 
        error: err.message, 
        name: err.name,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      })
      
      // Handle the case where user is already signed in
      if (err.name === 'UserAlreadyAuthenticatedException') {
        console.log('Login: User already authenticated, forcing redirect to /home/surveys')
        // Force a full page reload to properly establish session
        window.location.href = "/home/surveys"
        return // Don't show error message
      }
      
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
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