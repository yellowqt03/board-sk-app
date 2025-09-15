-- ==================== 완전한 알림 시스템 설정 ====================
-- 이 스크립트는 안전하게 실행할 수 있습니다 (기존 데이터 손상 없음)

-- 1. notifications 테이블 생성 (없는 경우에만)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('announcement', 'comment', 'keyword_alert', 'system')),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  related_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- 2. 외래키 제약조건 추가 (없는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notifications'
    AND constraint_name = 'fk_notifications_user_id'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 4. 복합 인덱스 생성 (읽지 않은 알림 조회 최적화)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'notifications'
    AND indexname = 'idx_notifications_user_unread'
  ) THEN
    CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
  END IF;
END $$;

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성 (중복 생성 방지)
DO $$
BEGIN
  -- 사용자 조회 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Users can view own notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own notifications" ON notifications
      FOR SELECT USING (auth.uid()::text = user_id::text)';
  END IF;

  -- 사용자 수정 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Users can update own notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE USING (auth.uid()::text = user_id::text)';
  END IF;

  -- 서비스 삽입 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Service role can insert notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert notifications" ON notifications
      FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- 7. 실시간 알림 함수
CREATE OR REPLACE FUNCTION notify_users()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'notification_channel',
    json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 실시간 알림 트리거
DROP TRIGGER IF EXISTS notifications_notify_trigger ON notifications;
CREATE TRIGGER notifications_notify_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_users();

-- 9. 테스트 알림 삽입 (실제 사용자가 있는 경우에만)
DO $$
DECLARE
  test_user_id BIGINT;
BEGIN
  -- 첫 번째 사용자 ID 가져오기
  SELECT id INTO test_user_id FROM users LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    -- 기존 테스트 알림 삭제
    DELETE FROM notifications WHERE title = '🧪 시스템 테스트 알림';

    -- 새 테스트 알림 삽입
    INSERT INTO notifications (user_id, type, title, content, priority)
    VALUES (
      test_user_id,
      'system',
      '🧪 시스템 테스트 알림',
      '실시간 알림 시스템이 정상적으로 설정되었습니다!',
      'normal'
    );
  END IF;
END $$;