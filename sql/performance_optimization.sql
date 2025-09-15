-- ==================== 알림 시스템 성능 최적화 ====================
-- 대용량 트래픽을 위한 성능 최적화

-- 1. 추가 인덱스 생성 (복합 인덱스)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
ON notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority_created
ON notifications(priority, created_at DESC)
WHERE priority IN ('urgent', 'high');

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_priority
ON notifications(user_id, priority, created_at DESC)
WHERE is_read = false;

-- 2. 알림 집계 테이블 생성 (캐시용)
CREATE TABLE IF NOT EXISTS notification_summary (
  user_id BIGINT PRIMARY KEY,
  total_unread INTEGER DEFAULT 0,
  urgent_unread INTEGER DEFAULT 0,
  last_notification_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_notification_summary_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 알림 집계 업데이트 함수
CREATE OR REPLACE FUNCTION update_notification_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 또는 UPDATE인 경우
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO notification_summary (user_id, total_unread, urgent_unread, last_notification_at)
    SELECT
      NEW.user_id,
      COUNT(*) FILTER (WHERE is_read = false),
      COUNT(*) FILTER (WHERE is_read = false AND priority = 'urgent'),
      MAX(created_at)
    FROM notifications
    WHERE user_id = NEW.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      total_unread = EXCLUDED.total_unread,
      urgent_unread = EXCLUDED.urgent_unread,
      last_notification_at = EXCLUDED.last_notification_at,
      updated_at = NOW();
  END IF;

  -- DELETE인 경우
  IF TG_OP = 'DELETE' THEN
    INSERT INTO notification_summary (user_id, total_unread, urgent_unread, last_notification_at)
    SELECT
      OLD.user_id,
      COUNT(*) FILTER (WHERE is_read = false),
      COUNT(*) FILTER (WHERE is_read = false AND priority = 'urgent'),
      MAX(created_at)
    FROM notifications
    WHERE user_id = OLD.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      total_unread = EXCLUDED.total_unread,
      urgent_unread = EXCLUDED.urgent_unread,
      last_notification_at = EXCLUDED.last_notification_at,
      updated_at = NOW();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. 알림 집계 트리거 생성
DROP TRIGGER IF EXISTS notification_summary_trigger ON notifications;
CREATE TRIGGER notification_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_summary();

-- 5. 기존 사용자들의 집계 데이터 초기화
INSERT INTO notification_summary (user_id, total_unread, urgent_unread, last_notification_at)
SELECT
  u.id,
  COALESCE(n.total_unread, 0),
  COALESCE(n.urgent_unread, 0),
  n.last_notification_at
FROM users u
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE is_read = false) as total_unread,
    COUNT(*) FILTER (WHERE is_read = false AND priority = 'urgent') as urgent_unread,
    MAX(created_at) as last_notification_at
  FROM notifications
  GROUP BY user_id
) n ON u.id = n.user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_unread = EXCLUDED.total_unread,
  urgent_unread = EXCLUDED.urgent_unread,
  last_notification_at = EXCLUDED.last_notification_at,
  updated_at = NOW();

-- 6. 배치 처리를 위한 함수들

-- 오래된 알림 아카이브 함수
CREATE OR REPLACE FUNCTION archive_old_notifications(batch_size INTEGER DEFAULT 1000)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
  total_archived INTEGER := 0;
BEGIN
  -- 아카이브 테이블 생성 (없는 경우)
  CREATE TABLE IF NOT EXISTS notifications_archive (
    LIKE notifications INCLUDING ALL
  );

  LOOP
    -- 90일 이상 된 읽은 알림을 아카이브로 이동
    WITH moved_notifications AS (
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '90 days'
        AND is_read = true
        AND type != 'system'
      RETURNING *
    )
    INSERT INTO notifications_archive
    SELECT * FROM moved_notifications;

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    total_archived := total_archived + archived_count;

    -- 배치 크기만큼 처리했거나 더 이상 처리할 데이터가 없으면 종료
    EXIT WHEN archived_count < batch_size;

    -- 잠시 대기 (다른 쿼리에 영향 최소화)
    PERFORM pg_sleep(0.1);
  END LOOP;

  RETURN total_archived;
END;
$$ LANGUAGE plpgsql;

-- 7. 알림 통계 뷰 생성
CREATE OR REPLACE VIEW notification_stats AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  type,
  priority,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(read_at, NOW()) - created_at))) as avg_read_time_seconds
FROM notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), type, priority
ORDER BY date DESC, type, priority;

-- 8. 실시간 알림 큐 테이블 (대용량 처리용)
CREATE TABLE IF NOT EXISTS notification_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  notification_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_notification_queue_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 큐 처리를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_priority
ON notification_queue(status, priority, created_at);

-- 9. 큐 처리 함수
CREATE OR REPLACE FUNCTION process_notification_queue(batch_size INTEGER DEFAULT 100)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  queue_record RECORD;
BEGIN
  -- 대기 중인 알림을 우선순위 순으로 처리
  FOR queue_record IN
    SELECT * FROM notification_queue
    WHERE status = 'pending'
    ORDER BY priority ASC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- 상태를 처리 중으로 변경
      UPDATE notification_queue
      SET status = 'processing', processed_at = NOW()
      WHERE id = queue_record.id;

      -- 실제 알림 생성
      INSERT INTO notifications (
        user_id, type, title, content, priority, related_id, data
      )
      SELECT
        queue_record.user_id,
        queue_record.notification_data->>'type',
        queue_record.notification_data->>'title',
        queue_record.notification_data->>'content',
        COALESCE(queue_record.notification_data->>'priority', 'normal'),
        (queue_record.notification_data->>'related_id')::BIGINT,
        queue_record.notification_data->'data';

      -- 성공 시 상태 업데이트
      UPDATE notification_queue
      SET status = 'sent'
      WHERE id = queue_record.id;

      processed_count := processed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- 실패 시 재시도 카운트 증가
      UPDATE notification_queue
      SET
        status = CASE
          WHEN retry_count >= 3 THEN 'failed'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1
      WHERE id = queue_record.id;
    END;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 성능 모니터링 함수
CREATE OR REPLACE FUNCTION get_notification_performance_stats()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    '총 알림 수'::TEXT,
    COUNT(*)::NUMERIC,
    '전체 알림 테이블의 레코드 수'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '읽지 않은 알림 수'::TEXT,
    COUNT(*) FILTER (WHERE is_read = false)::NUMERIC,
    '현재 읽지 않은 알림의 총 개수'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '평균 읽기 시간(초)'::TEXT,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))) FILTER (WHERE read_at IS NOT NULL)::NUMERIC,
    '알림을 읽기까지 걸리는 평균 시간'::TEXT
  FROM notifications

  UNION ALL

  SELECT
    '큐 대기 중'::TEXT,
    COUNT(*) FILTER (WHERE status = 'pending')::NUMERIC,
    '처리 대기 중인 알림 큐 수'::TEXT
  FROM notification_queue

  UNION ALL

  SELECT
    '일일 알림 수'::TEXT,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::NUMERIC,
    '오늘 생성된 알림 수'::TEXT
  FROM notifications;
END;
$$ LANGUAGE plpgsql;

-- 11. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '⚡ 성능 최적화 완료!';
  RAISE NOTICE '✅ 추가 인덱스 생성됨';
  RAISE NOTICE '✅ 알림 집계 시스템 구축됨';
  RAISE NOTICE '✅ 배치 처리 함수 준비됨';
  RAISE NOTICE '✅ 알림 큐 시스템 구축됨';
  RAISE NOTICE '✅ 성능 모니터링 도구 준비됨';
END $$;