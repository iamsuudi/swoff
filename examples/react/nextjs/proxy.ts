import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/notes", "/notes/client", "/notes/gql", "/notes/new"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get("better-auth.session_token");
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/notes/:path*", "/notes"],
};
