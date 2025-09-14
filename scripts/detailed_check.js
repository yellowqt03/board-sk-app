/* eslint-disable @typescript-eslint/no-require-imports */
// 상세한 Supabase 상태 확인
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mpdbzypvrstdwsutttps.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function detailedCheck() {
  console.log('🔍 상세한 Supabase 상태 진단...\n');

  try {
    // 1. 기본 연결 테스트
    console.log('1️⃣ 기본 연결 테스트...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.log('❌ Supabase 연결 실패:', connectionError.message);
      return;
    } else {
      console.log('✅ Supabase 연결 성공\n');
    }

    // 2. departments 테이블 상세 확인
    console.log('2️⃣ departments 테이블 상세 확인...');

    // 먼저 description 컬럼 없이 조회
    const { data: deptBasic, error: deptBasicError } = await supabase
      .from('departments')
      .select('id, name')
      .limit(3);

    if (deptBasicError) {
      console.log('❌ departments 테이블 기본 접근 실패:', deptBasicError.message);
    } else {
      console.log('✅ departments 테이블 기본 접근 성공');
      console.log('   샘플 데이터:', deptBasic);

      // description 컬럼 포함 조회 시도
      const { data: deptFull, error: deptFullError } = await supabase
        .from('departments')
        .select('id, name, description')
        .limit(1);

      if (deptFullError) {
        console.log('⚠️ description 컬럼 없음:', deptFullError.message);
        console.log('   → SQL 미실행 또는 실패');
      } else {
        console.log('✅ description 컬럼 존재');
        console.log('   샘플:', deptFull);
      }
    }

    // 3. announcement_attachments 테이블 확인
    console.log('\n3️⃣ announcement_attachments 테이블 확인...');

    const { data: attachTest, error: attachError } = await supabase
      .from('announcement_attachments')
      .select('id')
      .limit(1);

    if (attachError) {
      if (attachError.message.includes('does not exist') || attachError.message.includes('not found')) {
        console.log('⚠️ announcement_attachments 테이블이 없습니다');
        console.log('   → SQL 미실행 또는 실패');
      } else {
        console.log('❌ announcement_attachments 테이블 접근 실패:', attachError.message);
      }
    } else {
      console.log('✅ announcement_attachments 테이블 존재');
      console.log('   현재 레코드 수:', attachTest.length);
    }

    // 4. announcements 테이블 확인 (참조 관계 확인용)
    console.log('\n4️⃣ announcements 테이블 확인...');
    const { data: announcements, error: announcementError } = await supabase
      .from('announcements')
      .select('id, title')
      .limit(3);

    if (announcementError) {
      console.log('❌ announcements 테이블 접근 실패:', announcementError.message);
    } else {
      console.log('✅ announcements 테이블 정상');
      console.log('   공지사항 수:', announcements.length);
      if (announcements.length > 0) {
        console.log('   최신 공지:', announcements[0].title);
      }
    }

    // 5. Storage 상태 확인
    console.log('\n5️⃣ Storage 상태 확인...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('❌ Storage 접근 실패:', bucketError.message);
    } else {
      console.log('✅ Storage 접근 성공');
      console.log('   기존 버킷들:', buckets.map(b => b.name));

      const attachmentsBucket = buckets.find(b => b.name === 'attachments');
      if (attachmentsBucket) {
        console.log('✅ attachments 버킷 존재');
      } else {
        console.log('⚠️ attachments 버킷 없음');
      }
    }

    // 6. 최종 진단
    console.log('\n📋 최종 진단 결과:');
    console.log('=====================================');

    const deptDescExists = await checkDepartmentDescription();
    const attachTableExists = await checkAttachmentTable();
    const storageReady = buckets && buckets.find(b => b.name === 'attachments');

    console.log(`departments.description: ${deptDescExists ? '✅' : '❌'}`);
    console.log(`announcement_attachments: ${attachTableExists ? '✅' : '❌'}`);
    console.log(`attachments bucket: ${storageReady ? '✅' : '❌'}`);

    if (!deptDescExists || !attachTableExists) {
      console.log('\n🔧 해결 방법:');
      console.log('1. Supabase 대시보드 → SQL Editor');
      console.log('2. sql/complete_setup.sql 파일 내용 복사');
      console.log('3. SQL Editor에 붙여넣기 후 RUN 클릭');
      console.log('4. 성공 메시지 확인');
    }

    if (!storageReady) {
      console.log('\n📦 Storage 설정:');
      console.log('1. Supabase 대시보드 → Storage');
      console.log('2. New bucket → 이름: attachments');
      console.log('3. Private 설정으로 생성');
    }

  } catch (error) {
    console.error('❌ 진단 중 오류:', error);
  }
}

async function checkDepartmentDescription() {
  try {
    const { error } = await supabase
      .from('departments')
      .select('description')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkAttachmentTable() {
  try {
    const { error } = await supabase
      .from('announcement_attachments')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// 실행
detailedCheck();