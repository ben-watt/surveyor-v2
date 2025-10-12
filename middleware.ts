import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/app/home/utils/amplify-utils';

/**
 * Determines if the request is from a development environment
 * Development environments use localhost or IP addresses where SSR auth may not work properly
 */
function isDevEnvironment(hostname: string): boolean {
  return hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

/**
 * Checks if the user is authenticated using Amplify server-side auth
 */
async function checkAuthentication(request: NextRequest, response: NextResponse): Promise<boolean> {
  return runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec: any) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens !== undefined;
      } catch (error) {
        // Auth check failed - user is not authenticated
        return false;
      }
    },
  });
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;

  // Skip authentication for development environments to prevent SSR/client session mismatches
  if (isDevEnvironment(hostname)) {
    return response;
  }

  // Define route types
  const authPages = new Set(['/', '/login', '/signup', '/reset-password']);
  const isAuthPage = authPages.has(pathname);
  const isProtected = pathname.startsWith('/home');

  // Check authentication status
  const authenticated = await checkAuthentication(request, response);

  // Redirect authenticated users away from auth pages
  if (authenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/home/surveys', request.url));
  }

  // Redirect unauthenticated users from protected routes
  if (!authenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow access to the requested route
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any path with a file extension (e.g. .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
