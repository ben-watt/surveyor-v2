'use client';

import { useState } from 'react';
import { signUp, confirmSignUp, getCurrentUser, signIn } from 'aws-amplify/auth';
import { getCurrentTenantId } from '@/app/home/utils/tenant-utils';
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
import { PasswordStrength } from '@/components/ui/password-strength';

interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumbers: false,
    hasSpecialChar: false,
  });
  const router = useRouter();

  const validatePassword = (password: string) => {
    const requirements: PasswordRequirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordRequirements(requirements);

    const score = Object.values(requirements).filter(Boolean).length;
    if (score < 3) setPasswordStrength('weak');
    else if (score < 5) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  const isPasswordValid = () => {
    return Object.values(passwordRequirements).every(Boolean);
  };

  // Helper function to wait for auth tokens with retry logic
  const waitForAuthTokens = async (maxAttempts = 5, delay = 1000): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await getCurrentUser();
        console.log(`Auth tokens available after ${attempt} attempts`);
        return true;
      } catch (error) {
        console.log(`Auth attempt ${attempt}/${maxAttempts} failed:`, error);
        if (attempt === maxAttempts) {
          return false;
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
    return false;
  };

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!isPasswordValid()) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
          autoSignIn: true,
        },
      });
      setShowConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Confirm the sign-up
      const confirmResult = await confirmSignUp({
        username: email,
        confirmationCode,
      });

      console.log('Sign-up confirmed successfully', confirmResult);

      // Step 2: Sign in the user to get auth tokens (since autoSignIn might not have worked)
      try {
        await signIn({
          username: email,
          password: password,
        });
        console.log('Auto sign-in successful');
      } catch (signInError: any) {
        console.log('Auto sign-in failed, but confirmation succeeded:', signInError);
        // If auto sign-in fails, we'll still try to wait for tokens
      }

      // Step 3: Wait for auth tokens to be available
      const authReady = await waitForAuthTokens(8, 1000); // Increased attempts for sign-up flow

      if (authReady) {
        console.log('Auth tokens ready, initializing tenant context');

        // Step 4: Initialize tenant context for new user
        try {
          const tenantId = await getCurrentTenantId();
          console.log('Tenant context initialized:', tenantId);

          // Give sync engine time to initialize with new tenant context
          await new Promise((resolve) => setTimeout(resolve, 1000));

          router.push('/home/surveys');
        } catch (tenantError) {
          console.error('Tenant initialization failed:', tenantError);
          setError('Sign-up successful! Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/home/surveys');
          }, 2000);
        }
      } else {
        console.warn('Auth tokens not available, redirecting to login');
        setError('Sign-up confirmed! Please sign in to continue.');
        // Don't redirect to login automatically - show message instead
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Confirmation failed:', err);

      // Handle specific error cases
      if (err.name === 'CodeMismatchException') {
        setError('Invalid confirmation code. Please check and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Confirmation code has expired. Please request a new one.');
      } else if (err.name === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to confirm sign up');
      }
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
              {showConfirmation ? 'Confirm Sign Up' : 'Join Survii'}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              {showConfirmation
                ? 'Enter the confirmation code sent to your email'
                : 'Create your account to get started'}
            </CardDescription>
          </CardHeader>
          {!showConfirmation ? (
            <form onSubmit={handleSignUp}>
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
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setPassword(newPassword);
                      validatePassword(newPassword);
                    }}
                    required
                  />
                  <PasswordStrength
                    password={password}
                    requirements={passwordRequirements}
                    strength={passwordStrength}
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
                  className="w-full transform bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || !isPasswordValid() || password !== confirmPassword}
                >
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>
                <div className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-medium text-transparent hover:underline"
                  >
                    Sign in
                  </Link>{' '}
                  or{' '}
                  <Link
                    href="/reset-password"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-medium text-transparent hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleConfirmSignUp}>
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
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full transform bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? 'Confirming...' : 'Confirm Sign Up'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
