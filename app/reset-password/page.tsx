'use client';

import { useState } from 'react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/app/home/components/AppIcon';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await resetPassword({ username: email });
      setShowConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate password reset');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword,
      });
      router.push('/login'); // Redirect to login after successful password reset
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-10 h-72 w-72 animate-pulse rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-70 mix-blend-multiply blur-xl filter"></div>
        <div className="animation-delay-2000 absolute right-10 top-0 h-72 w-72 animate-pulse rounded-full bg-gradient-to-r from-yellow-400/20 to-pink-400/20 opacity-70 mix-blend-multiply blur-xl filter"></div>
        <div className="animation-delay-4000 absolute -bottom-32 left-20 h-72 w-72 animate-pulse rounded-full bg-gradient-to-r from-green-400/20 to-blue-400/20 opacity-70 mix-blend-multiply blur-xl filter"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="h-8 w-8">
                <AppIcon color="hsl(var(--primary))" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                Survii
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-base font-medium">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-white/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-2xl font-bold text-transparent">
              {showConfirmation ? 'Reset Password' : 'Forgot Password'}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              {showConfirmation
                ? 'Enter the code sent to your email and your new password'
                : 'Enter your email to receive a password reset code'}
            </CardDescription>
          </CardHeader>
          {!showConfirmation ? (
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4">
                {error && <div className="text-sm text-red-500">{error}</div>}
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
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full transform bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? 'Sending code...' : 'Send Reset Code'}
                </Button>
                <div className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-medium text-transparent hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleConfirmResetPassword}>
              <CardContent className="space-y-4">
                {error && <div className="text-sm text-red-500">{error}</div>}
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
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
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
                  className="w-full transform bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? 'Resetting password...' : 'Reset Password'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
