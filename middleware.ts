// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isAdminUI = pathname.startsWith("/admin");
  const isAdminAPI = pathname.startsWith("/api/admin");

  if (!isAdminUI && !isAdminAPI) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // No autenticado
  if (!token) {
    if (isAdminAPI) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // No admin
  const role = (token as any).role;
  if (role !== "ADMIN") {
    if (isAdminAPI) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
