-- ==================== 트리거 오류 수정 ====================
-- 안전한 자동 알림 트리거 생성

-- 1. 기존 트리거 모두 제거
DROP TRIGGER IF EXISTS announcements_auto_notify_trigger ON announcements;
DROP TRIGGER IF EXISTS comments_auto_notify_trigger ON comments;

-- 2. 안전한 공지사항 자동 알림 함수 (오류 처리 포함)
CREATE OR REPLACE FUNCTION create_announcement_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- 오류 발생 시에도 공지사항 작성은 계속 진행되도록 예외 처리
  BEGIN
    INSERT INTO notifications (user_id, type, title, content, priority, related_id)
    SELECT
      u.id,
      'announcement',
      '새 공지사항: ' || COALESCE(NEW.title, '제목 없음'),
      CASE
        WHEN NEW.priority = 'urgent' THEN '🚨 긴급 공지사항이 등록되었습니다!'
        ELSE '📢 새로운 공지사항이 등록되었습니다.'
      END,
      COALESCE(NEW.priority, 'normal'),
      NEW.id
    FROM users u
    WHERE u.id != COALESCE(NEW.author_id, 0)  -- 작성자 본인 제외
      AND u.id IS NOT NULL;  -- NULL 사용자 제외

  EXCEPTION
    WHEN OTHERS THEN
      -- 오류가 발생해도 공지사항 작성은 계속 진행
      -- 로그만 남기고 오류를 무시
      RAISE WARNING '공지사항 알림 생성 중 오류 발생: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 안전한 댓글 자동 알림 함수 (오류 처리 포함)
CREATE OR REPLACE FUNCTION create_comment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id BIGINT;
  post_title TEXT;
BEGIN
  -- 오류 발생 시에도 댓글 작성은 계속 진행되도록 예외 처리
  BEGIN
    IF NEW.post_id IS NOT NULL THEN
      -- 게시글 작성자 정보 조회
      SELECT author_id, title INTO post_author_id, post_title
      FROM posts WHERE id = NEW.post_id;

      -- 게시글 작성자가 존재하고 댓글 작성자와 다른 경우에만 알림 생성
      IF post_author_id IS NOT NULL
         AND post_author_id != COALESCE(NEW.author_id, 0) THEN

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

  EXCEPTION
    WHEN OTHERS THEN
      -- 오류가 발생해도 댓글 작성은 계속 진행
      RAISE WARNING '댓글 알림 생성 중 오류 발생: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 다시 생성 (안전한 버전)
CREATE TRIGGER announcements_auto_notify_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW EXECUTE FUNCTION create_announcement_notifications();

CREATE TRIGGER comments_auto_notify_trigger
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION create_comment_notifications();

-- 5. 수동으로 테스트 알림 생성 (기존 사용자에게)
DO $$
DECLARE
  test_user_id BIGINT;
BEGIN
  -- 첫 번째 사용자에게 테스트 알림 생성
  SELECT id INTO test_user_id FROM users ORDER BY id LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    -- 기존 테스트 알림 삭제
    DELETE FROM notifications
    WHERE title LIKE '%테스트%' OR title LIKE '%시스템%';

    -- 새 테스트 알림 생성
    INSERT INTO notifications (user_id, type, title, content, priority)
    VALUES (
      test_user_id,
      'system',
      '✅ 알림 시스템 설정 완료',
      '실시간 알림 시스템이 성공적으로 설정되었습니다!',
      'normal'
    );

    RAISE NOTICE '테스트 알림이 사용자 ID %에게 생성되었습니다.', test_user_id;
  ELSE
    RAISE NOTICE '사용자가 없어 테스트 알림을 생성할 수 없습니다.';
  END IF;
END $$;