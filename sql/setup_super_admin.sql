-- ==================== 권한 시스템 개선 ====================
-- 김민혁을 최고 관리자로 설정하고 권한 시스템 구축

-- 1. 사용자 권한 레벨 추가
DO $$
BEGIN
  -- role 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    RAISE NOTICE 'users 테이블에 role 컬럼 추가 완료';
  END IF;

  -- super_admin 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'users 테이블에 is_super_admin 컬럼 추가 완료';
  END IF;
END $$;

-- 2. 김민혁을 최고 관리자로 설정 (사번으로 검색)
UPDATE users
SET
  is_super_admin = TRUE,
  role = 'super_admin',
  is_admin = TRUE
WHERE employee_id IN (
  SELECT employee_id
  FROM employee_master
  WHERE name = '김민혁'
);

-- 3. 결과 확인
DO $$
DECLARE
  admin_count INTEGER;
  super_admin_info RECORD;
BEGIN
  -- 관리자 수 확인
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
  RAISE NOTICE '현재 관리자 수: %', admin_count;

  -- 최고 관리자 정보 확인
  SELECT
    u.employee_id,
    em.name,
    u.role,
    u.is_admin,
    u.is_super_admin
  INTO super_admin_info
  FROM users u
  JOIN employee_master em ON u.employee_id = em.employee_id
  WHERE u.is_super_admin = TRUE
  LIMIT 1;

  IF FOUND THEN
    RAISE NOTICE '최고 관리자 설정 완료: % (사번: %)', super_admin_info.name, super_admin_info.employee_id;
  ELSE
    RAISE NOTICE '김민혁을 찾을 수 없습니다. 사용자 정보를 확인해주세요.';
  END IF;
END $$;

-- 4. 권한 레벨 정의 (참고용)
/*
권한 레벨:
- super_admin: 최고 관리자 (모든 권한)
- admin: 일반 관리자 (대부분의 관리 권한)
- moderator: 중간 관리자 (게시물 관리 등)
- user: 일반 사용자
*/