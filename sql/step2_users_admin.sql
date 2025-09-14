-- ==================== 2단계 ====================
-- users 테이블에 is_admin 컬럼 추가 및 관리자 설정
-- 1단계 완료 후 이 부분을 실행하세요

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    -- 사번 2번과 1475번을 관리자로 설정
    UPDATE users SET is_admin = TRUE WHERE employee_id IN ('2', '1475');
    RAISE NOTICE '2단계: users 테이블에 is_admin 컬럼 추가 완료';
    RAISE NOTICE '관리자로 설정된 사용자 수: %', (SELECT COUNT(*) FROM users WHERE is_admin = TRUE);
  ELSE
    RAISE NOTICE '2단계: users 테이블에 is_admin 컬럼이 이미 존재합니다';
    RAISE NOTICE '현재 관리자 수: %', (SELECT COUNT(*) FROM users WHERE is_admin = TRUE);
  END IF;
END $$;