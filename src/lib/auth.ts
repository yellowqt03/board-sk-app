import { supabase } from './supabase';
import { verifyPassword } from './password';
import { generateTokens, verifyAccessToken, getUserFromToken, TokenPair } from './jwt';

// 로그인 인터페이스
export interface LoginCredentials {
  employeeId: string;
  password: string;
}

// 사용자 정보 인터페이스
export interface User {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string;
  position_id: string;
  is_active: boolean;
  status: string;
}

// 실제 Supabase 데이터베이스 사용

// 로그인 함수 (Supabase 데이터베이스 사용)
export async function login(credentials: LoginCredentials): Promise<{ user: User | null; error: string | null; tokens?: TokenPair }> {
  try {
    // 사번을 4자리 패딩 형식으로 변환 (예: 2 -> 0002)
    const paddedEmployeeId = credentials.employeeId.padStart(4, '0');
    
    // 1. Supabase에서 직원 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from('employee_master')
      .select(`
        id,
        employee_id,
        name,
        email,
        department_id,
        position_id,
        is_active,
        status,
        departments!inner(name),
        positions!inner(name, level)
      `)
      .eq('employee_id', paddedEmployeeId)
      .single();

    if (employeeError || !employee) {
      return { user: null, error: '존재하지 않는 사번입니다.' };
    }

    // 2. 활성 사용자인지 확인
    if (!employee.is_active) {
      return { user: null, error: '비활성화된 계정입니다.' };
    }

    // 3. 승인된 사용자인지 확인
    if (employee.status !== 'approved') {
      return { user: null, error: '아직 승인되지 않은 계정입니다.' };
    }

    // 4. 사용자 계정 확인
    const { data: userAccount, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('employee_id', paddedEmployeeId)
      .single();

    if (userError || !userAccount) {
      return { user: null, error: '사용자 계정이 존재하지 않습니다.' };
    }

    // 5. 비밀번호 확인 (bcrypt 사용)
    const isValidPassword = await verifyPassword(credentials.password, userAccount.password_hash);
    if (!isValidPassword) {
      return { user: null, error: '비밀번호가 올바르지 않습니다.' };
    }

    // 6. 로그인 성공 - 사용자 정보 반환
    const user: User = {
      id: employee.id.toString(),
      employee_id: employee.employee_id,
      name: employee.name,
      email: employee.email || '',
      department_id: employee.department_id?.toString() || '',
      position_id: employee.position_id?.toString() || '',
      is_active: employee.is_active,
      status: employee.status
    };

    console.log('로그인 성공:', user.name);
    
    // JWT 토큰 생성
    const tokens = generateTokens(user);
    
    return { user, error: null, tokens };

  } catch (error) {
    console.error('로그인 오류:', error);
    return { user: null, error: '로그인 중 오류가 발생했습니다.' };
  }
}

// 로그아웃 함수
export async function logout(): Promise<void> {
  // 클라이언트 사이드에서 세션 정리
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiration');
}

// 현재 사용자 정보 가져오기 (JWT 토큰 검증 포함)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return null;
  
  // JWT 토큰에서 사용자 정보 추출
  const userFromToken = getUserFromToken(accessToken);
  if (userFromToken) {
    return userFromToken;
  }
  
  // 토큰이 유효하지 않으면 localStorage에서 데이터 제거
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiration');
  
  return null;
}

// 사용자 정보 저장 (JWT 토큰과 함께)
export function setCurrentUser(user: User, tokens?: TokenPair): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
  
  if (tokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('tokenExpiration', (Date.now() + tokens.expiresIn * 1000).toString());
  }
}

// 로그인 상태 확인 (JWT 토큰 검증 포함)
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return false;
  
  // JWT 토큰 검증
  const payload = verifyAccessToken(accessToken);
  return payload !== null;
}

// 관리자 권한 확인
export function isAdmin(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;
  
  // TODO: 실제 관리자 권한 로직 구현
  // 예: position_id가 특정 값이거나 특별한 권한을 가진 경우
  return currentUser.position_id === '5'; // 임원급
}

// 부서장 권한 확인
export function isDepartmentHead(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;
  
  // TODO: 실제 부서장 권한 로직 구현
  return currentUser.position_id === '4'; // 부장급
}
