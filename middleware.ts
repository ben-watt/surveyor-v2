import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "./app/app/utils/amplify-utils";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  console.log("[Middleware] Checking if user is authenticated");

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec: any) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens !== undefined;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
  });

  console.log("[Middleware] Authenticated:", authenticated, request.nextUrl);

  if (authenticated) {
    if (request.nextUrl.pathname.includes("/app/")) {
      console.log("[Middleware] Returning response");
      return response;
    }

    return NextResponse.redirect(new URL("/app/surveys", request.url));
  }

  console.log("[Middleware] User is not authenticated, redirecting to login");
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
