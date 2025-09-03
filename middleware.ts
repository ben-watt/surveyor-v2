import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/app/home/utils/amplify-utils";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;

  // For development environments (IP addresses or localhost), disable middleware authentication to prevent redirect loops
  const isDevEnvironment = hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  
  if (isDevEnvironment) {
    console.log('Middleware: Skipping auth check for development environment', { pathname, hostname });
    return response;
  }

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec: any) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        const isAuth = session.tokens !== undefined;
        console.log('Middleware: Auth check', { 
          pathname, 
          hostname,
          authenticated: isAuth, 
          hasTokens: !!session.tokens 
        });
        return isAuth;
      } catch (error) {
        console.log('Middleware: Auth check failed', { 
          pathname, 
          hostname,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }
    },
  });

  const authPages = new Set(["/", "/login", "/signup", "/reset-password"]);
  const isAuthPage = authPages.has(pathname);
  const isProtected = pathname.startsWith("/home");

  console.log('Middleware: Route check', { 
    pathname, 
    hostname,
    authenticated, 
    isAuthPage, 
    isProtected 
  });

  if (authenticated) {
    if (isAuthPage) {
      console.log('Middleware: Redirecting authenticated user from auth page to /home/surveys');
      return NextResponse.redirect(new URL("/home/surveys", request.url));
    }
    console.log('Middleware: Allowing authenticated user to access protected route');
    return response;
  }

  if (isProtected) {
    console.log('Middleware: Redirecting unauthenticated user to login');
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  console.log('Middleware: Allowing access to public route');
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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
