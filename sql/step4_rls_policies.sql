-- ==================== 4단계 ====================
-- RLS 정책 설정
-- 3단계 완료 후 이 부분을 실행하세요

-- RLS 활성화
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- 기존 정책들 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Admins can manage attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Admin users can manage attachments" ON announcement_attachments;

-- 조회 정책: 모든 사용자가 첨부파일을 볼 수 있음
CREATE POLICY "Anyone can view attachments" ON announcement_attachments
FOR SELECT USING (true);

-- 관리 정책: 관리자만 첨부파일을 추가/수정/삭제할 수 있음
CREATE POLICY "Admins can manage attachments" ON announcement_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);

-- 결과 확인
DO $$
DECLARE
  dept_count INTEGER;
  user_count INTEGER;
  admin_count INTEGER;
  attach_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dept_count FROM departments;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = true;
  SELECT COUNT(*) INTO attach_count FROM announcement_attachments;

  RAISE NOTICE '==== 모든 설정 완료 ====';
  RAISE NOTICE 'departments: % 개 부서', dept_count;
  RAISE NOTICE 'users: % 명 (관리자 % 명)', user_count, admin_count;
  RAISE NOTICE 'attachments: % 개 파일', attach_count;
  RAISE NOTICE '';
  RAISE NOTICE '마지막 단계:';
  RAISE NOTICE '1. Storage → New bucket → attachments (Private)';
  RAISE NOTICE '2. 테스트: 사번 2로 로그인 → 공지사항 작성 → 파일 첨부';
  RAISE NOTICE '========================';
END $$;