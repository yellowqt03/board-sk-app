import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Edge Runtime에서 JWT 사용을 위한 동적 import
let jwtModule: typeof import('./lib/jwt') | null = null;

// 인증이 필요한 경로들
const PROTECTED_ROUTES = [
  '/write',
  '/admin',
  '/post',
  '/anonymous',
  '/announcement',
];

// 로그인한 사용자가 접근할 수 없는 경로들
const AUTH_ROUTES = [
  '/login',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 정적 파일과 API 라우트는 제외
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // JWT 모듈 동적 로드 (Edge Runtime 호환)
  if (!jwtModule) {
    try {
      jwtModule = await import('./lib/jwt');
    } catch (error) {
      console.error('JWT module import failed:', error);
      return NextResponse.next();
    }
  }

  // Authorization 헤더 또는 쿠키에서 토큰 추출
  const authHeader = request.headers.get('authorization');
  let token = jwtModule.extractTokenFromHeader(authHeader);
  
  // Authorization 헤더가 없으면 쿠키에서 확인
  if (!token) {
    token = request.cookies.get('accessToken')?.value || null;
  }

  const isAuthenticated = token ? jwtModule.verifyAccessToken(token) !== null : false;

  // 보호된 경로 확인
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  // 인증 관련 경로 확인
  const isAuthRoute = AUTH_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  // 인증되지 않은 사용자가 보호된 경로에 접근하려는 경우
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자가 로그인 페이지에 접근하려는 경우
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 인증된 사용자의 정보를 헤더에 추가 (API 라우트에서 사용 가능)
  if (isAuthenticated && token && jwtModule) {
    const user = jwtModule.verifyAccessToken(token);
    if (user) {
      const response = NextResponse.next();
      response.headers.set('x-user-id', user.userId);
      response.headers.set('x-employee-id', user.employeeId);
      response.headers.set('x-user-name', encodeURIComponent(user.name));
      response.headers.set('x-user-email', user.email);
      response.headers.set('x-department-id', user.departmentId);
      response.headers.set('x-position-id', user.positionId);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 미들웨어를 비활성화하고 클라이언트 사이드 AuthGuard만 사용
    // localStorage 기반 인증과 호환성을 위해 임시 비활성화
    '/api/protected/:path*',  // API 라우트만 보호
  ],
  runtime: 'nodejs',
};