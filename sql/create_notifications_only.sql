-- ==================== notifications 테이블만 생성 ====================

-- 1. notifications 테이블 생성
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
  read_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_notifications_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 3. RLS (Row Level Security) 정책 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. 사용자는 자신의 알림만 볼 수 있도록 정책 설정
CREATE POLICY IF NOT EXISTS "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 5. 시스템에서 알림 생성 허용 (서비스 역할)
CREATE POLICY IF NOT EXISTS "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 6. 실시간 알림 함수 생성
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

-- 7. 실시간 알림 트리거 생성
DROP TRIGGER IF EXISTS notifications_notify_trigger ON notifications;
CREATE TRIGGER notifications_notify_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_users();

-- 8. 완료 확인
DO $$
BEGIN
  RAISE NOTICE '🎉 notifications 테이블 생성 완료!';
  RAISE NOTICE '📊 테이블 존재 여부: %', (
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'notifications'
    ) THEN 'YES' ELSE 'NO' END
  );
END $$;