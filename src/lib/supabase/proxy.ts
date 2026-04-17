import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyStudentToken } from '@/lib/student-auth';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // STUDENT PORTAL ROUTES — custom JWT auth
  // ============================================

  if (pathname.startsWith('/student-portal')) {
    const token = request.cookies.get('student_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/student-login', request.url));
    }

    const payload = await verifyStudentToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/student-login', request.url));
      response.cookies.set('student_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.next({ request });
  }

  // Student login page — redirect to portal if already authenticated
  if (pathname === '/student-login') {
    const token = request.cookies.get('student_token')?.value;

    if (token) {
      const payload = await verifyStudentToken(token);
      if (payload) {
        return NextResponse.redirect(new URL('/student-portal', request.url));
      }
    }

    return NextResponse.next({ request });
  }

  // ============================================
  // ADMIN / PARENT ROUTES — Supabase Auth
  // ============================================

  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
