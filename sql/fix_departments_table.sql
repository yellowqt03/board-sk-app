-- departments 테이블 스키마 수정
-- 현재 테이블 구조 확인 후 description 컬럼 추가

-- 1. 현재 departments 테이블 구조 확인
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'departments';

-- 2. description 컬럼이 없다면 추가
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. 기존 데이터에 대한 기본값 설정 (선택사항)
UPDATE departments SET description = name || ' 부서' WHERE description IS NULL;

-- 4. 테이블 구조 최종 확인
-- \d departments;