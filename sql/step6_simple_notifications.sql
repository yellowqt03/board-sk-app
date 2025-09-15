-- ==================== 6단계 (간단 버전) ====================
-- 실시간 알림 시스템을 위한 테이블 생성
-- 단계별로 실행하세요

-- 1. 알림 테이블 생성
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

-- 3. 알림 설정 테이블 생성
CREATE TABLE IF NOT EXISTS notification_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  keyword_alerts BOOLEAN DEFAULT TRUE,
  announcement_alerts BOOLEAN DEFAULT TRUE,
  comment_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_notification_settings_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 실시간 알림 함수 생성
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

-- 5. 실시간 알림 트리거 생성
DROP TRIGGER IF EXISTS notifications_notify_trigger ON notifications;
CREATE TRIGGER notifications_notify_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_users();

-- 6. 공지사항 자동 알림 함수
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
    NEW.priority,
    NEW.id
  FROM users u
  JOIN notification_settings ns ON u.id = ns.user_id
  WHERE ns.announcement_alerts = TRUE
    AND u.id != NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 공지사항 자동 알림 트리거
DROP TRIGGER IF EXISTS announcements_auto_notify_trigger ON announcements;
CREATE TRIGGER announcements_auto_notify_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION create_announcement_notifications();

-- 8. 댓글 자동 알림 함수
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
        '새 댓글: ' || post_title,
        '🗨️ 회원님의 게시글에 새로운 댓글이 달렸습니다.',
        'normal',
        NEW.post_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 댓글 자동 알림 트리거
DROP TRIGGER IF EXISTS comments_auto_notify_trigger ON comments;
CREATE TRIGGER comments_auto_notify_trigger
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION create_comment_notifications();

-- 10. 기존 사용자들에게 기본 알림 설정 추가
INSERT INTO notification_settings (user_id, email_notifications, push_notifications, keyword_alerts, announcement_alerts, comment_alerts)
SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE
FROM users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;