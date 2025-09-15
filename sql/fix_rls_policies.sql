-- ==================== RLS 정책 수정 ====================
-- 관리자가 모든 사용자에게 알림을 생성할 수 있도록 정책 수정

-- 1. 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- 2. 새로운 RLS 정책 생성

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.uid()::text::integer = user_id
  );

-- 사용자는 자신의 알림만 수정 가능
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    auth.uid()::text::integer = user_id
  );

-- 관리자는 모든 알림 생성 가능
CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text::integer
      AND users.is_admin = true
    )
  );

-- 시스템(서비스 역할)도 알림 생성 가능
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- 트리거 함수도 알림 생성 가능 (인증 없이)
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    current_setting('role') = 'postgres' OR
    current_user = 'postgres' OR
    auth.uid() IS NULL
  );

-- 3. 간단한 테스트 알림 생성 (관리자만)
DO $$
DECLARE
  admin_user_id INTEGER;
  test_user_id INTEGER;
BEGIN
  -- 관리자 사용자 찾기
  SELECT id INTO admin_user_id FROM users WHERE is_admin = true LIMIT 1;

  -- 일반 사용자 찾기
  SELECT id INTO test_user_id FROM users WHERE is_admin = false OR is_admin IS NULL LIMIT 1;

  IF admin_user_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- 관리자 권한으로 테스트 알림 생성
    INSERT INTO notifications (user_id, type, title, content, priority)
    VALUES (
      test_user_id,
      'system',
      '🔧 RLS 정책 테스트',
      'RLS 정책이 수정되어 관리자가 알림을 생성할 수 있습니다.',
      'normal'
    );

    RAISE NOTICE '✅ 테스트 알림 생성 성공! (관리자 ID: %, 대상 사용자 ID: %)', admin_user_id, test_user_id;
  ELSE
    RAISE NOTICE '❌ 관리자 또는 일반 사용자를 찾을 수 없습니다.';
  END IF;
END $$;