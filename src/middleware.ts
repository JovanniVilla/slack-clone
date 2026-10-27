import NextAuth from 'next-auth';

import { authConfig } from '@/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all routes except static assets, favicon, uploads, and auth API
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|apple-icon|icon|uploads).*)'],
};
