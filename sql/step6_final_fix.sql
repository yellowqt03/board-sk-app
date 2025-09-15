-- ==================== 6단계 최종 수정 ====================
-- notification_settings 테이블 문제 해결

-- 1. 먼저 comment_alerts 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_settings' AND column_name = 'comment_alerts'
  ) THEN
    ALTER TABLE notification_settings ADD COLUMN comment_alerts BOOLEAN DEFAULT TRUE;
    RAISE NOTICE '✅ comment_alerts 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ comment_alerts 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 2. user_id에 UNIQUE 제약조건 추가 (없는 경우만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_settings'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%'
  ) THEN
    ALTER TABLE notification_settings ADD CONSTRAINT unique_notification_settings_user_id UNIQUE (user_id);
    RAISE NOTICE '✅ user_id UNIQUE 제약조건이 추가되었습니다.';
  ELSE
    RAISE NOTICE '✅ user_id UNIQUE 제약조건이 이미 존재합니다.';
  END IF;
END $$;

-- 3. 기존 사용자들에게 기본 알림 설정 추가 (안전한 방식)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN
        SELECT id FROM users
        WHERE id NOT IN (SELECT user_id FROM notification_settings WHERE user_id IS NOT NULL)
    LOOP
        BEGIN
            INSERT INTO notification_settings (
                user_id,
                email_notifications,
                push_notifications,
                keyword_alerts,
                announcement_alerts,
                comment_alerts
            ) VALUES (
                user_record.id,
                TRUE,
                TRUE,
                TRUE,
                TRUE,
                TRUE
            );
            RAISE NOTICE '✅ 사용자 ID % 에게 알림 설정 추가됨', user_record.id;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE '⚠️  사용자 ID % 는 이미 설정이 있습니다', user_record.id;
            WHEN OTHERS THEN
                RAISE NOTICE '❌ 사용자 ID % 설정 추가 실패: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- 4. 결과 확인
DO $$
BEGIN
  RAISE NOTICE '🎉 설정 완료!';
  RAISE NOTICE '📊 총 사용자 수: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE '📊 알림 설정된 사용자 수: %', (SELECT COUNT(*) FROM notification_settings);
  RAISE NOTICE '📊 설정되지 않은 사용자 수: %', (
    SELECT COUNT(*) FROM users
    WHERE id NOT IN (SELECT user_id FROM notification_settings WHERE user_id IS NOT NULL)
  );
END $$;