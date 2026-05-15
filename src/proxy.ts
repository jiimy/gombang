import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_COOKIE_NAME = "admin-session";

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!adminCookie?.value) return false;

  const allowedEmail =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!allowedEmail) return false;

  try {
    const decoded = decodeURIComponent(adminCookie.value);
    const parsed = JSON.parse(decoded) as {
      email?: string;
      isAdmin?: boolean;
    };
    return parsed?.isAdmin === true && parsed?.email === allowedEmail;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // if (pathname.startsWith("/mypage") && !request.cookies.get("session-id")) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  const res = NextResponse.next();

  // CORS 헤더 추가는 모든 API 요청에 적용
  if (pathname.startsWith("/api/")) {
    res.headers.append("Access-Control-Allow-Credentials", "true");
    res.headers.append("Access-Control-Allow-Origin", "*");
    res.headers.append(
      "Access-Control-Allow-Methods",
      "GET,DELETE,PATCH,POST,PUT"
    );
    res.headers.append(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );
  }

  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();

    const adminAuthenticated = isAdminAuthenticated(request);
    const isLoggedIn = user?.data?.user !== null || adminAuthenticated;

    // console.log("request", request.nextUrl.pathname);
    // console.log("user", user);
    // protected routes
    if (
      request.nextUrl.pathname.startsWith("/mypage") &&
      !isLoggedIn
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      request.nextUrl.pathname.startsWith("/record") &&
      !isLoggedIn
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/mypage/:path*",
  ],
};
