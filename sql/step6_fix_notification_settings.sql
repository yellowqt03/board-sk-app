-- ==================== 6단계 수정 ====================
-- notification_settings 테이블에 누락된 컬럼 추가

-- 1. 먼저 현재 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'notification_settings'
-- ORDER BY ordinal_position;

-- 2. comment_alerts 컬럼이 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'comment_alerts'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN comment_alerts BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'comment_alerts 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'comment_alerts 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3. 다른 누락된 컬럼들도 확인하고 추가
DO $$
BEGIN
  -- email_notifications 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'email_notifications 컬럼이 추가되었습니다.';
  END IF;

  -- push_notifications 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'push_notifications'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN push_notifications BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'push_notifications 컬럼이 추가되었습니다.';
  END IF;

  -- keyword_alerts 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'keyword_alerts'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN keyword_alerts BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'keyword_alerts 컬럼이 추가되었습니다.';
  END IF;

  -- announcement_alerts 컬럼 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'announcement_alerts'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN announcement_alerts BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'announcement_alerts 컬럼이 추가되었습니다.';
  END IF;
END $$;

-- 4. 이제 기존 사용자들에게 기본 알림 설정 추가
INSERT INTO notification_settings (user_id, email_notifications, push_notifications, keyword_alerts, announcement_alerts, comment_alerts)
SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE
FROM users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO UPDATE SET
  email_notifications = COALESCE(notification_settings.email_notifications, TRUE),
  push_notifications = COALESCE(notification_settings.push_notifications, TRUE),
  keyword_alerts = COALESCE(notification_settings.keyword_alerts, TRUE),
  announcement_alerts = COALESCE(notification_settings.announcement_alerts, TRUE),
  comment_alerts = COALESCE(notification_settings.comment_alerts, TRUE);

-- 5. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ notification_settings 테이블 수정 완료!';
  RAISE NOTICE '📊 현재 설정된 사용자 수: %', (SELECT COUNT(*) FROM notification_settings);
END $$;