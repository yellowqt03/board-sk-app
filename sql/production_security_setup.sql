-- ==================== 운영 환경 보안 설정 ====================
-- 프로덕션 환경을 위한 강화된 RLS 정책

-- 1. RLS 다시 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- 3. 운영환경용 보안 정책 생성

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "users_select_own_notifications" ON notifications
  FOR SELECT USING (
    auth.uid()::text::integer = user_id
  );

-- 사용자는 자신의 알림만 읽음 상태로 업데이트 가능
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (
    auth.uid()::text::integer = user_id
  )
  WITH CHECK (
    auth.uid()::text::integer = user_id
  );

-- 시스템이 알림 생성 가능 (트리거용)
CREATE POLICY "system_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (
    -- PostgreSQL 시스템 계정 또는 인증되지 않은 요청 (트리거)
    current_user = 'postgres' OR
    auth.uid() IS NULL OR
    auth.role() = 'service_role'
  );

-- 관리자는 시스템 알림만 생성 가능
CREATE POLICY "admin_insert_system_notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text::integer
      AND users.is_admin = true
    ) AND
    type = 'system'
  );

-- 4. notification_settings 테이블 RLS 설정
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "users_manage_own_settings" ON notification_settings;

-- 사용자는 자신의 설정만 관리 가능
CREATE POLICY "users_manage_own_settings" ON notification_settings
  FOR ALL USING (
    auth.uid()::text::integer = user_id
  )
  WITH CHECK (
    auth.uid()::text::integer = user_id
  );

-- 5. 감사 로그를 위한 함수 생성
CREATE OR REPLACE FUNCTION log_notification_access()
RETURNS TRIGGER AS $$
BEGIN
  -- 중요한 알림 접근을 로그에 기록
  IF (TG_OP = 'INSERT' AND NEW.priority = 'urgent') OR
     (TG_OP = 'UPDATE' AND (NEW.priority = 'urgent' OR OLD.priority = 'urgent')) OR
     (TG_OP = 'DELETE' AND OLD.priority = 'urgent') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      user_id,
      record_id,
      old_data,
      new_data,
      timestamp
    ) VALUES (
      'notifications',
      TG_OP,
      COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub', '0')::integer,
      CASE
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      NOW()
    );
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 감사 로그 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  user_id INTEGER,
  record_id BIGINT,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 감사 로그 트리거 생성
DROP TRIGGER IF EXISTS notification_audit_trigger ON notifications;
CREATE TRIGGER notification_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION log_notification_access();

-- 7. 알림 생성 제한 함수 (스팸 방지)
CREATE OR REPLACE FUNCTION check_notification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- 같은 사용자에게 지난 1분간 같은 타입의 알림이 5개 이상 생성되었는지 확인
  SELECT COUNT(*) INTO recent_count
  FROM notifications
  WHERE user_id = NEW.user_id
    AND type = NEW.type
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION '알림 생성 제한: 1분당 같은 타입의 알림은 5개까지만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 알림 제한 트리거 생성
DROP TRIGGER IF EXISTS notification_rate_limit_trigger ON notifications;
CREATE TRIGGER notification_rate_limit_trigger
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION check_notification_rate_limit();

-- 8. 알림 만료 처리 함수
CREATE OR REPLACE FUNCTION mark_expired_notifications()
RETURNS void AS $$
BEGIN
  -- 30일 지난 읽지 않은 알림을 읽음 처리
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE is_read = false
    AND created_at < NOW() - INTERVAL '30 days';

  -- 90일 지난 알림 삭제 (시스템 알림 제외)
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND type != 'system';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '🔒 운영 환경 보안 설정 완료!';
  RAISE NOTICE '✅ RLS 정책 강화됨';
  RAISE NOTICE '✅ 감사 로그 시스템 활성화됨';
  RAISE NOTICE '✅ 스팸 방지 시스템 활성화됨';
  RAISE NOTICE '✅ 알림 만료 처리 함수 생성됨';
END $$;