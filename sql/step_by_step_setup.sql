-- ========================================
-- 단계별 실행 SQL - 첨부파일 기능 설정
-- 각 단계를 순서대로 개별 실행하세요
-- ========================================

-- ==================== 1단계 ====================
-- departments 테이블에 description 컬럼 추가
-- 이 부분을 먼저 실행하세요

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'description'
  ) THEN
    ALTER TABLE departments ADD COLUMN description TEXT;
    UPDATE departments SET description = name || ' 부서' WHERE description IS NULL;
    RAISE NOTICE '1단계: departments 테이블에 description 컬럼 추가 완료';
  ELSE
    RAISE NOTICE '1단계: departments 테이블에 description 컬럼이 이미 존재합니다';
  END IF;
END $$;