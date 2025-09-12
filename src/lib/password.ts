import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * 비밀번호를 해시화합니다.
 * @param password - 평문 비밀번호
 * @returns 해시화된 비밀번호
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('비밀번호는 최소 8자리 이상이어야 합니다.');
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 비밀번호를 검증합니다.
 * @param password - 평문 비밀번호
 * @param hashedPassword - 해시화된 비밀번호
 * @returns 검증 결과
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * 비밀번호 강도를 검증합니다.
 * @param password - 평문 비밀번호
 * @returns 검증 결과 및 메시지
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message: string } {
  if (!password) {
    return { isValid: false, message: '비밀번호를 입력해주세요.' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: '비밀번호는 최소 8자리 이상이어야 합니다.' };
  }
  
  if (password.length > 100) {
    return { isValid: false, message: '비밀번호는 100자리를 초과할 수 없습니다.' };
  }
  
  // 영문, 숫자, 특수문자 중 최소 2가지 조합
  let criteria = 0;
  if (/[a-zA-Z]/.test(password)) criteria++;
  if (/[0-9]/.test(password)) criteria++;
  if (/[^a-zA-Z0-9]/.test(password)) criteria++;
  
  if (criteria < 2) {
    return { 
      isValid: false, 
      message: '비밀번호는 영문, 숫자, 특수문자 중 최소 2가지를 조합해야 합니다.' 
    };
  }
  
  // 연속된 문자 3개 이상 금지
  if (/(.)\1{2,}/.test(password)) {
    return { isValid: false, message: '동일한 문자를 3번 이상 연속으로 사용할 수 없습니다.' };
  }
  
  return { isValid: true, message: '안전한 비밀번호입니다.' };
}

/**
 * 임시 비밀번호를 생성합니다.
 * @returns 임시 비밀번호
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let result = '';
  
  // 각 카테고리에서 최소 1개씩 선택
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%';
  
  result += uppercase[Math.floor(Math.random() * uppercase.length)];
  result += lowercase[Math.floor(Math.random() * lowercase.length)];
  result += numbers[Math.floor(Math.random() * numbers.length)];
  result += special[Math.floor(Math.random() * special.length)];
  
  // 나머지 4자리는 전체 문자에서 랜덤 선택
  for (let i = 4; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // 문자열을 섞어서 반환
  return result.split('').sort(() => Math.random() - 0.5).join('');
}