/* eslint-disable @typescript-eslint/no-require-imports */
// 간단한 Supabase 첨부파일 기능 설정
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mpdbzypvrstdwsutttps.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndSetup() {
  console.log('🔍 Supabase 연결 및 테이블 상태 확인...\n');

  try {
    // 1. departments 테이블 확인
    console.log('1️⃣ departments 테이블 확인...');
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id, name, description')
      .limit(1);

    if (deptError) {
      console.log('❌ departments 테이블 접근 실패:', deptError.message);
    } else if (deptData && deptData.length > 0 && deptData[0].description === null) {
      console.log('⚠️ departments 테이블에 description 컬럼이 NULL입니다.');
      console.log('   Supabase SQL Editor에서 다음 명령어를 실행하세요:');
      console.log('   ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;');
      console.log('   UPDATE departments SET description = name || \' 부서\' WHERE description IS NULL;');
    } else {
      console.log('✅ departments 테이블 정상');
    }

    // 2. announcement_attachments 테이블 확인
    console.log('\n2️⃣ announcement_attachments 테이블 확인...');
    const { data: attachData, error: attachError } = await supabase
      .from('announcement_attachments')
      .select('id')
      .limit(1);

    if (attachError) {
      if (attachError.message.includes('relation "announcement_attachments" does not exist')) {
        console.log('⚠️ announcement_attachments 테이블이 없습니다.');
        console.log('   Supabase SQL Editor에서 다음 명령어를 실행하세요:');
        console.log(`
CREATE TABLE announcement_attachments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id)
);

ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attachments" ON announcement_attachments
FOR SELECT USING (true);

CREATE POLICY "Admins can manage attachments" ON announcement_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);`);
      } else {
        console.log('❌ announcement_attachments 테이블 접근 실패:', attachError.message);
      }
    } else {
      console.log('✅ announcement_attachments 테이블 정상');
      console.log('   현재 첨부파일 수:', attachData.length);
    }

    // 3. Storage 버킷 확인
    console.log('\n3️⃣ Storage 버킷 확인...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('❌ Storage 버킷 조회 실패:', bucketError.message);
    } else {
      const attachmentsBucket = buckets.find(bucket => bucket.name === 'attachments');
      if (attachmentsBucket) {
        console.log('✅ attachments 버킷 존재');
      } else {
        console.log('⚠️ attachments 버킷이 없습니다.');
        console.log('   Supabase 대시보드 → Storage → New bucket');
        console.log('   버킷명: attachments (Private 설정)');
      }
    }

    // 4. 사용자 권한 확인
    console.log('\n4️⃣ 현재 사용자 권한 확인...');
    const { data: user, error: userError } = await supabase.auth.getUser();

    if (userError || !user.user) {
      console.log('⚠️ 로그인이 필요합니다 (테스트 계정: 사번 2, 비밀번호 test123)');
    } else {
      console.log('✅ 사용자 로그인됨:', user.user.id);
    }

    console.log('\n🎯 설정 완료 체크리스트:');
    console.log('□ departments 테이블 description 컬럼 추가');
    console.log('□ announcement_attachments 테이블 생성');
    console.log('□ attachments Storage 버킷 생성');
    console.log('□ 관리자 계정으로 로그인');

  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
  }
}

// 실행
checkAndSetup();