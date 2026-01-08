// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;
    const token = req.nextauth.token;

    const isAdminUI = pathname.startsWith("/admin");
    const isAdminAPI = pathname.startsWith("/api/admin");

    // Solo nos interesa proteger admin (UI y API)
    if (!isAdminUI && !isAdminAPI) {
      return NextResponse.next();
    }

    // 1) No autenticado:
    // - UI: mandar al login
    // - API: responder 401 JSON (no tiene sentido redirigir en API)
    if (!token) {
      if (isAdminAPI) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
      }
      const loginUrl = new URL("/auth/login", req.url);
      // opcional: volver a donde estaba
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2) Autenticado pero NO admin:
    // - UI: mandar a home (o a /403 si tenés)
    // - API: responder 403 JSON
    if (token.role !== "ADMIN") {
      if (isAdminAPI) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3) Admin: pasar
    return NextResponse.next();
  },
  {
    callbacks: {
      // Esto evita ejecutar la middleware interna si no hay token
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
