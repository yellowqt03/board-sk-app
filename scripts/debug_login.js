// 로그인 디버깅 스크립트
const bcrypt = require('bcryptjs');

async function debugLogin() {
  const testEmployeeId = '0002';
  const testPassword = 'test123';
  
  console.log('=== 로그인 디버깅 도구 ===\n');
  
  // 1. 비밀번호 해시 생성
  const hashedPassword = await bcrypt.hash(testPassword, 12);
  console.log('1. 새로 생성된 bcrypt 해시:');
  console.log(hashedPassword);
  
  // 2. 현재 데이터베이스 상태 확인용 SQL
  console.log('\n2. 데이터베이스 상태 확인 SQL:');
  console.log('-- employee_master 테이블 확인');
  console.log("SELECT * FROM employee_master WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');");
  
  console.log('\n-- users 테이블 확인');
  console.log("SELECT employee_id, password_hash, email_verified, created_at FROM users WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');");
  
  // 3. 완전한 데이터 재설정 SQL
  console.log('\n3. 완전한 데이터 재설정 SQL:');
  
  console.log('\n-- 기존 데이터 완전 삭제');
  console.log("DELETE FROM users WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');");
  console.log("DELETE FROM employee_master WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');");
  
  console.log('\n-- departments 테이블 확인/생성');
  console.log("INSERT INTO departments (id, name) VALUES (1, '의국'), (2, '약제과'), (3, '총무과'), (4, '임상병리실') ON CONFLICT (id) DO NOTHING;");
  
  console.log('\n-- positions 테이블 확인/생성');  
  console.log("INSERT INTO positions (id, name, level) VALUES (1, '의사', 5), (2, '직원', 3) ON CONFLICT (id) DO NOTHING;");
  
  console.log('\n-- employee_master 데이터 생성');
  console.log("INSERT INTO employee_master (employee_id, name, email, department_id, position_id, is_active, status, created_at) VALUES");
  console.log("  ('0002', '김징균', 'test1@company.com', 1, 1, true, 'approved', now()),");
  console.log("  ('0003', '김징현', 'test2@company.com', 1, 1, true, 'approved', now()),");
  console.log("  ('0163', '서정애', 'test3@company.com', 2, 2, true, 'approved', now()),");
  console.log("  ('0202', '손복향', 'test4@company.com', 3, 2, true, 'approved', now()),");
  console.log("  ('0267', '박두심', 'test5@company.com', 4, 2, true, 'approved', now());");
  
  console.log('\n-- users 테이블 데이터 생성');
  console.log("INSERT INTO users (employee_id, password_hash, email_verified, created_at) VALUES");
  console.log(`  ('0002', '${hashedPassword}', true, now()),`);
  console.log(`  ('0003', '${hashedPassword}', true, now()),`);
  console.log(`  ('0163', '${hashedPassword}', true, now()),`);
  console.log(`  ('0202', '${hashedPassword}', true, now()),`);
  console.log(`  ('0267', '${hashedPassword}', true, now());`);
  
  // 4. 로컬 테스트
  console.log('\n4. 로컬 비밀번호 검증 테스트:');
  const testHash = await bcrypt.hash('test123', 12);
  const isValid = await bcrypt.compare('test123', testHash);
  console.log(`비밀번호 'test123' 검증 결과: ${isValid}`);
  
  console.log('\n=== 실행 순서 ===');
  console.log('1. 위의 "데이터베이스 상태 확인 SQL" 실행하여 현재 상태 확인');
  console.log('2. "완전한 데이터 재설정 SQL" 순서대로 실행');
  console.log('3. 사번 2, 비밀번호 test123으로 로그인 테스트');
}

debugLogin().catch(console.error);