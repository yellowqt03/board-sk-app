# ⚡ Supabase 설정 빠른 가이드

## 🚨 첨부파일이 보이지 않는 문제 해결

### 1. Supabase Storage 버킷 생성 (필수)

1. **Supabase 대시보드** 접속: https://mpdbzypvrstdwsutttps.supabase.co
2. **Storage** 메뉴 클릭
3. **New bucket** 버튼 클릭
4. **설정**:
   - Bucket name: `attachments`
   - Public bucket: **체크 해제** (Private)
   - File size limit: `10MB`
5. **Create bucket** 클릭

### 2. 데이터베이스 테이블 생성 (필수)

**SQL Editor**에서 다음 코드를 **순서대로** 실행:

#### 2-1. departments 테이블 수정 (description 컬럼 오류 해결)
```sql
-- departments 테이블에 description 컬럼 추가 (오류 해결)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
UPDATE departments SET description = name || ' 부서' WHERE description IS NULL;
```

#### 2-2. 첨부파일 테이블 생성
```sql
-- 첨부파일 테이블 생성
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

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
ON announcement_attachments(announcement_id);

-- RLS 활성화
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- 조회 정책 (모든 인증된 사용자)
CREATE POLICY "Authenticated users can view attachments" ON announcement_attachments
FOR SELECT USING (true);

-- 관리 정책 (관리자만)
CREATE POLICY "Admin users can manage attachments" ON announcement_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);
```

### 3. Storage 정책 설정 (필수)

**SQL Editor**에서 다음 코드 실행:

```sql
-- 업로드 정책 (관리자만)
INSERT INTO storage.policies (name, bucket_id, action, target_role, check_expression)
VALUES (
  'Admin can upload attachments',
  'attachments',
  'INSERT',
  'authenticated',
  'EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )'
);

-- 다운로드 정책 (인증된 사용자)
INSERT INTO storage.policies (name, bucket_id, action, target_role, check_expression)
VALUES (
  'Authenticated users can download attachments',
  'attachments',
  'SELECT',
  'authenticated',
  'true'
);

-- 삭제 정책 (관리자만)
INSERT INTO storage.policies (name, bucket_id, action, target_role, check_expression)
VALUES (
  'Admin can delete attachments',
  'attachments',
  'DELETE',
  'authenticated',
  'EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )'
);
```

### 4. 즉시 테스트

설정 완료 후:

1. **새 공지사항 작성**
2. **파일 첨부** (PDF, 이미지 등)
3. **게시 후 상세 페이지에서 첨부파일 확인**

### 🔍 문제 해결

#### 여전히 첨부파일이 보이지 않는다면:

1. **브라우저 콘솔** 확인 (F12 > Console)
2. **에러 메시지** 확인:
   - `Bucket not found`: Storage 버킷 미생성
   - `Permission denied`: RLS 정책 문제
   - `Table doesn't exist`: 데이터베이스 테이블 미생성

#### 빠른 디버깅:

```javascript
// 브라우저 콘솔에서 실행
console.log('현재 사용자:', await supabase.auth.getUser());
console.log('테이블 존재 확인:', await supabase.from('announcement_attachments').select('count').limit(1));
console.log('버킷 존재 확인:', await supabase.storage.listBuckets());
```

---

## ⚠️ 주의사항

- **반드시 위 3단계를 모두 완료**해야 첨부파일 기능이 작동합니다
- **테스트 계정**으로 관리자 권한이 있는지 확인하세요
- **브라우저 캐시** 문제일 수 있으니 새로고침 시도해보세요

모든 설정 완료 후에도 문제가 있다면 브라우저 콘솔의 에러 메시지를 확인해주세요.