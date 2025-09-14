import jwt from 'jsonwebtoken';
import { User } from './auth';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret-key-change-in-production';

// 클라이언트 사이드에서 JWT 사용을 위한 체크
function isClientSide() {
  return typeof window !== 'undefined';
}
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface JWTPayload {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  departmentId: string;
  positionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT 토큰을 생성합니다.
 * @param user - 사용자 정보
 * @returns 토큰 쌍 (액세스 토큰, 리프레시 토큰)
 */
export function generateTokens(user: User): TokenPair {
  
  if (!JWT_SECRET) {
    throw new Error('JWT secret is not configured');
  }

  // 클라이언트 사이드에서는 간단한 토큰 생성
  if (isClientSide()) {
    const payload: JWTPayload = {
      userId: user.id,
      employeeId: user.employee_id,
      name: user.name,
      email: user.email,
      departmentId: user.department_id,
      positionId: user.position_id,
    };

    try {
      // 한글 문자를 처리할 수 있는 base64 인코딩
      const accessToken = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const refreshToken = btoa(unescape(encodeURIComponent(JSON.stringify({ userId: user.id, type: 'refresh' }))));
      const expiresIn = 7 * 24 * 60 * 60; // 7일


      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      throw error;
    }
  }

  // 서버 사이드에서는 JWT 사용
  const payload: JWTPayload = {
    userId: user.id,
    employeeId: user.employee_id,
    name: user.name,
    email: user.email,
    departmentId: user.department_id,
    positionId: user.position_id,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'board-sk-app',
    audience: 'board-sk-app-users',
  });

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'board-sk-app',
      audience: 'board-sk-app-users',
    }
  );

  // 7일을 초 단위로 변환
  const expiresIn = 7 * 24 * 60 * 60;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * JWT 토큰을 검증합니다.
 * @param token - JWT 토큰
 * @returns 검증된 페이로드 또는 null
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    console.error('JWT secret is not configured');
    return null;
  }

  try {
    // 클라이언트 사이드에서는 base64 디코딩
    if (isClientSide()) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(token)))) as JWTPayload;
        return decoded;
      } catch {
        console.log('Invalid base64 token');
        return null;
      }
    }

    // 서버 사이드에서는 JWT 검증
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'board-sk-app',
      audience: 'board-sk-app-users',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid token');
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * 리프레시 토큰을 검증합니다.
 * @param token - 리프레시 토큰
 * @returns 검증된 페이로드 또는 null
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } | null {
  if (!JWT_SECRET) {
    console.error('JWT secret is not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'board-sk-app',
      audience: 'board-sk-app-users',
    }) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return null;
  }
}

/**
 * 토큰에서 사용자 정보를 추출합니다.
 * @param token - JWT 토큰
 * @returns 사용자 정보 또는 null
 */
export function getUserFromToken(token: string): User | null {
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.userId,
    employee_id: payload.employeeId,
    name: payload.name,
    email: payload.email,
    department_id: payload.departmentId,
    position_id: payload.positionId,
    is_active: true,
    status: 'approved',
  };
}

/**
 * HTTP 요청에서 토큰을 추출합니다.
 * @param authHeader - Authorization 헤더 값
 * @returns 토큰 또는 null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * 토큰이 만료되었는지 확인합니다.
 * @param token - JWT 토큰
 * @returns 만료 여부
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

/**
 * 토큰의 만료 시간을 가져옵니다.
 * @param token - JWT 토큰
 * @returns 만료 시간 (Unix timestamp) 또는 null
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    return decoded?.exp || null;
  } catch {
    return null;
  }
}

/**
 * 토큰을 무효화합니다 (블랙리스트에 추가).
 * 실제 구현에서는 Redis나 데이터베이스를 사용해야 합니다.
 * @param token - 무효화할 토큰
 */
export async function invalidateToken(token: string): Promise<void> {
  // TODO: 실제 구현에서는 토큰을 블랙리스트에 추가
  // 예: Redis Set에 토큰 ID 저장
  console.log('Token invalidated:', token.substring(0, 20) + '...');
}

/**
 * 토큰이 블랙리스트에 있는지 확인합니다.
 * @param token - 확인할 토큰
 * @returns 블랙리스트 여부
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  // TODO: 실제 구현에서는 블랙리스트 확인
  // 예: Redis Set에서 토큰 ID 조회
  console.log('Checking token blacklist for:', token.slice(0, 20) + '...');
  return false;
}