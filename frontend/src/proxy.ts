import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken");

  // Protected routes
  const protectedPaths = ["/dashboard"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes (redirect to dashboard if already logged in)
  const authPaths = ["/auth/signin", "/auth/signup"];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If trying to access protected route without token, redirect to signin
  if (isProtectedPath && !accessToken) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // If trying to access auth route with token, redirect to dashboard
  if (isAuthPath && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match page routes, not API routes
    "/dashboard/:path*",
    "/(auth)/:path*",
  ],
};
