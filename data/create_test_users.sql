-- 테스트용 사용자 계정 생성
-- 실제 운영에서는 이 파일을 사용하지 마세요!

-- 1. 테스트용 사용자 계정 생성
INSERT INTO users (employee_id, password_hash, email_verified) VALUES
('2', 'test123', true),
('3', 'test123', true),
('163', 'test123', true),
('202', 'test123', true),
('267', 'test123', true);

-- 2. 테스트용 직원 데이터가 이미 있다고 가정하고, 
-- 실제로는 employee_data.csv의 데이터를 사용합니다.

-- 사용법:
-- 1. Supabase 대시보드에서 이 SQL을 실행
-- 2. 사번: 2, 3, 163, 202, 267 중 하나
-- 3. 비밀번호: test123
-- 4. 로그인 테스트

