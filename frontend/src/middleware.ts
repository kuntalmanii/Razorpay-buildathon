/**
 * middleware.ts
 *
 * Next.js Edge Middleware for client route protection and role-based guards.
 *
 * SECURITY:
 *  - This Edge middleware protects UI routes and redirects unauthenticated users to /login.
 *  - Backend endpoints strictly enforce authentication and authorization independently.
 *  - The 'recoveriq_token' cookie contains the signed JWT.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'recoveriq_token';

// Public routes that do not require an authenticated session
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/unauthorized'];

/**
 * Safely parse JWT payload (middle segment) without external libraries.
 */
function parseJwtPayload(token: string): { userId?: string; email?: string; role?: 'user' | 'admin' } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static files and Next.js internal assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? parseJwtPayload(token) : null;
  const isAuthenticated = Boolean(payload?.userId);
  const role = payload?.role;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // 2. Unauthenticated user trying to access protected routes
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated user trying to access /login or /signup
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    const destination = role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 4. Role Guard: Non-admin trying to access /admin routes
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // 5. Root path (/) routing
  if (pathname === '/') {
    const destination = isAuthenticated ? (role === 'admin' ? '/admin' : '/dashboard') : '/login';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
