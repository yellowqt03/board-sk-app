import { supabase } from './supabase';
import { verifyPassword } from './password';
import { generateTokens, TokenPair } from './jwt';

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
  role?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
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
      return { user: null, error: `존재하지 않는 사번입니다. (사번: ${paddedEmployeeId})` };
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
      .select('password_hash, role, is_admin, is_super_admin')
      .eq('employee_id', paddedEmployeeId)
      .single();


    if (userError || !userAccount) {
      return { user: null, error: `사용자 계정이 존재하지 않습니다. (사번: ${paddedEmployeeId})` };
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
      status: employee.status,
      role: userAccount.role || 'user',
      is_admin: userAccount.is_admin || false,
      is_super_admin: userAccount.is_super_admin || false
    };

    
    // 간단한 세션 기반 인증 (JWT 대신)
    try {
      const tokens = generateTokens(user);
      return { user, error: null, tokens };
    } catch (tokenError) {
      console.error('토큰 생성 실패, 세션만 사용:', tokenError);
      console.error('토큰 생성 실패 상세:', tokenError);
      // 토큰 생성 실패해도 사용자 정보는 반환
      return { user, error: null };
    }

  } catch (error) {
    console.error('로그인 오류 상세:', error);
    console.error('오류 타입:', typeof error);
    console.error('오류 메시지:', error instanceof Error ? error.message : 'Unknown error');
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack');
    return { user: null, error: `로그인 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

// 현재 사용자 정보 가져오기 (단순화된 버전)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  // 먼저 localStorage에서 사용자 정보 확인
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr) as User;
    return user;
  } catch (error) {
    console.error('사용자 정보 파싱 오류:', error);
    // 파싱 오류가 있는 경우에만 제거
    localStorage.removeItem('user');
    return null;
  }
}

// 사용자 정보 저장 (JWT 토큰과 함께)
export function setCurrentUser(user: User, tokens?: TokenPair): void {
  if (typeof window === 'undefined') return;
  
  
  localStorage.setItem('user', JSON.stringify(user));
  
  if (tokens) {
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('tokenExpiration', (Date.now() + tokens.expiresIn * 1000).toString());
    
    
  } else {
  }
}

// 로그인 상태 확인 (단순화된 버전)
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const user = localStorage.getItem('user');
  return !!user;
}

// 최고 관리자 권한 확인
export function isSuperAdmin(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  return currentUser.is_super_admin === true;
}

// 관리자 권한 확인 (일반 관리자 + 최고 관리자)
export function isAdmin(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  return currentUser.is_admin === true || currentUser.is_super_admin === true;
}

// 중간 관리자 권한 확인
export function isModerator(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  return currentUser.role === 'moderator' || isAdmin(currentUser);
}

// 부서장 권한 확인
export function isDepartmentHead(user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  return currentUser.position_id === '4' || isAdmin(currentUser); // 부장급 + 관리자
}

// 권한 레벨 확인
export function hasPermission(requiredRole: string, user: User | null = null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  const roleHierarchy = ['user', 'moderator', 'admin', 'super_admin'];
  const userRoleIndex = roleHierarchy.indexOf(currentUser.role || 'user');
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}

// 비밀번호 변경 함수
export async function changePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        currentPassword,
        newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || '비밀번호 변경에 실패했습니다.' };
    }

    return { success: true, message: data.message || '비밀번호가 성공적으로 변경되었습니다.' };
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return { success: false, message: '네트워크 오류가 발생했습니다.' };
  }
}
