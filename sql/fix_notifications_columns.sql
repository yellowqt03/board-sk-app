-- ==================== notifications 테이블 컬럼 수정 ====================
-- 기존 테이블에 누락된 컬럼들을 안전하게 추가

-- 1. 현재 테이블 구조 확인 (주석 해제해서 먼저 실행해보세요)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'notifications'
-- ORDER BY ordinal_position;

-- 2. 누락된 컬럼들 추가
DO $$
BEGIN
  -- priority 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
    RAISE NOTICE '✅ priority 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ priority 컬럼이 이미 존재합니다.';
  END IF;

  -- related_id 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_id BIGINT;
    RAISE NOTICE '✅ related_id 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ related_id 컬럼이 이미 존재합니다.';
  END IF;

  -- read_at 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ read_at 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ read_at 컬럼이 이미 존재합니다.';
  END IF;

  -- data 컬럼 추가 (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
    RAISE NOTICE '✅ data 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ data 컬럼이 이미 존재합니다.';
  END IF;

  -- type 컬럼에 체크 제약조건 추가 (기존 제약조건이 없는 경우)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%type%'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('announcement', 'comment', 'keyword_alert', 'system'));
    RAISE NOTICE '✅ type 체크 제약조건이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ type 체크 제약조건이 이미 존재합니다.';
  END IF;

END $$;

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 4. 복합 인덱스 (읽지 않은 알림 최적화)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'notifications'
    AND indexname = 'idx_notifications_user_unread'
  ) THEN
    CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
    RAISE NOTICE '✅ 복합 인덱스가 추가되었습니다.';
  END IF;
END $$;

-- 5. 외래키 제약조건 추가
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
    RAISE NOTICE '✅ 외래키 제약조건이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ 외래키 제약조건이 이미 존재합니다.';
  END IF;
END $$;

-- 6. RLS 정책 설정
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- 9. 테스트 알림 삽입
DO $$
DECLARE
  test_user_id BIGINT;
BEGIN
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
    RAISE NOTICE '🎉 테스트 알림이 생성되었습니다! (사용자 ID: %)', test_user_id;
  ELSE
    RAISE NOTICE '⚠️ 사용자가 없어 테스트 알림을 생성할 수 없습니다.';
  END IF;
END $$;

-- 10. 최종 상태 확인
DO $$
BEGIN
  RAISE NOTICE '🎉 notifications 테이블 수정 완료!';
  RAISE NOTICE '📊 총 알림 수: %', (SELECT COUNT(*) FROM notifications);
  RAISE NOTICE '📊 테이블 컬럼 수: %', (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'notifications'
  );
END $$;