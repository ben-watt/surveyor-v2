import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/app/home/utils/amplify-utils";

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

  if (authenticated && request.nextUrl.pathname.includes("/login")) {
    return NextResponse.redirect(new URL("/home/surveys", request.url));
  } else if (authenticated && request.nextUrl.pathname.includes("/home")) {
    return response;
  }

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
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
