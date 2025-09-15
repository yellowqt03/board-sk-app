-- ==================== 간단한 notifications 테이블 수정 ====================
-- 오류 없이 안전하게 컬럼 추가

-- 1. 컬럼들 추가 (이미 있으면 무시됨)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id BIGINT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- 2. 기본 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- 3. 외래키 제약조건 추가 (이미 있으면 오류 발생하지만 무시)
DO $$
BEGIN
  BEGIN
    ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- 이미 존재하면 무시
  END;
END $$;

-- 4. RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. 실시간 알림 함수 생성
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

-- 6. 실시간 알림 트리거 생성
DROP TRIGGER IF EXISTS notifications_notify_trigger ON notifications;
CREATE TRIGGER notifications_notify_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_users();

-- 7. 공지사항 자동 알림 함수
CREATE OR REPLACE FUNCTION create_announcement_notifications()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, priority, related_id)
  SELECT
    u.id,
    'announcement',
    '새 공지사항: ' || NEW.title,
    CASE
      WHEN NEW.priority = 'urgent' THEN '🚨 긴급 공지사항이 등록되었습니다!'
      ELSE '📢 새로운 공지사항이 등록되었습니다.'
    END,
    COALESCE(NEW.priority, 'normal'),
    NEW.id
  FROM users u
  LEFT JOIN notification_settings ns ON u.id = ns.user_id
  WHERE (ns.announcement_alerts IS NULL OR ns.announcement_alerts = TRUE)
    AND u.id != NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 공지사항 자동 알림 트리거
DROP TRIGGER IF EXISTS announcements_auto_notify_trigger ON announcements;
CREATE TRIGGER announcements_auto_notify_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION create_announcement_notifications();

-- 9. 댓글 자동 알림 함수
CREATE OR REPLACE FUNCTION create_comment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id BIGINT;
  post_title TEXT;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id, title INTO post_author_id, post_title
    FROM posts WHERE id = NEW.post_id;

    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, content, priority, related_id)
      VALUES (
        post_author_id,
        'comment',
        '새 댓글: ' || COALESCE(post_title, '게시글'),
        '🗨️ 회원님의 게시글에 새로운 댓글이 달렸습니다.',
        'normal',
        NEW.post_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 댓글 자동 알림 트리거
DROP TRIGGER IF EXISTS comments_auto_notify_trigger ON comments;
CREATE TRIGGER comments_auto_notify_trigger
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION create_comment_notifications();

-- 11. 테스트 알림 생성
DO $$
DECLARE
  test_user_id BIGINT;
BEGIN
  SELECT id INTO test_user_id FROM users LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    -- 기존 테스트 알림 삭제
    DELETE FROM notifications WHERE title LIKE '%테스트%';

    -- 새 테스트 알림 삽입
    INSERT INTO notifications (user_id, type, title, content, priority)
    VALUES (
      test_user_id,
      'system',
      '🎉 실시간 알림 시스템 테스트',
      '축하합니다! 실시간 알림 시스템이 정상적으로 작동하고 있습니다.',
      'normal'
    );
  END IF;
END $$;