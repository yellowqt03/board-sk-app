// 완전한 테스트 데이터 설정 스크립트
const bcrypt = require('bcryptjs');

async function setupCompleteTestData() {
  const password = 'test123';
  const saltRounds = 12;
  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('=== 완전한 테스트 데이터 설정 SQL ===\n');
    console.log('-- 1단계: employee_master 테이블에 직원 데이터 확인/삽입');
    console.log('-- 2단계: users 테이블에 로그인 계정 생성');
    console.log('-- Supabase SQL Editor에서 순서대로 실행하세요\n');
    
    console.log('-- 1단계: 직원 마스터 데이터 삽입 (중복 시 무시)');
    console.log('INSERT INTO employee_master (employee_id, name, email, department_id, position_id, is_active, status, created_at)');
    console.log('VALUES');
    console.log("  ('0002', '김징균', 'test1@company.com', 1, 1, true, 'approved', now()),");
    console.log("  ('0003', '김징현', 'test2@company.com', 1, 1, true, 'approved', now()),");
    console.log("  ('0163', '서정애', 'test3@company.com', 2, 2, true, 'approved', now()),");
    console.log("  ('0202', '손복향', 'test4@company.com', 3, 2, true, 'approved', now()),");
    console.log("  ('0267', '박두심', 'test5@company.com', 4, 2, true, 'approved', now())");
    console.log('ON CONFLICT (employee_id) DO UPDATE SET');
    console.log('  name = EXCLUDED.name,');
    console.log('  email = EXCLUDED.email,');
    console.log('  is_active = EXCLUDED.is_active,');
    console.log('  status = EXCLUDED.status;\n');
    
    console.log('-- 2단계: 사용자 로그인 계정 생성');
    console.log("DELETE FROM users WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');\n");
    
    console.log('INSERT INTO users (employee_id, password_hash, email_verified, created_at)');
    console.log('VALUES');
    console.log(`  ('0002', '${hashedPassword}', true, now()),`);
    console.log(`  ('0003', '${hashedPassword}', true, now()),`);
    console.log(`  ('0163', '${hashedPassword}', true, now()),`);
    console.log(`  ('0202', '${hashedPassword}', true, now()),`);
    console.log(`  ('0267', '${hashedPassword}', true, now());\n`);
    
    console.log('-- 3단계: 데이터 확인');
    console.log('SELECT em.employee_id, em.name, em.is_active, em.status, u.password_hash IS NOT NULL as has_login');
    console.log('FROM employee_master em');
    console.log('LEFT JOIN users u ON em.employee_id = u.employee_id');
    console.log("WHERE em.employee_id IN ('0002', '0003', '0163', '0202', '0267');");
    
    console.log('\n=== 테스트 로그인 정보 ===');
    console.log('사번: 0002 | 이름: 김징균 | 비밀번호: test123');
    console.log('사번: 0003 | 이름: 김징현 | 비밀번호: test123');  
    console.log('사번: 0163 | 이름: 서정애 | 비밀번호: test123');
    console.log('사번: 0202 | 이름: 손복향 | 비밀번호: test123');
    console.log('사번: 0267 | 이름: 박두심 | 비밀번호: test123');
    
  } catch (error) {
    console.error('오류:', error);
  }
}

setupCompleteTestData();