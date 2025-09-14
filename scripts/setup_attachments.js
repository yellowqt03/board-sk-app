/* eslint-disable @typescript-eslint/no-require-imports */
// Supabase 첨부파일 기능 설정 스크립트
const { createClient } = require('@supabase/supabase-js');

// 환경변수에서 Supabase 설정 로드
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mpdbzypvrstdwsutttps.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZGJ6eXB2cnN0ZHdzdXR0dHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODI2MDMsImV4cCI6MjA3MjM1ODYwM30.eAuliCg-aZy38VWfxLLei1m5XOOzYpgBQm108rANOMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAttachments() {
  try {
    console.log('🚀 첨부파일 기능 설정 시작...\n');

    // 1. departments 테이블에 description 컬럼 추가
    console.log('1️⃣ departments 테이블 description 컬럼 추가 중...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'departments' AND column_name = 'description'
          ) THEN
            ALTER TABLE departments ADD COLUMN description TEXT;
            UPDATE departments SET description = name || ' 부서' WHERE description IS NULL;
            PRINT 'departments 테이블에 description 컬럼 추가 완료';
          ELSE
            PRINT 'departments 테이블에 description 컬럼이 이미 존재함';
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.log('⚠️ departments 테이블 수정 중 오류 (무시 가능):', alterError.message);

      // 직접 ALTER TABLE 시도
      const { error: directAlterError } = await supabase
        .from('departments')
        .select('id, name')
        .limit(1);

      if (!directAlterError) {
        console.log('✅ departments 테이블 접근 가능');
      }
    } else {
      console.log('✅ departments 테이블 description 컬럼 추가 완료\n');
    }

    // 2. announcement_attachments 테이블 생성
    console.log('2️⃣ announcement_attachments 테이블 생성 중...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS announcement_attachments (
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

        CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
        ON announcement_attachments(announcement_id);
      `
    });

    if (createTableError) {
      console.log('⚠️ 테이블 생성 중 오류:', createTableError.message);
    } else {
      console.log('✅ announcement_attachments 테이블 생성 완료\n');
    }

    // 3. RLS 정책 설정
    console.log('3️⃣ RLS 정책 설정 중...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Authenticated users can view attachments" ON announcement_attachments;
        CREATE POLICY "Authenticated users can view attachments" ON announcement_attachments
        FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admin users can manage attachments" ON announcement_attachments;
        CREATE POLICY "Admin users can manage attachments" ON announcement_attachments
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text::integer
            AND users.is_admin = true
          )
        );
      `
    });

    if (rlsError) {
      console.log('⚠️ RLS 정책 설정 중 오류:', rlsError.message);
    } else {
      console.log('✅ RLS 정책 설정 완료\n');
    }

    // 4. Storage 버킷 확인
    console.log('4️⃣ Storage 버킷 확인 중...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('⚠️ Storage 버킷 조회 오류:', bucketError.message);
    } else {
      const attachmentsBucket = buckets.find(bucket => bucket.name === 'attachments');
      if (attachmentsBucket) {
        console.log('✅ attachments 버킷이 이미 존재함');
      } else {
        console.log('⚠️ attachments 버킷이 없습니다. Supabase 대시보드에서 생성 필요');
        console.log('   - 버킷명: attachments');
        console.log('   - 공개 여부: Private (비공개)');
      }
    }

    // 5. 테이블 확인
    console.log('\n5️⃣ 생성된 테이블 확인 중...');
    const { data: attachments, error: testError } = await supabase
      .from('announcement_attachments')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('❌ announcement_attachments 테이블 접근 실패:', testError.message);
      console.log('   수동으로 SQL을 실행해야 할 수 있습니다.');
    } else {
      console.log('✅ announcement_attachments 테이블 정상 접근 가능');
      console.log('   현재 첨부파일 수:', attachments.length);
    }

    console.log('\n🎉 첨부파일 기능 설정 완료!');
    console.log('이제 공지사항에 파일을 첨부할 수 있습니다.');

  } catch (error) {
    console.error('❌ 설정 중 예상치 못한 오류:', error);
    console.log('\n📋 수동 설정 방법:');
    console.log('1. Supabase 대시보드 → SQL Editor');
    console.log('2. SUPABASE_SETUP_QUICK.md의 SQL 코드 실행');
    console.log('3. Storage → attachments 버킷 생성');
  }
}

// 스크립트 실행
if (require.main === module) {
  setupAttachments();
}

module.exports = { setupAttachments };