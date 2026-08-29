import { updateSession } from "./lib/supabase/middleware"

export async function middleware(request) {
  return await updateSession(request)
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
