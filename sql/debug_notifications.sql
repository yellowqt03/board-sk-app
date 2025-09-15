-- ==================== 알림 시스템 디버깅 ====================

-- 1. 현재 사용자 정보 확인
SELECT id, employee_id, name, is_admin
FROM users
ORDER BY id;

-- 2. 알림 테이블 현재 상태 확인
SELECT id, user_id, type, title, content, priority, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 3. notification_settings 테이블 확인
SELECT user_id, announcement_alerts, comment_alerts
FROM notification_settings
ORDER BY user_id;

-- 4. 공지사항 테이블 확인
SELECT id, title, author_id, priority, created_at
FROM announcements
ORDER BY created_at DESC
LIMIT 5;

-- 5. 트리거 존재 여부 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('announcements', 'notifications', 'comments');

-- 6. 수동으로 테스트 알림 생성 (사용자 ID 3에게)
INSERT INTO notifications (user_id, type, title, content, priority)
VALUES (
  3,
  'system',
  '🔍 수동 테스트 알림',
  '이 알림이 보이면 기본 시스템이 작동하고 있습니다.',
  'normal'
);

-- 7. Realtime 테스트용 알림 (즉시 생성)
INSERT INTO notifications (user_id, type, title, content, priority)
VALUES (
  3,
  'announcement',
  '📢 실시간 테스트',
  '지금 즉시 생성된 알림입니다!',
  'urgent'
);