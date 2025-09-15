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
  const debugLog: string[] = [];

  try {
    debugLog.push(`🔐 로그인 시작 - 원본 사번: ${credentials.employeeId}`);

    // 사번을 4자리 패딩 형식으로 변환 (예: 2 -> 0002)
    let paddedEmployeeId = credentials.employeeId.padStart(4, '0');
    debugLog.push(`📝 패딩된 사번: ${paddedEmployeeId}`);

    console.log('로그인 디버그:', debugLog);

    // 1. Supabase에서 직원 정보 조회 (단순화된 쿼리로 먼저 시도)
    debugLog.push(`1️⃣ 직원 정보 조회 시작`);
    let { data: employee, error: employeeError } = await supabase
      .from('employee_master')
      .select(`
        id,
        employee_id,
        name,
        email,
        department_id,
        position_id,
        is_active,
        status
      `)
      .eq('employee_id', paddedEmployeeId)
      .single();

    console.log('직원 조회 결과:', { employee, employeeError });
    debugLog.push(`📊 직원 조회 결과: ${employee ? `발견 (${employee.name})` : `실패 (${employeeError?.message})`}`);

    if (employeeError || !employee) {
      // 원본 사번으로도 시도
      debugLog.push(`🔄 원본 사번으로 재시도: ${credentials.employeeId}`);
      const { data: originalEmployee, error: originalError } = await supabase
        .from('employee_master')
        .select(`
          id,
          employee_id,
          name,
          email,
          department_id,
          position_id,
          is_active,
          status
        `)
        .eq('employee_id', credentials.employeeId)
        .single();

      console.log('원본 사번 조회 결과:', { originalEmployee, originalError });

      if (originalError || !originalEmployee) {
        console.error('로그인 실패 - 디버그 로그:', debugLog);
        return { user: null, error: `존재하지 않는 사번입니다. (입력: ${credentials.employeeId}, 패딩: ${paddedEmployeeId})` };
      } else {
        // 원본 사번으로 발견된 경우 사용
        employee = originalEmployee;
        paddedEmployeeId = credentials.employeeId;
        debugLog.push(`✅ 원본 사번으로 발견: ${employee.name}`);
      }
    }

    // 2. 활성 사용자인지 확인
    debugLog.push(`2️⃣ 활성 사용자 확인: ${employee.is_active}`);
    if (!employee.is_active) {
      console.error('로그인 실패 - 디버그 로그:', debugLog);
      return { user: null, error: '비활성화된 계정입니다.' };
    }

    // 3. 승인된 사용자인지 확인
    debugLog.push(`3️⃣ 승인 상태 확인: ${employee.status}`);
    if (employee.status !== 'approved') {
      console.error('로그인 실패 - 디버그 로그:', debugLog);
      return { user: null, error: '아직 승인되지 않은 계정입니다.' };
    }

    // 4. 사용자 계정 확인
    debugLog.push(`4️⃣ users 테이블 계정 확인: ${paddedEmployeeId}`);
    const { data: userAccount, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', paddedEmployeeId)
      .single();

    console.log('사용자 계정 조회 결과:', { userAccount, userError });
    if (userAccount) {
      console.log('🔍 users 테이블 스키마 (실제 컬럼들):', Object.keys(userAccount));
      debugLog.push(`📊 users 조회 결과: 발견 - 컬럼: [${Object.keys(userAccount).join(', ')}]`);
    } else {
      debugLog.push(`📊 users 조회 결과: 실패 (${userError?.message})`);
    }

    if (userError || !userAccount) {
      console.error('로그인 실패 - 디버그 로그:', debugLog);
      return { user: null, error: `사용자 계정이 존재하지 않습니다. (사번: ${paddedEmployeeId}, 오류: ${userError?.message})` };
    }

    // 5. 비밀번호 확인 (bcrypt 사용)
    debugLog.push(`5️⃣ 비밀번호 검증 시작`);
    const isValidPassword = await verifyPassword(credentials.password, userAccount.password_hash);
    debugLog.push(`🔑 비밀번호 검증 결과: ${isValidPassword}`);

    if (!isValidPassword) {
      console.error('로그인 실패 - 디버그 로그:', debugLog);
      return { user: null, error: '비밀번호가 올바르지 않습니다.' };
    }

    // 6. 로그인 성공 - 사용자 정보 반환
    debugLog.push(`✅ 로그인 성공! 사용자 정보 생성`);
    console.log('로그인 성공 - 디버그 로그:', debugLog);

    const user: User = {
      id: employee.id.toString(),
      employee_id: employee.employee_id,
      name: employee.name,
      email: employee.email || '',
      department_id: employee.department_id?.toString() || '',
      position_id: employee.position_id?.toString() || '',
      is_active: employee.is_active,
      status: employee.status,
      role: 'user', // 기본값으로 설정
      is_admin: userAccount?.is_admin || false,
      is_super_admin: userAccount?.is_super_admin || false
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
    debugLog.push(`❌ 예외 발생: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('로그인 예외 - 디버그 로그:', debugLog);
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
