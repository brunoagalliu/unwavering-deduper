import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth pages and API auth routes
  if (isAuthPage || isApiAuthRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dedupe',
    '/processing',
    '/masters',
    '/history',
    '/api/masters/:path*',
    '/api/process/:path*',
    '/api/history/:path*',
  ],
};