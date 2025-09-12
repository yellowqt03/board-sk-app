// 테스트 계정 생성 스크립트
const bcrypt = require('bcryptjs');

async function createTestAccounts() {
  const password = 'test123';
  const saltRounds = 12;
  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('=== 테스트 계정 생성용 SQL ===\n');
    console.log('-- bcrypt로 암호화된 비밀번호로 테스트 계정 생성');
    console.log('-- Supabase 대시보드에서 실행하세요\n');
    
    console.log('-- 기존 테스트 계정 삭제 (있다면)');
    console.log("DELETE FROM users WHERE employee_id IN ('0002', '0003', '0163', '0202', '0267');\n");
    
    console.log('-- 새 테스트 계정 생성');
    console.log('INSERT INTO users (employee_id, password_hash, email_verified, created_at) VALUES');
    console.log(`('0002', '${hashedPassword}', true, now()),`);
    console.log(`('0003', '${hashedPassword}', true, now()),`);
    console.log(`('0163', '${hashedPassword}', true, now()),`);
    console.log(`('0202', '${hashedPassword}', true, now()),`);
    console.log(`('0267', '${hashedPassword}', true, now());`);
    
    console.log('\n=== 테스트 로그인 정보 ===');
    console.log('사번: 0002 | 이름: 김징균 | 소속: 의국');
    console.log('사번: 0003 | 이름: 김징현 | 소속: 의국');  
    console.log('사번: 0163 | 이름: 서정애 | 소속: 약제과');
    console.log('사번: 0202 | 이름: 손복향 | 소속: 총무과');
    console.log('사번: 0267 | 이름: 박두심 | 소속: 임상병리실');
    console.log('\n공통 비밀번호: test123');
    
  } catch (error) {
    console.error('오류:', error);
  }
}

createTestAccounts();