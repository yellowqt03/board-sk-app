-- ==================== 알림 정리 및 보관 정책 (수정됨) ====================
-- 오래된 알림의 자동 정리 및 보관을 위한 시스템

-- 1. 알림 보관 테이블 생성
CREATE TABLE IF NOT EXISTS notifications_archive (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  related_id BIGINT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 보관 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_archive_user_created
ON notifications_archive(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_archive_type_created
ON notifications_archive(type, created_at DESC);

-- 2. 알림 정리 정책 설정 테이블
CREATE TABLE IF NOT EXISTS notification_cleanup_policy (
  id SERIAL PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  retention_days INTEGER NOT NULL,
  archive_before_delete BOOLEAN DEFAULT TRUE,
  applies_to_type VARCHAR(50), -- NULL이면 모든 타입
  applies_to_priority VARCHAR(20), -- NULL이면 모든 우선순위
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 정리 정책 삽입
INSERT INTO notification_cleanup_policy (
  policy_name, description, retention_days, archive_before_delete, applies_to_type, applies_to_priority
) VALUES
  ('일반_알림_정리', '일반 알림은 읽은 후 90일 뒤 보관, 180일 뒤 삭제', 90, true, NULL, 'normal'),
  ('긴급_알림_정리', '긴급 알림은 읽은 후 180일 뒤 보관, 365일 뒤 삭제', 180, true, NULL, 'urgent'),
  ('시스템_알림_정리', '시스템 알림은 365일 뒤 보관, 삭제하지 않음', 365, true, 'system', NULL),
  ('읽지않은_알림_정리', '읽지 않은 알림은 30일 뒤 자동으로 읽음 처리', 30, false, NULL, NULL)
ON CONFLICT (policy_name) DO UPDATE SET
  description = EXCLUDED.description,
  retention_days = EXCLUDED.retention_days,
  updated_at = NOW();

-- 3. 스마트 정리 함수 (정책 기반)
CREATE OR REPLACE FUNCTION cleanup_notifications_by_policy()
RETURNS TABLE (
  policy_applied VARCHAR(100),
  notifications_processed INTEGER,
  notifications_archived INTEGER,
  notifications_deleted INTEGER
) AS $$
DECLARE
  policy_record RECORD;
  processed_count INTEGER := 0;
  archived_count INTEGER := 0;
  deleted_count INTEGER := 0;
  temp_processed INTEGER;
  temp_archived INTEGER;
  temp_deleted INTEGER;
BEGIN
  -- 활성화된 정책들을 순회
  FOR policy_record IN
    SELECT * FROM notification_cleanup_policy
    WHERE is_active = true
    ORDER BY retention_days ASC
  LOOP
    processed_count := 0;
    archived_count := 0;
    deleted_count := 0;

    -- 읽지 않은 알림 자동 읽음 처리 정책
    IF policy_record.policy_name = '읽지않은_알림_정리' THEN
      UPDATE notifications
      SET is_read = true, read_at = NOW()
      WHERE is_read = false
        AND created_at < NOW() - INTERVAL '1 day' * policy_record.retention_days
        AND (policy_record.applies_to_type IS NULL OR type = policy_record.applies_to_type)
        AND (policy_record.applies_to_priority IS NULL OR priority = policy_record.applies_to_priority);

      GET DIAGNOSTICS processed_count = ROW_COUNT;

    ELSE
      -- 보관 정책 적용
      IF policy_record.archive_before_delete THEN
        -- 먼저 보관
        WITH archived_notifications AS (
          DELETE FROM notifications
          WHERE is_read = true
            AND read_at < NOW() - INTERVAL '1 day' * policy_record.retention_days
            AND (policy_record.applies_to_type IS NULL OR type = policy_record.applies_to_type)
            AND (policy_record.applies_to_priority IS NULL OR priority = policy_record.applies_to_priority)
            AND type != 'system' -- 시스템 알림은 특별 처리
          RETURNING *
        )
        INSERT INTO notifications_archive (
          id, user_id, type, title, content, priority, is_read, read_at,
          related_id, data, created_at
        )
        SELECT
          id, user_id, type, title, content, priority, is_read, read_at,
          related_id, data, created_at
        FROM archived_notifications;

        GET DIAGNOSTICS archived_count = ROW_COUNT;

        -- 시스템 알림 특별 처리 (삭제 안 함)
        IF policy_record.applies_to_type = 'system' THEN
          WITH system_archived AS (
            UPDATE notifications
            SET data = COALESCE(data, '{}'::jsonb) || '{"archived": true}'::jsonb
            WHERE is_read = true
              AND read_at < NOW() - INTERVAL '1 day' * policy_record.retention_days
              AND type = 'system'
            RETURNING *
          )
          SELECT COUNT(*) INTO processed_count FROM system_archived;
        END IF;

      ELSE
        -- 보관 없이 직접 삭제
        DELETE FROM notifications
        WHERE is_read = true
          AND read_at < NOW() - INTERVAL '1 day' * policy_record.retention_days
          AND (policy_record.applies_to_type IS NULL OR type = policy_record.applies_to_type)
          AND (policy_record.applies_to_priority IS NULL OR priority = policy_record.applies_to_priority)
          AND type != 'system';

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      END IF;
    END IF;

    -- 결과 반환
    policy_applied := policy_record.policy_name;
    notifications_processed := processed_count;
    notifications_archived := archived_count;
    notifications_deleted := deleted_count;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. 보관된 알림 영구 삭제 함수 (2년 후)
CREATE OR REPLACE FUNCTION delete_old_archived_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 2년 이상 보관된 알림 영구 삭제 (시스템 알림 제외)
  DELETE FROM notifications_archive
  WHERE archived_at < NOW() - INTERVAL '2 years'
    AND type != 'system';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 사용자별 알림 통계 뷰 (안전한 버전)
CREATE OR REPLACE VIEW user_notification_stats AS
SELECT
  u.id as user_id,
  ('User ' || u.id::text) as user_identifier,
  COUNT(n.id) as total_notifications,
  COUNT(n.id) FILTER (WHERE n.is_read = false) as unread_count,
  COUNT(n.id) FILTER (WHERE n.is_read = true) as read_count,
  COUNT(n.id) FILTER (WHERE n.priority = 'urgent') as urgent_count,
  COUNT(na.id) as archived_count,
  MAX(n.created_at) as last_notification_at
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
LEFT JOIN notifications_archive na ON u.id = na.user_id
GROUP BY u.id;

-- 6. 정리 작업 로그 테이블
CREATE TABLE IF NOT EXISTS notification_cleanup_log (
  id BIGSERIAL PRIMARY KEY,
  cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  policy_name VARCHAR(100),
  notifications_processed INTEGER DEFAULT 0,
  notifications_archived INTEGER DEFAULT 0,
  notifications_deleted INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  notes TEXT
);

-- 7. 자동 정리 실행 함수 (로그 포함)
CREATE OR REPLACE FUNCTION execute_notification_cleanup()
RETURNS void AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  end_time TIMESTAMP WITH TIME ZONE;
  cleanup_result RECORD;
  total_processed INTEGER := 0;
  total_archived INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  start_time := NOW();

  -- 정리 정책 실행
  FOR cleanup_result IN
    SELECT * FROM cleanup_notifications_by_policy()
  LOOP
    total_processed := total_processed + cleanup_result.notifications_processed;
    total_archived := total_archived + cleanup_result.notifications_archived;
    total_deleted := total_deleted + cleanup_result.notifications_deleted;

    -- 개별 정책 로그 기록
    INSERT INTO notification_cleanup_log (
      policy_name,
      notifications_processed,
      notifications_archived,
      notifications_deleted,
      execution_time_ms,
      notes
    ) VALUES (
      cleanup_result.policy_applied,
      cleanup_result.notifications_processed,
      cleanup_result.notifications_archived,
      cleanup_result.notifications_deleted,
      EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
      '정책 기반 자동 정리'
    );
  END LOOP;

  -- 오래된 보관 알림 삭제
  DECLARE
    archived_deleted INTEGER;
  BEGIN
    SELECT delete_old_archived_notifications() INTO archived_deleted;
    total_deleted := total_deleted + archived_deleted;

    IF archived_deleted > 0 THEN
      INSERT INTO notification_cleanup_log (
        policy_name,
        notifications_deleted,
        execution_time_ms,
        notes
      ) VALUES (
        '보관_알림_영구삭제',
        archived_deleted,
        EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
        '2년 이상 보관된 알림 영구 삭제'
      );
    END IF;
  END;

  end_time := NOW();

  -- 전체 요약 로그
  INSERT INTO notification_cleanup_log (
    policy_name,
    notifications_processed,
    notifications_archived,
    notifications_deleted,
    execution_time_ms,
    notes
  ) VALUES (
    '전체_정리_요약',
    total_processed,
    total_archived,
    total_deleted,
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
    FORMAT('총 처리: %s, 보관: %s, 삭제: %s', total_processed, total_archived, total_deleted)
  );

  RAISE NOTICE '🧹 알림 정리 완료: 처리 %, 보관 %, 삭제 %', total_processed, total_archived, total_deleted;
END;
$$ LANGUAGE plpgsql;

-- 8. 정리 작업 스케줄링을 위한 함수 (cron 확장 필요)
-- 참고: PostgreSQL에서 pg_cron 확장을 설치해야 함
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT execute_notification_cleanup();');

-- 9. 알림 정리 현황 조회 함수
CREATE OR REPLACE FUNCTION get_cleanup_status()
RETURNS TABLE (
  metric_name TEXT,
  current_value BIGINT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    '활성_알림_수'::TEXT,
    COUNT(*)::BIGINT,
    '현재 notifications 테이블의 총 레코드 수'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '보관_알림_수'::TEXT,
    COUNT(*)::BIGINT,
    '현재 notifications_archive 테이블의 총 레코드 수'::TEXT
  FROM notifications_archive

  UNION ALL

  SELECT
    '읽지않은_알림_수'::TEXT,
    COUNT(*) FILTER (WHERE is_read = false)::BIGINT,
    '읽지 않은 알림의 총 개수'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '30일_이상_읽지않은_알림'::TEXT,
    COUNT(*) FILTER (WHERE is_read = false AND created_at < NOW() - INTERVAL '30 days')::BIGINT,
    '30일 이상 읽지 않은 알림 (자동 읽음 처리 대상)'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '정리_대상_읽은_알림'::TEXT,
    COUNT(*) FILTER (WHERE is_read = true AND read_at < NOW() - INTERVAL '90 days')::BIGINT,
    '90일 이상 된 읽은 알림 (보관 대상)'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '마지막_정리_실행'::TEXT,
    COALESCE(EXTRACT(EPOCH FROM (NOW() - MAX(cleanup_date)))::BIGINT / 86400, 999),
    '마지막 정리 작업 실행 후 경과 일수'::TEXT
  FROM notification_cleanup_log
  WHERE policy_name = '전체_정리_요약';
END;
$$ LANGUAGE plpgsql;

-- 10. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '🧹 알림 정리 및 보관 정책 설정 완료!';
  RAISE NOTICE '✅ 보관 테이블 생성됨';
  RAISE NOTICE '✅ 정리 정책 테이블 생성됨';
  RAISE NOTICE '✅ 스마트 정리 함수 준비됨';
  RAISE NOTICE '✅ 정리 로그 시스템 구축됨';
  RAISE NOTICE '📊 get_cleanup_status() 함수로 현황 확인 가능';
  RAISE NOTICE '🔄 execute_notification_cleanup() 함수로 수동 정리 실행 가능';
END $$;