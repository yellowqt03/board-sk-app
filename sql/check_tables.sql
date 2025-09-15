-- ==================== 테이블 존재 여부 확인 ====================

-- 1. 현재 존재하는 모든 테이블 목록 확인
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%notification%'
ORDER BY table_name;

-- 2. notifications 테이블이 존재하는지 확인
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'notifications' AND table_schema = 'public'
    )
    THEN '✅ notifications 테이블 존재함'
    ELSE '❌ notifications 테이블 없음'
  END as notifications_status;

-- 3. notification_settings 테이블이 존재하는지 확인
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'notification_settings' AND table_schema = 'public'
    )
    THEN '✅ notification_settings 테이블 존재함'
    ELSE '❌ notification_settings 테이블 없음'
  END as notification_settings_status;

-- 4. notifications 테이블 컬럼 구조 확인 (존재하는 경우)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications' AND table_schema = 'public'
ORDER BY ordinal_position;