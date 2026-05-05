import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths, static assets, and Boneyard crawler
  const userAgent = req.headers.get('user-agent') || '';
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') ||
    userAgent.includes('Boneyard-Crawl') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get('accessToken')?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    // In a real app, you'd try to refresh here or redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|css|js)).*)',
  ],
};
