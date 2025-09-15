-- ==================== 6단계 ====================
-- 실시간 알림 시스템을 위한 테이블 생성
-- 5단계 완료 후 이 부분을 실행하세요

-- 알림 테이블 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('announcement', 'comment', 'keyword_alert', 'system')),
      title VARCHAR(255) NOT NULL,
      content TEXT,
      data JSONB,
      is_read BOOLEAN DEFAULT FALSE,
      priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
      related_id BIGINT, -- 관련 게시글/공지사항 ID
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      read_at TIMESTAMP WITH TIME ZONE,

      -- 외래키 제약조건 (users 테이블과 연결)
      CONSTRAINT fk_notifications_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 인덱스 생성 (성능 최적화)
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

    RAISE NOTICE '6단계: notifications 테이블 생성 완료';
  ELSE
    RAISE NOTICE '6단계: notifications 테이블이 이미 존재합니다';
  END IF;
END $$;

-- 알림 설정 테이블 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
    CREATE TABLE notification_settings (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE,
      email_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      keyword_alerts BOOLEAN DEFAULT TRUE,
      announcement_alerts BOOLEAN DEFAULT TRUE,
      comment_alerts BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      -- 외래키 제약조건
      CONSTRAINT fk_notification_settings_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 인덱스 생성
    CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

    RAISE NOTICE '6단계: notification_settings 테이블 생성 완료';
  ELSE
    RAISE NOTICE '6단계: notification_settings 테이블이 이미 존재합니다';
  END IF;
END $$;

-- 실시간 알림을 위한 함수 생성
CREATE OR REPLACE FUNCTION notify_users()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로운 알림이 추가되면 실시간으로 클라이언트에 알림
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

-- 트리거 생성 (notifications 테이블에 데이터가 삽입/수정될 때 실행)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'notifications_notify_trigger'
  ) THEN
    CREATE TRIGGER notifications_notify_trigger
      AFTER INSERT OR UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION notify_users();

    RAISE NOTICE '6단계: 실시간 알림 트리거 생성 완료';
  ELSE
    RAISE NOTICE '6단계: 실시간 알림 트리거가 이미 존재합니다';
  END IF;
END $$;

-- 자동으로 공지사항 알림을 생성하는 함수
CREATE OR REPLACE FUNCTION create_announcement_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로운 공지사항이 생성되면 모든 사용자에게 알림 생성
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
    AND u.id != NEW.author_id; -- 작성자 본인은 제외

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 공지사항 트리거 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'announcements_auto_notify_trigger'
  ) THEN
    CREATE TRIGGER announcements_auto_notify_trigger
      AFTER INSERT ON announcements
      FOR EACH ROW EXECUTE FUNCTION create_announcement_notifications();

    RAISE NOTICE '6단계: 공지사항 자동 알림 트리거 생성 완료';
  ELSE
    RAISE NOTICE '6단계: 공지사항 자동 알림 트리거가 이미 존재합니다';
  END IF;
END $$;

-- 댓글 알림을 생성하는 함수
CREATE OR REPLACE FUNCTION create_comment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id BIGINT;
  post_title TEXT;
BEGIN
  -- 게시글 작성자 정보 가져오기
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id, title INTO post_author_id, post_title
    FROM posts WHERE id = NEW.post_id;

    -- 게시글 작성자에게 댓글 알림 (본인이 댓글 작성한 경우 제외)
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

-- 댓글 트리거 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'comments_auto_notify_trigger'
  ) THEN
    CREATE TRIGGER comments_auto_notify_trigger
      AFTER INSERT ON comments
      FOR EACH ROW EXECUTE FUNCTION create_comment_notifications();

    RAISE NOTICE '6단계: 댓글 자동 알림 트리거 생성 완료';
  ELSE
    RAISE NOTICE '6단계: 댓글 자동 알림 트리거가 이미 존재합니다';
  END IF;
END $$;

-- 모든 기존 사용자에게 기본 알림 설정 추가
DO $$
BEGIN
  INSERT INTO notification_settings (user_id, email_notifications, push_notifications, keyword_alerts, announcement_alerts, comment_alerts)
  SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE
  FROM users
  WHERE id NOT IN (SELECT user_id FROM notification_settings);

  RAISE NOTICE '6단계: 실시간 알림 시스템 설정 완료! 🎉';
  RAISE NOTICE '- notifications 테이블: 생성됨';
  RAISE NOTICE '- notification_settings 테이블: 생성됨';
  RAISE NOTICE '- 실시간 알림 트리거: 생성됨';
  RAISE NOTICE '- 자동 공지사항 알림: 생성됨';
  RAISE NOTICE '- 자동 댓글 알림: 생성됨';
END $$;