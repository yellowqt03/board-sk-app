# 📚 Supabase SQL Editor 사용법 (초보자용)

## 🎯 목표
공지사항 첨부파일 기능을 위한 데이터베이스 설정

## 📍 단계별 실행 방법

### **1단계: Supabase 접속**
1. 브라우저에서 접속: https://mpdbzypvrstdwsutttps.supabase.co
2. 로그인 (이미 되어있을 것)

### **2단계: SQL Editor 찾기**
1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. 화면에 코드 입력할 수 있는 큰 박스가 나타남

### **3단계: 새 쿼리 만들기**
1. **"New query"** 버튼 클릭 (+ 모양 버튼)
2. 이름: `1단계-departments` (또는 아무 이름)
3. 빈 텍스트 박스가 나타남

### **4단계: 첫 번째 코드 붙여넣기**
```sql
-- 이 전체 코드를 복사해서 붙여넣으세요
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
```

### **5단계: 실행하기**
1. **"RUN"** 버튼 클릭 (또는 Ctrl+Enter)
2. 결과창에서 **"1단계: departments 테이블에 description 컬럼 추가 완료"** 메시지 확인

### **6단계: 두 번째 쿼리 만들기**
1. 다시 **"New query"** 클릭
2. 이름: `2단계-users-admin`
3. 다음 코드 붙여넣기:

```sql
-- 이 전체 코드를 복사해서 붙여넣으세요
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    UPDATE users SET is_admin = TRUE WHERE employee_id IN ('2', '1475');
    RAISE NOTICE '2단계: users 테이블에 is_admin 컬럼 추가 완료';
    RAISE NOTICE '관리자로 설정된 사용자 수: %', (SELECT COUNT(*) FROM users WHERE is_admin = TRUE);
  ELSE
    RAISE NOTICE '2단계: users 테이블에 is_admin 컬럼이 이미 존재합니다';
    RAISE NOTICE '현재 관리자 수: %', (SELECT COUNT(*) FROM users WHERE is_admin = TRUE);
  END IF;
END $$;
```
4. **"RUN"** 클릭
5. **"관리자로 설정된 사용자 수: 2"** 메시지 확인

### **7단계: 세 번째 쿼리**
1. **"New query"** 클릭
2. 이름: `3단계-attachments-table`
3. 다음 코드 붙여넣기:

```sql
-- 이 전체 코드를 복사해서 붙여넣으세요
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

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_uploaded_at
ON announcement_attachments(uploaded_at DESC);

DO $$
BEGIN
  RAISE NOTICE '3단계: announcement_attachments 테이블 생성 완료';
  RAISE NOTICE '현재 첨부파일 수: %', (SELECT COUNT(*) FROM announcement_attachments);
END $$;
```
4. **"RUN"** 클릭
5. **"3단계: announcement_attachments 테이블 생성 완료"** 확인

### **8단계: 마지막 쿼리**
1. **"New query"** 클릭
2. 이름: `4단계-권한설정`
3. 다음 코드 붙여넣기:

```sql
-- 이 전체 코드를 복사해서 붙여넣으세요
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON announcement_attachments;
DROP POLICY IF EXISTS "Admins can manage attachments" ON announcement_attachments;

CREATE POLICY "Anyone can view attachments" ON announcement_attachments
FOR SELECT USING (true);

CREATE POLICY "Admins can manage attachments" ON announcement_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text::integer
    AND users.is_admin = true
  )
);

DO $$
DECLARE
  dept_count INTEGER;
  user_count INTEGER;
  admin_count INTEGER;
  attach_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dept_count FROM departments;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = true;
  SELECT COUNT(*) INTO attach_count FROM announcement_attachments;

  RAISE NOTICE '==== 모든 설정 완료 ====';
  RAISE NOTICE 'departments: % 개 부서', dept_count;
  RAISE NOTICE 'users: % 명 (관리자 % 명)', user_count, admin_count;
  RAISE NOTICE 'attachments: % 개 파일', attach_count;
  RAISE NOTICE '========================';
END $$;
```
4. **"RUN"** 클릭
5. **"==== 모든 설정 완료 ====="** 확인

### **9단계: Storage 버킷 생성**
1. 왼쪽 메뉴에서 **"Storage"** 클릭
2. **"New bucket"** 버튼 클릭
3. Bucket name: `attachments`
4. **"Public bucket" 체크박스 해제** (Private로 설정)
5. **"Create bucket"** 클릭

## ✅ 완료!

모든 단계가 성공하면 첨부파일 기능이 작동합니다!

## 🔍 확인 방법
- 사번 `2`, 비밀번호 `test123`으로 로그인
- 공지사항 작성에서 파일 첨부 테스트

## ❌ 문제 해결
- 오류 메시지가 나오면 해당 단계를 다시 실행
- 이미 존재한다는 메시지는 정상 (무시해도 됨)