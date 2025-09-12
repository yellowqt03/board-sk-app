/**
 * 사번을 4자리 형식으로 포맷팅합니다.
 * @param employeeId - 사번 (문자열 또는 숫자)
 * @returns 4자리로 패딩된 사번 (예: "2" -> "0002")
 */
export function formatEmployeeId(employeeId: string | number): string {
  if (!employeeId) return '';
  
  const idString = employeeId.toString();
  
  // 이미 4자리 이상이면 그대로 반환
  if (idString.length >= 4) {
    return idString;
  }
  
  // 4자리로 패딩
  return idString.padStart(4, '0');
}

/**
 * 사번을 표시용으로 포맷팅합니다 (4자리 + 구분자).
 * @param employeeId - 사번
 * @returns 포맷팅된 사번 (예: "0002")
 */
export function displayEmployeeId(employeeId: string | number): string {
  return formatEmployeeId(employeeId);
}

/**
 * 날짜를 상대적 시간으로 포맷팅합니다.
 * @param date - 날짜 문자열 또는 Date 객체
 * @returns 상대적 시간 문자열 (예: "2시간 전")
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '방금 전';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}주 전`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}개월 전`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}년 전`;
}

/**
 * 텍스트를 안전하게 이스케이프합니다.
 * @param text - 이스케이프할 텍스트
 * @returns 이스케이프된 텍스트
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 클래스명을 조건부로 결합합니다.
 * @param classes - 클래스명들
 * @returns 결합된 클래스명
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
