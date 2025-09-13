import validator from 'validator';
import DOMPurify from 'dompurify';

// 서버사이드에서 DOMPurify 사용을 위한 설정
let purify: typeof DOMPurify;
if (typeof window === 'undefined') {
  // 서버 환경
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createDOMPurify = require('dompurify');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('').window;
  purify = createDOMPurify(window as unknown as Window);
} else {
  // 클라이언트 환경
  purify = DOMPurify;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * 문자열을 안전하게 정리하고 XSS 공격을 방지합니다.
 * @param input - 입력 문자열
 * @param options - 정리 옵션
 * @returns 정리된 문자열
 */
export function sanitizeHtml(input: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config = {
    ALLOWED_TAGS: options?.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
    ALLOWED_ATTR: options?.allowedAttributes || [],
    REMOVE_DATA_URI: true,
    REMOVE_SCRIPT_TYPE_ATTR: true,
    REMOVE_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  };

  return purify.sanitize(input, config) as unknown as string;
}

/**
 * 일반 텍스트를 정리합니다 (HTML 태그 모두 제거).
 * @param input - 입력 문자열
 * @returns 정리된 텍스트
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return (purify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  }) as unknown as string).trim();
}

/**
 * 이메일 주소를 검증합니다.
 * @param email - 이메일 주소
 * @returns 검증 결과
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: '이메일 주소를 입력해주세요.' };
  }

  const sanitized = sanitizeText(email);
  
  if (sanitized !== email) {
    return { isValid: false, error: '이메일 주소에 유효하지 않은 문자가 포함되어 있습니다.' };
  }

  if (!validator.isEmail(sanitized)) {
    return { isValid: false, error: '유효하지 않은 이메일 형식입니다.' };
  }

  if (sanitized.length > 254) {
    return { isValid: false, error: '이메일 주소가 너무 깁니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 사번을 검증합니다.
 * @param employeeId - 사번
 * @returns 검증 결과
 */
export function validateEmployeeId(employeeId: string): ValidationResult {
  if (!employeeId || typeof employeeId !== 'string') {
    return { isValid: false, error: '사번을 입력해주세요.' };
  }

  const sanitized = sanitizeText(employeeId);
  
  if (sanitized !== employeeId) {
    return { isValid: false, error: '사번에 유효하지 않은 문자가 포함되어 있습니다.' };
  }

  // 사번은 영문자와 숫자만 허용 (4-20자)
  if (!/^[a-zA-Z0-9]{4,20}$/.test(sanitized)) {
    return { isValid: false, error: '사번은 영문자와 숫자 4-20자리로 입력해주세요.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 게시글 제목을 검증합니다.
 * @param title - 제목
 * @returns 검증 결과
 */
export function validatePostTitle(title: string): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: '제목을 입력해주세요.' };
  }

  const sanitized = sanitizeText(title);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: '제목을 입력해주세요.' };
  }

  if (sanitized.length > 200) {
    return { isValid: false, error: '제목은 200자를 초과할 수 없습니다.' };
  }

  // 제목에는 특정 특수문자 금지
  if (/[<>\"'&]/.test(sanitized)) {
    return { isValid: false, error: '제목에 허용되지 않는 특수문자가 포함되어 있습니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 게시글 내용을 검증합니다.
 * @param content - 내용
 * @returns 검증 결과
 */
export function validatePostContent(content: string): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: '내용을 입력해주세요.' };
  }

  const sanitized = sanitizeHtml(content);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: '내용을 입력해주세요.' };
  }

  if (sanitized.length > 10000) {
    return { isValid: false, error: '내용은 10,000자를 초과할 수 없습니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 댓글을 검증합니다.
 * @param comment - 댓글
 * @returns 검증 결과
 */
export function validateComment(comment: string): ValidationResult {
  if (!comment || typeof comment !== 'string') {
    return { isValid: false, error: '댓글을 입력해주세요.' };
  }

  const sanitized = sanitizeText(comment);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: '댓글을 입력해주세요.' };
  }

  if (sanitized.length > 1000) {
    return { isValid: false, error: '댓글은 1,000자를 초과할 수 없습니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 검색어를 검증합니다.
 * @param query - 검색어
 * @returns 검증 결과
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: '검색어를 입력해주세요.' };
  }

  const sanitized = sanitizeText(query);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: '검색어를 입력해주세요.' };
  }

  if (sanitized.length < 2) {
    return { isValid: false, error: '검색어는 2자 이상 입력해주세요.' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: '검색어는 100자를 초과할 수 없습니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * 파일명을 검증합니다.
 * @param filename - 파일명
 * @returns 검증 결과
 */
export function validateFilename(filename: string): ValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { isValid: false, error: '파일명을 입력해주세요.' };
  }

  const sanitized = sanitizeText(filename);
  
  if (sanitized.length === 0) {
    return { isValid: false, error: '파일명을 입력해주세요.' };
  }

  if (sanitized.length > 255) {
    return { isValid: false, error: '파일명은 255자를 초과할 수 없습니다.' };
  }

  // 파일명에 허용되지 않는 문자 검사
  if (/[<>:"/\\|?*\x00-\x1f]/.test(sanitized)) {
    return { isValid: false, error: '파일명에 허용되지 않는 문자가 포함되어 있습니다.' };
  }

  // 예약된 파일명 검사 (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExtension = sanitized.split('.')[0].toUpperCase();
  
  if (reservedNames.includes(nameWithoutExtension)) {
    return { isValid: false, error: '예약된 파일명은 사용할 수 없습니다.' };
  }

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * SQL 인젝션 패턴을 검사합니다.
 * @param input - 입력 문자열
 * @returns 위험한 패턴이 발견되었는지 여부
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\'|\\\'|;|--|(\s*(or|and)\s+.*(=|like)))/gi,
    /(\/\*.*?\*\/)/gi,
    /(\bxp_cmdshell\b)/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * 일반적인 입력값 검증 함수
 * @param input - 입력값
 * @param options - 검증 옵션
 * @returns 검증 결과
 */
export function validateInput(input: string, options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowHtml?: boolean;
  customValidator?: (value: string) => ValidationResult;
}): ValidationResult {
  const { required = true, minLength = 0, maxLength = 1000, pattern, allowHtml = false, customValidator } = options;

  if (!input || typeof input !== 'string') {
    if (required) {
      return { isValid: false, error: '필수 입력 항목입니다.' };
    }
    return { isValid: true, sanitizedValue: '' };
  }

  // SQL 인젝션 검사
  if (containsSqlInjection(input)) {
    return { isValid: false, error: '허용되지 않는 문자열이 포함되어 있습니다.' };
  }

  // HTML 허용 여부에 따른 정리
  const sanitized = allowHtml ? sanitizeHtml(input) : sanitizeText(input);

  if (required && sanitized.length === 0) {
    return { isValid: false, error: '필수 입력 항목입니다.' };
  }

  if (sanitized.length < minLength) {
    return { isValid: false, error: `최소 ${minLength}자 이상 입력해주세요.` };
  }

  if (sanitized.length > maxLength) {
    return { isValid: false, error: `최대 ${maxLength}자까지 입력 가능합니다.` };
  }

  if (pattern && !pattern.test(sanitized)) {
    return { isValid: false, error: '입력 형식이 올바르지 않습니다.' };
  }

  if (customValidator) {
    const customResult = customValidator(sanitized);
    if (!customResult.isValid) {
      return customResult;
    }
  }

  return { isValid: true, sanitizedValue: sanitized };
}