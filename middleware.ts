import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/app/home/utils/amplify-utils";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec: any) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens !== undefined;
      } catch (error) {
        return false;
      }
    },
  });

  const authPages = new Set(["/", "/login", "/signup", "/reset-password"]);
  const isAuthPage = authPages.has(pathname);
  const isProtected = pathname.startsWith("/home");

  if (authenticated) {
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/home/surveys", request.url));
    }
    return response;
  }

  if (isProtected) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
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
     * - any path with a file extension (e.g. .png, .jpg, .svg)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
