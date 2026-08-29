import { NextResponse } from "next/server"
import { updateSession } from "./lib/supabase/middleware"

export async function middleware(request) {
  const response = await updateSession(request)

  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/articles") ||
    pathname.startsWith("/submissions") ||
    pathname.startsWith("/businesses") ||
    pathname.startsWith("/ads") ||
    pathname.startsWith("/advertisers") ||
    pathname.startsWith("/packages") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/settings")
  ) {
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/articles/:path*",
    "/submissions/:path*",
    "/businesses/:path*",
    "/ads/:path*",
    "/advertisers/:path*",
    "/packages/:path*",
    "/payments/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/audit-logs/:path*",
    "/settings/:path*",
  ],
}
