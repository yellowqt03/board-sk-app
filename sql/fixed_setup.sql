-- ========================================
-- 공지사항 첨부파일 기능 완전 설정 SQL (수정본)
-- Supabase SQL Editor에서 이 전체 코드를 복사해서 실행하세요
-- ========================================

-- 1. departments 테이블에 description 컬럼 추가
DO $$
BEGIN
  -- description 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'description'
  ) THEN
    ALTER TABLE departments ADD COLUMN description TEXT;
    UPDATE departments SET description = name || ' 부서' WHERE description IS NULL;
    RAISE NOTICE 'departments 테이블에 description 컬럼 추가 완료';
  ELSE
    RAISE NOTICE 'departments 테이블에 description 컬럼이 이미 존재합니다';
  END IF;
END $$;

-- 2. users 테이블에 is_admin 컬럼 추가
DO $$
BEGIN
  -- is_admin 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    -- 사번 2번과 1475번을 관리자로 설정
    UPDATE users SET is_admin = TRUE WHERE employee_id IN ('2', '1475');
    RAISE NOTICE 'users 테이블에 is_admin 컬럼 추가 완료';
  ELSE
    RAISE NOTICE 'users 테이블에 is_admin 컬럼이 이미 존재합니다';
  END IF;
END $$;

-- 3. announcement_attachments 테이블 생성
CREATE TABLE IF NOT EXISTS announcement_attachments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
ON announcement_attachments(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_uploaded_at
ON announcement_attachments(uploaded_at DESC);

-- 5. RLS (Row Level Security) 활성화
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성 (기존 정책이 있으면 삭제 후 재생성)
DROP POLICY IF EXISTS "Anyone can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Admins can manage attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Admin users can manage attachments" ON announcement_attachments;

-- 조회 정책: 모든 사용자가 첨부파일을 볼 수 있음
CREATE POLICY "Anyone can view attachments" ON announcement_attachments
FOR SELECT USING (true);

-- 관리 정책: 관리자만 첨부파일을 추가/수정/삭제할 수 있음 (수정됨)
CREATE POLICY "Admins can manage attachments" ON announcement_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);

-- 7. 테이블 생성 확인 및 결과 출력
DO $$
DECLARE
  dept_count INTEGER;
  attach_count INTEGER;
  user_count INTEGER;
  admin_count INTEGER;
BEGIN
  -- departments 테이블 레코드 수 확인
  SELECT COUNT(*) INTO dept_count FROM departments;

  -- announcement_attachments 테이블 레코드 수 확인
  SELECT COUNT(*) INTO attach_count FROM announcement_attachments;

  -- users 테이블 관리자 수 확인
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = true;

  RAISE NOTICE '=== 설정 완료 ===';
  RAISE NOTICE 'departments 테이블: % 개 부서', dept_count;
  RAISE NOTICE 'users 테이블: % 명 사용자 (관리자 % 명)', user_count, admin_count;
  RAISE NOTICE 'announcement_attachments 테이블: % 개 첨부파일', attach_count;
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. Storage → New bucket → 이름: attachments (Private)';
  RAISE NOTICE '2. 테스트: 관리자 계정(사번 2)으로 로그인';
  RAISE NOTICE '3. 공지사항 작성 시 파일 첨부 테스트';
  RAISE NOTICE '=================';
END $$;