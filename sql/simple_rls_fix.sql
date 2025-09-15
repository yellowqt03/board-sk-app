-- ==================== 간단한 RLS 수정 ====================

-- 방법 1: RLS 완전 비활성화 (가장 간단)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 방법 2: 또는 모든 인증된 사용자가 알림을 생성할 수 있도록 허용
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--
-- -- 기존 정책 삭제
-- DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
-- DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
--
-- -- 새 정책: 인증된 사용자는 누구나 알림 생성 가능
-- CREATE POLICY "Authenticated users can insert notifications" ON notifications
--   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 테스트용 알림 생성
INSERT INTO notifications (user_id, type, title, content, priority)
SELECT
  id,
  'system',
  '🎉 RLS 수정 완료 테스트',
  'RLS 정책이 수정되어 알림 시스템이 정상 작동합니다!',
  'normal'
FROM users
LIMIT 3;